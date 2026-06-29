const local = require("../db/local");

const SYNTHETIC_PROVIDERS = new Set(["seed", "synthetic", "anonymous", "fake"]);
const PROFILE_WINDOW_DAYS = 90;
const CANDIDATE_LIMIT = 500;

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

function parseJson(value, fallback = []) {
  if (Array.isArray(value)) return value;
  try {
    return JSON.parse(value || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

function deterministicUnit(seed) {
  let hash = 2166136261;
  for (const char of String(seed)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function isSyntheticUser(user) {
  if (!user) return false;
  const provider = String(user.provider || "").toLowerCase();
  const username = String(user.username || "").toLowerCase();
  const email = String(user.email || "").toLowerCase();
  return (
    SYNTHETIC_PROVIDERS.has(provider) ||
    username.startsWith("guest_engagement_") ||
    /^user_\d+$/.test(username) ||
    email.endsWith("@mock.shine.local")
  );
}

function increment(map, key, amount) {
  if (key) map.set(key, (map.get(key) || 0) + amount);
}

function normalizeAgainstMax(map, key) {
  if (!map.size || !key) return 0;
  return clamp((map.get(key) || 0) / Math.max(1, ...map.values()));
}

function scaledRate(count, denominator, sensitivity) {
  if (!count || !denominator) return 0;
  return clamp(1 - Math.exp(-(count / denominator) * sensitivity));
}

function scoreCandidate({ post, metrics, profile, sources, sessionId, now = Date.now() }) {
  const ageHours = Math.max(0, (now - new Date(post.createdAt).getTime()) / 3600000);
  const impressions = Math.max(metrics.impressions || 0, metrics.views || 0, 1);
  const keywordMatches = (post.keywords || [])
    .map((keyword) => normalizeAgainstMax(profile.topicWeights, String(keyword).toLowerCase()))
    .filter((value) => value > 0)
    .sort((a, b) => b - a)
    .slice(0, 3);
  const topicAffinity = clamp(
    (keywordMatches[0] || 0) * 0.6 +
    (keywordMatches[1] || 0) * 0.25 +
    (keywordMatches[2] || 0) * 0.15
  );
  const creatorAffinity = normalizeAgainstMax(profile.creatorWeights, post.authorId);
  const typeAffinity = normalizeAgainstMax(profile.typeWeights, post.type);
  const isFollowing = profile.followingIds.has(post.authorId);
  const freshness = Math.exp(-ageHours / 168);
  const sourceQuality = post.type === "poll" ? 0.65 : post.sourceCount > 0 ? 1 : 0.15;
  const longRead = metrics.averageDwellMs
    ? clamp(metrics.averageDwellMs / 18000)
    : clamp(String(post.text || "").length / 900) * 0.35;
  const openRate = scaledRate(metrics.opens, impressions, 3.5);
  const saveRate = scaledRate(metrics.saves, impressions, 14);
  const commentRate = scaledRate(metrics.comments, impressions, 10);
  const shareRate = scaledRate(metrics.shares, impressions, 12);
  const likeRate = scaledRate(metrics.likes, impressions, 5);
  const momentumRaw =
    (metrics.likes || 0) * 1.2 +
    (metrics.comments || 0) * 2.2 +
    (metrics.saves || 0) * 2.8 +
    (metrics.shares || 0) * 3;
  const momentum = clamp(1 - Math.exp(-(momentumRaw / Math.sqrt(ageHours + 4)) / 10));
  const explorationSeed = deterministicUnit(`${sessionId}:${post.id}`);

  let score =
    0.22 * longRead +
    0.16 * saveRate +
    0.14 * commentRate +
    0.11 * shareRate +
    0.1 * openRate +
    0.08 * likeRate +
    0.15 * topicAffinity +
    0.07 * creatorAffinity +
    0.1 * (isFollowing ? 1 : 0) +
    0.06 * freshness +
    0.06 * sourceQuality +
    0.05 * momentum +
    0.03 * typeAffinity +
    0.025 * explorationSeed;

  if (sources.has("similar")) score += 0.05;
  if (sources.has("interest")) score += 0.04;
  if (post.featured) score += 0.04;
  if (post.authorId === profile.userId) score -= 0.08;

  const prior = profile.priorInteractions.get(post.id);
  if (prior?.hidden || prior?.reported) score -= 10;
  else if (prior?.skipped) score -= 0.3;
  else if (prior?.openedAt || prior?.dwellMs >= 8000) score -= 0.18;
  else if (prior) score -= 0.06;

  const primaryTopic = (post.keywords || [])
    .map((keyword) => String(keyword).toLowerCase())
    .sort((a, b) => (profile.topicWeights.get(b) || 0) - (profile.topicWeights.get(a) || 0))[0] || null;

  return {
    post,
    score,
    primaryTopic,
    exploration: !isFollowing && creatorAffinity === 0 && explorationSeed > 0.45,
  };
}

function rerankCandidates(candidates, limit, resumePostId) {
  const remaining = [...candidates].sort((a, b) => b.score - a.score);
  const output = [];

  if (resumePostId) {
    const index = remaining.findIndex((candidate) => candidate.post.id === resumePostId);
    if (index >= 0) output.push(remaining.splice(index, 1)[0]);
  }

  while (remaining.length && output.length < limit) {
    const recentAuthors = output.slice(-20).map((item) => item.post.authorId);
    const recentTopics = output.slice(-10).map((item) => item.primaryTopic).filter(Boolean);
    const previousAuthor = output.at(-1)?.post.authorId;
    const discoverySlot = output.length > 0 && output.length % 10 === 9;
    let pickIndex = remaining.findIndex((candidate, index) => {
      const authorCount = recentAuthors.filter((id) => id === candidate.post.authorId).length;
      const topicCount = recentTopics.filter((topic) => topic === candidate.primaryTopic).length;
      if (candidate.post.authorId === previousAuthor || authorCount >= 2 || topicCount >= 3) return false;
      return !discoverySlot || candidate.exploration || index > 25;
    });
    if (pickIndex < 0) pickIndex = 0;
    output.push(remaining.splice(pickIndex, 1)[0]);
  }
  return output;
}

function rankUnseenFirst(candidates, engagedPostIds, resumePostId) {
  const unseen = candidates.filter((candidate) => !engagedPostIds.has(candidate.post.id));
  const engaged = candidates.filter((candidate) => engagedPostIds.has(candidate.post.id));
  const safeResumePostId = resumePostId && !engagedPostIds.has(resumePostId)
    ? resumePostId
    : null;
  return [
    ...rerankCandidates(unseen, unseen.length, safeResumePostId),
    ...rerankCandidates(engaged, engaged.length, null),
  ];
}

function buildProfile(db, userId) {
  const profile = {
    userId,
    followingIds: new Set(),
    topicWeights: new Map(),
    creatorWeights: new Map(),
    typeWeights: new Map(),
    priorInteractions: new Map(),
    likedPostIds: [],
    engagedPostIds: new Set(),
  };
  if (!userId) return profile;

  const actor = db.prepare("SELECT * FROM User WHERE id = ?").get(userId);
  if (!actor || isSyntheticUser(actor)) return profile;
  profile.followingIds = new Set(
    db.prepare("SELECT followingId FROM Follows WHERE followerId = ?").all(userId).map((row) => row.followingId)
  );

  const activities = [
    ...db.prepare(`SELECT p.*, 2 AS weight FROM LikeRecord r JOIN Post p ON p.id = r.postId WHERE r.userId = ? AND p.deletedAt IS NULL`).all(userId),
    ...db.prepare(`SELECT p.*, 4 AS weight FROM SaveRecord r JOIN Post p ON p.id = r.postId WHERE r.userId = ? AND p.deletedAt IS NULL`).all(userId),
    ...db.prepare(`SELECT p.*, 3 AS weight FROM Comment r JOIN Post p ON p.id = r.postId WHERE r.authorId = ? AND p.deletedAt IS NULL`).all(userId),
  ];
  profile.likedPostIds = db
    .prepare("SELECT postId FROM LikeRecord WHERE userId = ? AND postId IS NOT NULL")
    .all(userId)
    .map((row) => row.postId);

  const since = new Date(Date.now() - PROFILE_WINDOW_DAYS * 86400000).toISOString();
  const interactions = db
    .prepare(`SELECT i.*, p.authorId, p.type, p.keywordsJson
      FROM FeedInteraction i JOIN Post p ON p.id = i.postId
      WHERE i.userId = ? AND datetime(i.updatedAt) >= datetime(?)
      ORDER BY datetime(i.updatedAt) DESC LIMIT 500`)
    .all(userId, since);

  const addActivity = (item, weight) => {
    increment(profile.creatorWeights, item.authorId, weight);
    increment(profile.typeWeights, item.type, weight);
    for (const keyword of parseJson(item.keywordsJson, [])) {
      increment(profile.topicWeights, String(keyword).toLowerCase(), weight);
    }
  };
  activities.forEach((item) => addActivity(item, Number(item.weight)));
  activities.forEach((item) => profile.engagedPostIds.add(item.id));
  interactions.forEach((item) => {
    const base = item.hidden || item.reported ? -5 : item.skipped ? -0.75 : item.openedAt ? 1.5 : 0.35;
    addActivity(item, base + clamp(Number(item.dwellMs || 0) / 15000, 0, 2));
    const current = profile.priorInteractions.get(item.postId);
    if (!current || Number(item.dwellMs) > Number(current.dwellMs)) {
      profile.priorInteractions.set(item.postId, item);
    }
    profile.engagedPostIds.add(item.postId);
  });
  return profile;
}

function placeholders(values) {
  return values.map(() => "?").join(",");
}

function groupRealCounts(db, table, userColumn, postIds) {
  if (!postIds.length) return new Map();
  const rows = db.prepare(`
    SELECT r.postId, COUNT(*) AS count
    FROM ${table} r JOIN User u ON u.id = r.${userColumn}
    WHERE r.postId IN (${placeholders(postIds)})
      AND lower(COALESCE(u.provider, '')) NOT IN ('seed', 'synthetic', 'anonymous', 'fake')
      AND lower(COALESCE(u.username, '')) NOT LIKE 'guest_engagement_%'
      AND lower(COALESCE(u.email, '')) NOT LIKE '%@mock.shine.local'
      AND lower(COALESCE(u.username, '')) NOT GLOB 'user_[0-9]*'
    GROUP BY r.postId
  `).all(...postIds);
  return new Map(rows.map((row) => [row.postId, Number(row.count)]));
}

function getSimilarPostIds(db, profile) {
  if (!profile.likedPostIds.length) return new Set();
  const ids = profile.likedPostIds.slice(0, 100);
  const users = db.prepare(`
    SELECT l.userId, COUNT(*) AS overlap
    FROM LikeRecord l JOIN User u ON u.id = l.userId
    WHERE l.postId IN (${placeholders(ids)}) AND l.userId != ?
      AND lower(COALESCE(u.provider, '')) NOT IN ('seed', 'synthetic', 'anonymous', 'fake')
      AND lower(COALESCE(u.email, '')) NOT LIKE '%@mock.shine.local'
      AND lower(COALESCE(u.username, '')) NOT GLOB 'user_[0-9]*'
    GROUP BY l.userId ORDER BY overlap DESC LIMIT 30
  `).all(...ids, profile.userId).map((row) => row.userId);
  if (!users.length) return new Set();
  return new Set(
    db.prepare(`SELECT postId, COUNT(*) AS score FROM LikeRecord
      WHERE userId IN (${placeholders(users)}) AND postId IS NOT NULL
      GROUP BY postId ORDER BY score DESC LIMIT 160`).all(...users).map((row) => row.postId)
  );
}

function getRankedPostRows({
  userId = null,
  page = 1,
  pageSize = 10,
  excludeIds = [],
  sessionId = "anonymous",
  resumePostId = null,
} = {}) {
  const db = local.getDb();
  if (!db) return [];
  const profile = buildProfile(db, userId);
  const rows = db.prepare(`
    SELECT p.* FROM Post p LEFT JOIN Community c ON c.id = p.communityId
    WHERE p.deletedAt IS NULL AND p.status = 'ACTIVE'
      AND (p.communityId IS NULL OR COALESCE(c.status, 'PUBLIC') = 'PUBLIC' OR p.authorId = ?)
    ORDER BY datetime(p.createdAt) DESC LIMIT ?
  `).all(userId || "", CANDIDATE_LIMIT);
  if (resumePostId && !rows.some((row) => row.id === resumePostId)) {
    const resume = db.prepare("SELECT * FROM Post WHERE id = ? AND deletedAt IS NULL AND status = 'ACTIVE'").get(resumePostId);
    if (resume) rows.push(resume);
  }
  if (!rows.length) return [];

  const similarPostIds = getSimilarPostIds(db, profile);
  const candidateSources = new Map();
  rows.forEach((row, index) => {
    const sources = new Set(index < 240 ? ["recent"] : []);
    const keywords = parseJson(row.keywordsJson, []).map((keyword) => String(keyword).toLowerCase());
    if (profile.followingIds.has(row.authorId)) sources.add("network");
    if (keywords.some((keyword) => (profile.topicWeights.get(keyword) || 0) > 0)) sources.add("interest");
    if (similarPostIds.has(row.id)) sources.add("similar");
    candidateSources.set(row.id, sources);
  });

  const postIds = rows.map((row) => row.id);
  const likes = groupRealCounts(db, "LikeRecord", "userId", postIds);
  const comments = groupRealCounts(db, "Comment", "authorId", postIds);
  const shares = groupRealCounts(db, "ShareRecord", "userId", postIds);
  const saves = groupRealCounts(db, "SaveRecord", "userId", postIds);
  const views = groupRealCounts(db, "PostView", "userId", postIds);
  const sourceCounts = new Map(
    db.prepare(`SELECT postId, COUNT(*) AS count FROM Source WHERE postId IN (${placeholders(postIds)}) GROUP BY postId`)
      .all(...postIds).map((row) => [row.postId, Number(row.count)])
  );
  const eventRows = db.prepare(`SELECT postId, COUNT(*) AS impressions,
      SUM(CASE WHEN openedAt IS NOT NULL THEN 1 ELSE 0 END) AS opens,
      AVG(dwellMs) AS averageDwellMs
    FROM FeedInteraction WHERE postId IN (${placeholders(postIds)}) GROUP BY postId`).all(...postIds);
  const eventMetrics = new Map(eventRows.map((row) => [row.postId, row]));

  const scored = rows.map((row) => {
    const event = eventMetrics.get(row.id) || {};
    const post = {
      ...row,
      keywords: parseJson(row.keywordsJson, []),
      sourceCount: sourceCounts.get(row.id) || 0,
    };
    return scoreCandidate({
      post,
      profile,
      sources: candidateSources.get(row.id),
      sessionId,
      metrics: {
        likes: likes.get(row.id) || 0,
        comments: comments.get(row.id) || 0,
        shares: shares.get(row.id) || 0,
        saves: saves.get(row.id) || 0,
        views: views.get(row.id) || 0,
        impressions: Number(event.impressions || 0),
        opens: Number(event.opens || 0),
        averageDwellMs: Number(event.averageDwellMs || 0),
      },
    });
  });
  const excluded = new Set(excludeIds);
  const eligible = scored.filter((candidate) => !excluded.has(candidate.post.id) && candidate.score > -5);
  const offset = excludeIds.length ? 0 : Math.max(0, Number(page) - 1) * Number(pageSize);
  return rankUnseenFirst(
    eligible,
    profile.engagedPostIds,
    Number(page) === 1 ? resumePostId : null
  ).slice(offset, offset + Number(pageSize)).map((candidate) => candidate.post);
}

function recordFeedEvents(userId, events = []) {
  const db = local.getDb();
  if (!db || !userId) return 0;
  const actor = db.prepare("SELECT * FROM User WHERE id = ?").get(userId);
  if (!actor || isSyntheticUser(actor)) return 0;

  const merged = new Map();
  for (const event of events.slice(0, 50)) {
    const postId = String(event?.postId || "").slice(0, 80);
    const sessionId = String(event?.sessionId || "").slice(0, 120);
    const type = String(event?.type || "").toLowerCase();
    if (!postId || !sessionId || !["impression", "open", "dwell", "skip", "hide", "report"].includes(type)) continue;
    const key = `${postId}:${sessionId}`;
    const current = merged.get(key) || { postId, sessionId, dwellMs: 0 };
    if (type === "impression") current.impression = true;
    if (type === "open") current.open = true;
    if (type === "dwell") current.dwellMs += clamp(Number(event.dwellMs) || 0, 0, 60000);
    if (type === "skip") current.skip = true;
    if (type === "hide") current.hide = true;
    if (type === "report") current.report = true;
    merged.set(key, current);
  }

  const statement = db.prepare(`
    INSERT INTO FeedInteraction (
      id, userId, postId, sessionId, impressedAt, openedAt, dwellMs,
      skipped, hidden, reported, createdAt, updatedAt
    ) VALUES (
      @id, @userId, @postId, @sessionId, @now, @openedAt, @dwellMs,
      @skipped, @hidden, @reported, @now, @now
    )
    ON CONFLICT(userId, postId, sessionId) DO UPDATE SET
      impressedAt = CASE WHEN @impression = 1 THEN @now ELSE impressedAt END,
      openedAt = COALESCE(@openedAt, openedAt),
      dwellMs = dwellMs + @dwellMs,
      skipped = CASE WHEN @clearSkip = 1 THEN 0 WHEN @skipped = 1 THEN 1 ELSE skipped END,
      hidden = CASE WHEN @hidden = 1 THEN 1 ELSE hidden END,
      reported = CASE WHEN @reported = 1 THEN 1 ELSE reported END,
      updatedAt = @now
  `);
  const transaction = db.transaction(() => {
    let count = 0;
    for (const event of merged.values()) {
      if (!db.prepare("SELECT id FROM Post WHERE id = ? AND deletedAt IS NULL").get(event.postId)) continue;
      const now = local.nowIso();
      const clearSkip = event.open || event.dwellMs >= 8000;
      statement.run({
        id: local.newId(),
        userId,
        postId: event.postId,
        sessionId: event.sessionId,
        now,
        openedAt: event.open ? now : null,
        dwellMs: Math.round(event.dwellMs),
        skipped: clearSkip ? 0 : event.skip ? 1 : 0,
        clearSkip: clearSkip ? 1 : 0,
        hidden: event.hide ? 1 : 0,
        reported: event.report ? 1 : 0,
        impression: event.impression ? 1 : 0,
      });
      count += 1;
    }
    return count;
  });
  return transaction();
}

module.exports = {
  getRankedPostRows,
  isSyntheticUser,
  rankUnseenFirst,
  recordFeedEvents,
  rerankCandidates,
  scoreCandidate,
};
