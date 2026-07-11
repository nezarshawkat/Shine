const prisma = require("../prisma");
const local = require("../db/local");
const { generateJson } = require("../autoActivitySystem/aiClient");

const localOnly =
  process.env.DATABASE_MODE === "local" ||
  process.env.LOCAL_ONLY_DB === "true" ||
  !process.env.DATABASE_URL;

const DEFAULT_INTERVAL_MS = Number(process.env.ORGANIC_ENGAGEMENT_INTERVAL_MS || 600000);
const BATCH_LIMIT = Number(process.env.ORGANIC_ENGAGEMENT_BATCH_LIMIT || 30);
const COMMENT_MAX_PER_POST_PER_RUN = Math.max(0, Number(process.env.ORGANIC_ENGAGEMENT_COMMENT_MAX_PER_POST_PER_RUN || 2));
const COMMENT_AI_ENABLED = process.env.ORGANIC_ENGAGEMENT_COMMENT_AI_ENABLED !== "false";

let timer = null;
let initialTimer = null;
let running = false;
let persistedStateLoaded = false;

const serviceState = {
  adminStopped: false,
  adminStateLoadedAt: null,
  startedAt: null,
  lastRunAt: null,
  lastResult: null,
  runCount: 0,
  failureCount: 0,
  lastErrorAt: null,
  errors: [],
};

const MAX_ERRORS = 50;

function pushServiceError(error) {
  const entry = { at: new Date().toISOString(), message: error?.message || String(error) };
  serviceState.lastErrorAt = entry.at;
  serviceState.errors.unshift(entry);
  if (serviceState.errors.length > MAX_ERRORS) serviceState.errors.pop();
  console.error("[organic-engagement]", entry.message);
}

async function loadOrganicEngagementAdminState() {
  if (persistedStateLoaded) return serviceState.adminStopped;
  try {
    if (localOnly) {
      serviceState.adminStopped = local.getMeta("organicEngagement:adminStopped") === "true";
    } else {
      const row = await prisma.analyticsCache.findUnique({ where: { cacheKey: "organic_engagement_admin_state" } });
      serviceState.adminStopped = Boolean(row?.payload?.adminStopped);
    }
  } catch (error) {
    pushServiceError(error);
  }
  persistedStateLoaded = true;
  serviceState.adminStateLoadedAt = new Date().toISOString();
  return serviceState.adminStopped;
}

async function persistOrganicEngagementAdminState(adminStopped) {
  const nextAdminStopped = Boolean(adminStopped);
  if (persistedStateLoaded && serviceState.adminStopped === nextAdminStopped) {
    serviceState.adminStateLoadedAt = serviceState.adminStateLoadedAt || new Date().toISOString();
    return;
  }
  serviceState.adminStopped = nextAdminStopped;
  persistedStateLoaded = true;
  serviceState.adminStateLoadedAt = new Date().toISOString();
  if (localOnly) {
    local.setMeta("organicEngagement:adminStopped", serviceState.adminStopped ? "true" : "false");
    return;
  }
  await prisma.analyticsCache.upsert({
    where: { cacheKey: "organic_engagement_admin_state" },
    update: {
      payload: { adminStopped: serviceState.adminStopped },
      generatedAt: new Date(),
      expiresAt: new Date("2999-12-31T00:00:00.000Z"),
    },
    create: {
      cacheKey: "organic_engagement_admin_state",
      payload: { adminStopped: serviceState.adminStopped },
      expiresAt: new Date("2999-12-31T00:00:00.000Z"),
    },
  });
}

function hashValue(value) {
  const text = String(value || "");
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function pickTier(entityId) {
  const bucket = hashValue(entityId) % 100;
  if (bucket >= 94) return "viral";
  if (bucket >= 74) return "strong";
  return "regular";
}

function targetsFor(entityId, entityType) {
  const seed = hashValue(`${entityType}:${entityId}`);
  const tier = pickTier(entityId);
  const range = (min, max, salt) => min + ((seed + salt * 7919) % (max - min + 1));
  if (entityType === "article") {
    if (tier === "viral") return { tier, views: range(165, 249, 1), likes: range(70, 175, 2), comments: 0, shares: 0 };
    if (tier === "strong") return { tier, views: range(95, 185, 3), likes: range(32, 96, 4), comments: 0, shares: 0 };
    return { tier, views: range(18, 104, 5), likes: range(3, 38, 6), comments: 0, shares: 0 };
  }
  if (tier === "viral") return { tier, views: range(190, 249, 7), likes: range(92, 211, 8), comments: range(4, 10, 9), shares: range(30, 88, 10) };
  if (tier === "strong") return { tier, views: range(105, 204, 11), likes: range(38, 124, 12), comments: range(2, 5, 13), shares: range(8, 42, 14) };
  return { tier, views: range(16, 122, 15), likes: range(2, 52, 16), comments: range(0, 2, 17), shares: range(0, 18, 18) };
}

function lifecycleProgress(createdAt, tier) {
  const ageMs = Math.max(0, Date.now() - new Date(createdAt || Date.now()).getTime());
  const ageHours = ageMs / 3600000;
  if (ageHours < 0.2) return 0;
  const duration = tier === "viral" ? 96 : tier === "strong" ? 72 : 48;
  return Math.min(1, Math.pow(ageHours / duration, 0.72));
}

function desiredCounts(targets, createdAt) {
  const progress = lifecycleProgress(createdAt, targets.tier);
  return {
    views: Math.floor(targets.views * progress),
    likes: Math.floor(targets.likes * progress),
    comments: Math.floor(targets.comments * progress),
    shares: Math.floor(targets.shares * progress),
  };
}

function uniqueUsers(users) {
  return [...new Map(users.filter(Boolean).map((user) => [user.id, user])).values()];
}

function localSeedActorsForPost(db, post) {
  if (post.communityId) {
    const community = db.prepare("SELECT status FROM Community WHERE id = ?").get(post.communityId);
    if (community?.status === "PRIVATE") {
      return db.prepare(`
        SELECT u.id, u.username, u.name
        FROM CommunityMember cm
        JOIN User u ON u.id = cm.userId
        WHERE cm.communityId = ? AND u.provider = 'seed'
        ORDER BY cm.joinedAt ASC
      `).all(post.communityId);
    }
  }
  return db.prepare("SELECT id, username, name FROM User WHERE provider = 'seed' ORDER BY createdAt ASC LIMIT 250").all();
}

function selectActors(actors, count, entityId, salt = 0) {
  if (!actors.length || count <= 0) return [];
  const start = hashValue(`${entityId}:${salt}`) % actors.length;
  const step = 17 + (salt % 11);
  return Array.from({ length: Math.min(count, actors.length) }, (_value, index) => actors[(start + index * step) % actors.length]);
}

function extractTopicWords(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^a-z0-9#\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 4 && !COMMENT_STOP_WORDS.has(word.replace(/^#/, "")))
    .slice(0, 8);
}

const COMMENT_STOP_WORDS = new Set([
  "about", "after", "again", "also", "because", "before", "being", "could", "from",
  "have", "into", "more", "most", "other", "over", "should", "their", "there", "these",
  "they", "this", "those", "through", "under", "very", "what", "when", "where", "which",
  "while", "with", "would", "people", "politics", "political", "government", "policy",
  "world", "think", "really",
]);

function fallbackCommentForPost(post, index) {
  const words = extractTopicWords(`${post.text || ""} ${post.keywordsJson || ""}`);
  const topic = (words[(hashValue(post.id) + index) % Math.max(words.length, 1)] || "this issue").replace(/^#/, "");
  const templates = [
    `The point about ${topic} is what makes this worth discussing.`,
    `I can see why ${topic} is getting attention here.`,
    `The ${topic} angle probably needs more context before people settle on one view.`,
    `This is interesting, especially if you look at how ${topic} affects regular people.`,
    `I do not fully agree, but the concern around ${topic} is real.`,
    `The practical side of ${topic} is what I would want to hear more about.`,
    `This framing of ${topic} makes sense, even if there is another side too.`,
  ];
  return templates[(hashValue(`${post.id}:comment:${index}`)) % templates.length];
}

function normalizeAiComment(comment) {
  return String(comment || "")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/[#@][a-z0-9_]+/gi, "")
    .replace(/\b(as an ai|source:|according to|citation|in conclusion)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^["'“”]+|["'“”]+$/g, "");
}

async function generateAiCommentsForPost(post, count) {
  const wanted = Math.min(Math.max(0, count), COMMENT_MAX_PER_POST_PER_RUN);
  if (!wanted || !COMMENT_AI_ENABLED) return [];
  if (!process.env.OPENAI_API_KEY) return [];
  const topicWords = extractTopicWords(`${post.text || ""} ${post.keywordsJson || ""}`).slice(0, 5).join(", ");
  const prompt = `
Return JSON only: {"comments":["..."]}.
Write exactly ${wanted} short, natural social-media comments that reply to this exact post.
Rules:
- Each comment must be directly related to the post.
- Sound like different real people casually reacting in a political discussion.
- Mention a concrete idea from the post or a clear implication of it.
- Mix agreement, doubt, nuance, and follow-up questions when appropriate.
- 8 to 24 words each.
- No generic filler like "interesting point" unless it includes a specific reason.
- No hashtags, no URLs, no citations, no emojis, no formal article tone.
- Do not mention that you are AI.

Post type: ${post.type || "opinion"}
Topic hints: ${topicWords || "politics and geopolitics"}
Post text:
${String(post.text || "").slice(0, 1200)}
`;
  try {
    const result = await generateJson(prompt);
    const comments = Array.isArray(result.comments) ? result.comments : [];
    const seen = new Set();
    return comments
      .map(normalizeAiComment)
      .filter((comment) => comment.length >= 12 && comment.length <= 180)
      .filter((comment) => !/^(interesting|good point|true|agreed)\.?$/i.test(comment))
      .filter((comment) => {
        const key = comment.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, wanted);
  } catch (error) {
    pushServiceError(error);
    return [];
  }
}

function localCurrentPostCounts(db, postId) {
  return db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM PostView WHERE postId = ?) AS views,
      (SELECT COUNT(*) FROM LikeRecord WHERE postId = ?) AS likes,
      (SELECT COUNT(*) FROM Comment WHERE postId = ? AND deletedAt IS NULL) AS comments,
      (SELECT COUNT(*) FROM ShareRecord WHERE postId = ?) AS shares
  `).get(postId, postId, postId, postId);
}

function localCurrentArticleCounts(db, articleId) {
  return db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM PostView WHERE articleId = ?) AS views,
      (SELECT COUNT(*) FROM LikeRecord WHERE articleId = ?) AS likes
  `).get(articleId, articleId);
}

function upsertLocalState(db, entityType, entityId) {
  const existing = db.prepare("SELECT * FROM OrganicEngagementState WHERE entityType = ? AND entityId = ?").get(entityType, entityId);
  if (existing) return existing;
  const targets = targetsFor(entityId, entityType);
  const state = {
    id: local.newId(),
    entityType,
    entityId,
    tier: targets.tier,
    targetViews: targets.views,
    targetLikes: targets.likes,
    targetComments: targets.comments,
    targetShares: targets.shares,
    startedAt: local.nowIso(),
    updatedAt: local.nowIso(),
  };
  db.prepare(`
    INSERT INTO OrganicEngagementState (
      id, entityType, entityId, tier, targetViews, targetLikes,
      targetComments, targetShares, startedAt, updatedAt
    ) VALUES (
      @id, @entityType, @entityId, @tier, @targetViews, @targetLikes,
      @targetComments, @targetShares, @startedAt, @updatedAt
    )
  `).run(state);
  return state;
}

async function applyLocalPostEngagement(db, post) {
  const state = upsertLocalState(db, "post", post.id);
  const targets = {
    tier: state.tier,
    views: state.targetViews,
    likes: state.targetLikes,
    comments: state.targetComments,
    shares: state.targetShares,
  };
  const desired = desiredCounts(targets, post.createdAt);
  const current = localCurrentPostCounts(db, post.id);
  const actors = uniqueUsers(localSeedActorsForPost(db, post));
  if (!actors.length) return;
  const now = local.nowIso();
  const commentsToAdd = Math.min(Math.max(0, desired.comments - current.comments), COMMENT_MAX_PER_POST_PER_RUN);
  const aiComments = await generateAiCommentsForPost(post, commentsToAdd);

  db.transaction(() => {
    selectActors(actors, Math.max(0, desired.views - current.views), post.id, 1).forEach((user, index) => {
      db.prepare("INSERT INTO PostView (id, userId, postId, viewedAt, data) VALUES (?, ?, ?, ?, '{}')")
        .run(local.newId(), user.id, post.id, new Date(Date.now() - index * 17000).toISOString());
    });
    selectActors(actors, Math.max(0, desired.likes - current.likes), post.id, 2).forEach((user) => {
      db.prepare("INSERT OR IGNORE INTO LikeRecord (id, userId, postId, createdAt, data) VALUES (?, ?, ?, ?, '{}')")
        .run(local.newId(), user.id, post.id, now);
    });
    selectActors(actors, Math.max(0, desired.shares - current.shares), post.id, 3).forEach((user) => {
      db.prepare("INSERT INTO ShareRecord (id, userId, postId, createdAt, data) VALUES (?, ?, ?, ?, '{}')")
        .run(local.newId(), user.id, post.id, now);
    });
    selectActors(actors, aiComments.length, post.id, 4).forEach((user, index) => {
      db.prepare(`INSERT INTO Comment (id, postId, authorId, text, createdAt, updatedAt, likesCount, repliesCount, data) VALUES (?, ?, ?, ?, ?, ?, 0, 0, '{}')`)
        .run(local.newId(), post.id, user.id, aiComments[index] || fallbackCommentForPost(post, index), now, now);
    });
    const counts = localCurrentPostCounts(db, post.id);
    db.prepare("UPDATE Post SET viewsCount = ?, likesCount = ?, commentsCount = ?, sharesCount = ?, engagement = ? WHERE id = ?")
      .run(counts.views, counts.likes, counts.comments, counts.shares, counts.views + counts.likes + counts.comments * 2 + counts.shares * 3, post.id);
    db.prepare("UPDATE OrganicEngagementState SET updatedAt = ? WHERE entityType = 'post' AND entityId = ?").run(now, post.id);
  })();
}

function applyLocalArticleEngagement(db, article) {
  const state = upsertLocalState(db, "article", article.id);
  const desired = desiredCounts({
    tier: state.tier,
    views: state.targetViews,
    likes: state.targetLikes,
    comments: 0,
    shares: 0,
  }, article.createdAt);
  const current = localCurrentArticleCounts(db, article.id);
  const actors = db.prepare("SELECT id, username, name FROM User WHERE provider = 'seed' ORDER BY createdAt ASC LIMIT 250").all();
  const now = local.nowIso();
  db.transaction(() => {
    selectActors(actors, Math.max(0, desired.views - current.views), article.id, 5).forEach((user, index) => {
      db.prepare("INSERT INTO PostView (id, userId, articleId, viewedAt, data) VALUES (?, ?, ?, ?, '{}')")
        .run(local.newId(), user.id, article.id, new Date(Date.now() - index * 19000).toISOString());
    });
    selectActors(actors, Math.max(0, desired.likes - current.likes), article.id, 6).forEach((user) => {
      db.prepare("INSERT OR IGNORE INTO LikeRecord (id, userId, articleId, createdAt, data) VALUES (?, ?, ?, ?, '{}')")
        .run(local.newId(), user.id, article.id, now);
    });
    const counts = localCurrentArticleCounts(db, article.id);
    db.prepare("UPDATE Article SET viewsCount = ?, likesCount = ? WHERE id = ?").run(counts.views, counts.likes, article.id);
    db.prepare("UPDATE OrganicEngagementState SET updatedAt = ? WHERE entityType = 'article' AND entityId = ?").run(now, article.id);
  })();
}

async function runLocalOrganicEngagementOnce() {
  const db = local.getDb();
  if (!db) return { posts: 0, articles: 0 };
  const posts = db.prepare(`
    SELECT p.*, c.status AS communityStatus, s.updatedAt AS engagementUpdatedAt
    FROM Post p
    LEFT JOIN Community c ON c.id = p.communityId
    LEFT JOIN OrganicEngagementState s ON s.entityType = 'post' AND s.entityId = p.id
    WHERE p.deletedAt IS NULL
    ORDER BY datetime(COALESCE(s.updatedAt, '1970-01-01T00:00:00.000Z')) ASC, datetime(p.createdAt) DESC
    LIMIT ?
  `).all(BATCH_LIMIT);
  const articles = db.prepare(`
    SELECT a.*, s.updatedAt AS engagementUpdatedAt
    FROM Article a
    LEFT JOIN OrganicEngagementState s ON s.entityType = 'article' AND s.entityId = a.id
    WHERE a.deletedAt IS NULL
    ORDER BY datetime(COALESCE(s.updatedAt, '1970-01-01T00:00:00.000Z')) ASC, datetime(a.createdAt) DESC
    LIMIT ?
  `).all(Math.max(5, Math.floor(BATCH_LIMIT / 2)));
  for (const post of posts) {
    await applyLocalPostEngagement(db, post);
  }
  articles.forEach((article) => applyLocalArticleEngagement(db, article));
  return { posts: posts.length, articles: articles.length };
}

async function runCloudOrganicEngagementOnce() {
  const seedUsers = await prisma.user.findMany({ where: { provider: "seed" }, select: { id: true, username: true, name: true }, take: 250 });
  if (!seedUsers.length) return { posts: 0, articles: 0 };
  const posts = await prisma.post.findMany({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    take: BATCH_LIMIT,
    include: { community: true },
  });
  for (const post of posts) {
    const targets = targetsFor(post.id, "post");
    const desired = desiredCounts(targets, post.createdAt);
    const actors = post.community?.status === "PRIVATE"
      ? await prisma.user.findMany({
          where: { provider: "seed", memberships: { some: { communityId: post.communityId } } },
          select: { id: true, username: true, name: true },
          take: 250,
        })
      : seedUsers;
    if (!actors.length) continue;
    const [views, likes, comments, shares] = await Promise.all([
      prisma.postView.count({ where: { postId: post.id } }),
      prisma.like.count({ where: { postId: post.id } }),
      prisma.comment.count({ where: { postId: post.id } }),
      prisma.share.count({ where: { postId: post.id } }),
    ]);
    const commentsToAdd = Math.min(Math.max(0, desired.comments - comments), COMMENT_MAX_PER_POST_PER_RUN);
    const aiComments = await generateAiCommentsForPost(post, commentsToAdd);
    await prisma.$transaction([
      prisma.postView.createMany({ data: selectActors(actors, Math.max(0, desired.views - views), post.id, 1).map((user, index) => ({ userId: user.id, postId: post.id, viewedAt: new Date(Date.now() - index * 17000) })) }),
      prisma.like.createMany({ data: selectActors(actors, Math.max(0, desired.likes - likes), post.id, 2).map((user) => ({ userId: user.id, postId: post.id })), skipDuplicates: true }),
      prisma.share.createMany({ data: selectActors(actors, Math.max(0, desired.shares - shares), post.id, 3).map((user) => ({ userId: user.id, postId: post.id })) }),
      prisma.comment.createMany({ data: selectActors(actors, aiComments.length, post.id, 4).map((user, index) => ({ authorId: user.id, postId: post.id, text: aiComments[index] || fallbackCommentForPost(post, index) })) }),
    ]);
    const [nextViews, nextLikes, nextComments, nextShares] = await Promise.all([
      prisma.postView.count({ where: { postId: post.id } }),
      prisma.like.count({ where: { postId: post.id } }),
      prisma.comment.count({ where: { postId: post.id } }),
      prisma.share.count({ where: { postId: post.id } }),
    ]);
    await prisma.post.update({ where: { id: post.id }, data: { engagement: nextViews + nextLikes + nextComments * 2 + nextShares * 3 } });
  }
  const articles = await prisma.article.findMany({ orderBy: { createdAt: "desc" }, take: Math.max(5, Math.floor(BATCH_LIMIT / 2)) });
  for (const article of articles) {
    const targets = targetsFor(article.id, "article");
    const desired = desiredCounts(targets, article.createdAt);
    const [views, likes] = await Promise.all([
      prisma.postView.count({ where: { articleId: article.id } }),
      prisma.like.count({ where: { articleId: article.id } }),
    ]);
    await prisma.$transaction([
      prisma.postView.createMany({ data: selectActors(seedUsers, Math.max(0, desired.views - views), article.id, 5).map((user, index) => ({ userId: user.id, articleId: article.id, viewedAt: new Date(Date.now() - index * 19000) })) }),
      prisma.like.createMany({ data: selectActors(seedUsers, Math.max(0, desired.likes - likes), article.id, 6).map((user) => ({ userId: user.id, articleId: article.id })), skipDuplicates: true }),
    ]);
  }
  return { posts: posts.length, articles: articles.length };
}

async function runOrganicEngagementOnce() {
  await loadOrganicEngagementAdminState();
  if (serviceState.adminStopped) return { skipped: true, reason: "admin-stopped" };
  if (running) return { skipped: true, reason: "already-running" };
  running = true;
  try {
    const result = localOnly ? runLocalOrganicEngagementOnce() : await runCloudOrganicEngagementOnce();
    serviceState.runCount += 1;
    serviceState.lastRunAt = new Date().toISOString();
    serviceState.lastResult = result;
    return result;
  } catch (error) {
    serviceState.failureCount += 1;
    pushServiceError(error);
    throw error;
  } finally {
    running = false;
  }
}

async function startOrganicEngagementService({ respectEnv = false, clearAdminStop = false } = {}) {
  await loadOrganicEngagementAdminState();
  if (clearAdminStop && serviceState.adminStopped) await persistOrganicEngagementAdminState(false);
  if (timer || serviceState.adminStopped || (respectEnv && process.env.ORGANIC_ENGAGEMENT_ENABLED === "false")) return false;
  serviceState.startedAt = new Date().toISOString();
  timer = setInterval(() => {
    runOrganicEngagementOnce().catch((error) => console.error("Organic engagement failed:", error.message));
  }, DEFAULT_INTERVAL_MS);
  initialTimer = setTimeout(() => {
    initialTimer = null;
    runOrganicEngagementOnce().catch((error) => console.error("Organic engagement failed:", error.message));
  }, Number(process.env.ORGANIC_ENGAGEMENT_INITIAL_DELAY_MS || 300000));
  return true;
}

async function stopOrganicEngagementService({ persist = false } = {}) {
  if (timer) clearInterval(timer);
  if (initialTimer) clearTimeout(initialTimer);
  timer = null;
  initialTimer = null;
  if (persist) await persistOrganicEngagementAdminState(true);
  return true;
}

function clearOrganicEngagementErrors() {
  serviceState.errors = [];
  serviceState.lastErrorAt = null;
}

function getOrganicEngagementStatus() {
  return {
    running: Boolean(timer),
    busy: running,
    config: {
      enabled: process.env.ORGANIC_ENGAGEMENT_ENABLED !== "false",
      intervalMs: DEFAULT_INTERVAL_MS,
      initialDelayMs: Number(process.env.ORGANIC_ENGAGEMENT_INITIAL_DELAY_MS || 300000),
      batchLimit: BATCH_LIMIT,
      commentMaxPerPostPerRun: COMMENT_MAX_PER_POST_PER_RUN,
      commentAiEnabled: COMMENT_AI_ENABLED,
      engagementPool: "250 seeded accounts",
      mode: localOnly ? "local" : "cloud",
      commentsProvider: "OpenAI JSON comments only",
    },
    state: serviceState,
  };
}

module.exports = {
  clearOrganicEngagementErrors,
  getOrganicEngagementStatus,
  loadOrganicEngagementAdminState,
  runOrganicEngagementOnce,
  startOrganicEngagementService,
  stopOrganicEngagementService,
  targetsFor,
};
