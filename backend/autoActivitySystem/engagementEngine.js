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
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function randomNonRoundInt(min, max) {
  const lower = Math.ceil(Math.min(min, max));
  const upper = Math.floor(Math.max(min, max));
  let value = randomInt(lower, upper);
  if (value % 10 === 0 && upper > lower) {
    const offset = randomInt(1, Math.min(9, upper - lower));
    value = value + offset <= upper ? value + offset : value - offset;
  }
  return value;
}

function parseJson(value, fallback = []) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function buildPollVoteGroups(post, viewers) {
  const options = Array.isArray(post.pollOptions) ? post.pollOptions.filter((option) => option?.id) : [];
  if (options.length < 2 || viewers.length < 3) return [];

  const maximumVoters = Math.min(viewers.length - 1, Math.max(2, Math.floor(viewers.length * 0.65)));
  const minimumVoters = Math.min(maximumVoters, Math.max(2, Math.floor(viewers.length * 0.12)));
  const voterCount = randomNonRoundInt(minimumVoters, maximumVoters);
  const voters = shuffle(viewers).slice(0, voterCount);
  const groups = new Map(options.map((option) => [option.id, { option, users: [] }]));

  voters.forEach((user, index) => {
    const option = index < 2 ? options[index] : options[Math.floor(Math.random() * options.length)];
    groups.get(option.id).users.push(user);
  });

  return [...groups.values()].filter((group) => group.users.length > 0);
}

function engagementTargets(actorCount, commentActorCount = 50) {
  const maxViews = Math.min(5000, Math.max(0, actorCount));
  if (maxViews < 50) throw new Error("At least 50 anonymous engagement users are required");
  const views = randomNonRoundInt(50, maxViews);
  const likes = randomNonRoundInt(10, Math.min(3500, views));
  return {
    views,
    likes,
    comments: Math.min(randomInt(2, 7), commentActorCount),
    shares: randomInt(0, 4),
    saves: randomInt(1, 7),
  };
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

async function simulateLocalPostEngagement(post, commentActors, engagementActors) {
  const database = local.getDb();
  const targets = engagementTargets(engagementActors.length, commentActors.length);
  const shuffled = shuffle(engagementActors);
  const viewers = shuffled.slice(0, targets.views);
  const likers = shuffle(viewers).slice(0, targets.likes);
  const commenters = shuffle(commentActors).slice(0, targets.comments);
  const comments = await generateRelatedComments(post, commenters, targets.comments);
  const pollVoteGroups = buildPollVoteGroups(post, viewers);
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
    for (const { option, users } of pollVoteGroups) {
      const row = database.prepare("SELECT votedUserIdsJson FROM PollOption WHERE id = ? AND postId = ?").get(option.id, post.id);
      if (!row) continue;
      const votedUserIds = parseJson(row.votedUserIdsJson, []);
      for (const user of users) {
        const inserted = database.prepare(`
          INSERT OR IGNORE INTO PollVote (id, postId, optionId, userId, createdAt)
          VALUES (?, ?, ?, ?, ?)
        `).run(local.newId(), post.id, option.id, user.id, now);
        if (inserted.changes && !votedUserIds.includes(user.id)) votedUserIds.push(user.id);
      }
      database.prepare("UPDATE PollOption SET votes = ?, votedUserIdsJson = ? WHERE id = ?")
        .run(votedUserIds.length, JSON.stringify(votedUserIds), option.id);
    }
    const counts = database.prepare(`
      SELECT
        (SELECT COUNT(*) FROM LikeRecord WHERE postId = ?) AS likes,
        (SELECT COUNT(*) FROM Comment WHERE postId = ? AND deletedAt IS NULL) AS comments,
        (SELECT COUNT(*) FROM PostView WHERE postId = ?) AS views,
        (SELECT COUNT(*) FROM PollVote WHERE postId = ?) AS pollVotes
    `).get(post.id, post.id, post.id, post.id);
    database.prepare("UPDATE Post SET likesCount = ?, commentsCount = ?, viewsCount = ?, engagement = ? WHERE id = ?")
      .run(counts.likes, counts.comments, counts.views, counts.likes + counts.comments * 2 + counts.views + counts.pollVotes * 2, post.id);
  })();
  return targets;
}

async function simulateCloudPostEngagement(prisma, post, commentActors, engagementActors) {
  const targets = engagementTargets(engagementActors.length, commentActors.length);
  const shuffled = shuffle(engagementActors);
  const viewers = shuffled.slice(0, targets.views);
  const likers = shuffle(viewers).slice(0, targets.likes);
  const comments = await generateRelatedComments(post, shuffle(commentActors).slice(0, targets.comments), targets.comments);
  const pollVoteGroups = buildPollVoteGroups(post, viewers);
  await prisma.$transaction([
    prisma.postView.createMany({ data: viewers.map((user) => ({ userId: user.id, postId: post.id })) }),
    prisma.like.createMany({ data: likers.map((user) => ({ userId: user.id, postId: post.id })), skipDuplicates: true }),
    prisma.comment.createMany({ data: comments.map(({ actor, text }) => ({ authorId: actor.id, postId: post.id, text })) }),
    ...pollVoteGroups.map(({ option, users }) => prisma.pollOption.update({
      where: { id: option.id },
      data: { votedUsers: { connect: users.map((user) => ({ id: user.id })) } },
    })),
  ]);
  return targets;
}

async function simulatePostEngagement(prisma, post, commentActors, engagementActors) {
  return localOnly
    ? simulateLocalPostEngagement(post, commentActors, engagementActors)
    : simulateCloudPostEngagement(prisma, post, commentActors, engagementActors);
}

async function simulateArticleEngagement(prisma, article, engagementActors) {
  const targets = engagementTargets(engagementActors.length, 0);
  const viewers = shuffle(engagementActors).slice(0, targets.views);
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
    await prisma.$transaction([
      prisma.postView.createMany({ data: viewers.map((user) => ({ userId: user.id, articleId: article.id })) }),
      prisma.like.createMany({ data: likers.map((user) => ({ userId: user.id, articleId: article.id })), skipDuplicates: true }),
    ]);
  }
  return targets;
}

module.exports = { engagementTargets, simulateArticleEngagement, simulatePostEngagement };
