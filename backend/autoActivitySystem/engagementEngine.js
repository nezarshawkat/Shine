const local = require("../db/local");
const { generateJson } = require("./aiClient");
const { buildCommentsPrompt } = require("./promptBuilder");

const localOnly =
  process.env.DATABASE_MODE === "local" ||
  process.env.LOCAL_ONLY_DB === "true" ||
  !process.env.DATABASE_URL;

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(values) {
  return [...values].sort(() => Math.random() - 0.5);
}

function engagementTargets(actorCount) {
  const views = Math.min(actorCount, randomInt(Math.max(12, Math.floor(actorCount * 0.45)), actorCount));
  const likeRatio = 0.28 + Math.random() * 0.38;
  const likes = Math.max(3, Math.min(views, Math.round(views * likeRatio)));
  return { views, likes, comments: Math.min(randomInt(2, 7), actorCount), shares: randomInt(0, 4), saves: randomInt(1, 7) };
}

async function generateRelatedComments(post, actors, count) {
  if (!count || !actors.length) return [];
  try {
    const result = await generateJson(buildCommentsPrompt({
      postText: post.text,
      postType: post.type,
      actors,
      count,
    }));
    const used = new Set();
    return (Array.isArray(result.comments) ? result.comments : [])
      .map((comment) => {
        const actorIndex = Number(comment.actorIndex);
        const actor = actors[Number.isInteger(actorIndex) ? actorIndex : -1];
        const text = String(comment.text || "").trim().slice(0, 800);
        if (!actor || !text || used.has(actor.id)) return null;
        used.add(actor.id);
        return { actor, text };
      })
      .filter(Boolean)
      .slice(0, count);
  } catch (error) {
    console.error("AI comment generation failed:", error.message);
    return [];
  }
}

async function simulateLocalPostEngagement(post, actors) {
  const database = local.getDb();
  const targets = engagementTargets(actors.length);
  const shuffled = shuffle(actors);
  const viewers = shuffled.slice(0, targets.views);
  const likers = shuffle(viewers).slice(0, targets.likes);
  const commenters = shuffle(actors).slice(0, targets.comments);
  const comments = await generateRelatedComments(post, commenters, targets.comments);
  const now = local.nowIso();

  database.transaction(() => {
    for (const user of viewers) {
      database.prepare("INSERT INTO PostView (id, userId, postId, viewedAt, data) VALUES (?, ?, ?, ?, '{}')")
        .run(local.newId(), user.id, post.id, now);
    }
    for (const user of likers) {
      database.prepare("INSERT OR IGNORE INTO LikeRecord (id, userId, postId, createdAt, data) VALUES (?, ?, ?, ?, '{}')")
        .run(local.newId(), user.id, post.id, now);
    }
    for (const { actor, text } of comments) {
      database.prepare(`INSERT INTO Comment (id, postId, authorId, text, createdAt, updatedAt, likesCount, repliesCount, data) VALUES (?, ?, ?, ?, ?, ?, 0, 0, '{}')`)
        .run(local.newId(), post.id, actor.id, text, now, now);
    }
    const counts = database.prepare(`
      SELECT
        (SELECT COUNT(*) FROM LikeRecord WHERE postId = ?) AS likes,
        (SELECT COUNT(*) FROM Comment WHERE postId = ? AND deletedAt IS NULL) AS comments,
        (SELECT COUNT(*) FROM PostView WHERE postId = ?) AS views
    `).get(post.id, post.id, post.id);
    database.prepare("UPDATE Post SET likesCount = ?, commentsCount = ?, viewsCount = ?, engagement = ? WHERE id = ?")
      .run(counts.likes, counts.comments, counts.views, counts.likes + counts.comments * 2 + counts.views, post.id);
  })();
  return targets;
}

async function simulateCloudPostEngagement(prisma, post, actors) {
  const targets = engagementTargets(actors.length);
  const shuffled = shuffle(actors);
  const viewers = shuffled.slice(0, targets.views);
  const likers = shuffle(viewers).slice(0, targets.likes);
  const comments = await generateRelatedComments(post, shuffle(actors).slice(0, targets.comments), targets.comments);
  await Promise.allSettled([
    ...viewers.map((user) => prisma.postView.create({ data: { userId: user.id, postId: post.id } })),
    ...likers.map((user) => prisma.like.create({ data: { userId: user.id, postId: post.id } })),
    ...comments.map(({ actor, text }) => prisma.comment.create({ data: { authorId: actor.id, postId: post.id, text } })),
  ]);
  return targets;
}

async function simulatePostEngagement(prisma, post, actors) {
  return localOnly ? simulateLocalPostEngagement(post, actors) : simulateCloudPostEngagement(prisma, post, actors);
}

async function simulateArticleEngagement(prisma, article, actors) {
  const targets = engagementTargets(actors.length);
  const viewers = shuffle(actors).slice(0, targets.views);
  const likers = shuffle(viewers).slice(0, targets.likes);
  if (localOnly) {
    const database = local.getDb();
    const now = local.nowIso();
    database.transaction(() => {
      for (const user of viewers) {
        database.prepare("INSERT INTO PostView (id, userId, articleId, viewedAt, data) VALUES (?, ?, ?, ?, '{}')")
          .run(local.newId(), user.id, article.id, now);
      }
      for (const user of likers) {
        database.prepare("INSERT OR IGNORE INTO LikeRecord (id, userId, articleId, createdAt, data) VALUES (?, ?, ?, ?, '{}')")
          .run(local.newId(), user.id, article.id, now);
      }
      database.prepare("UPDATE Article SET likesCount = ?, viewsCount = ? WHERE id = ?").run(likers.length, viewers.length, article.id);
    })();
  } else {
    await Promise.allSettled([
      ...viewers.map((user) => prisma.postView.create({ data: { userId: user.id, articleId: article.id } })),
      ...likers.map((user) => prisma.like.create({ data: { userId: user.id, articleId: article.id } })),
    ]);
  }
  return targets;
}

module.exports = { engagementTargets, simulateArticleEngagement, simulatePostEngagement };
