const local = require("../db/local");
const neon = require("../db/neon");

const DEFAULT_INTERVAL_MS = 15000;
const DEFAULT_BATCH_SIZE = 25;
const DEFAULT_MAX_ATTEMPTS = 8;
const localOnly =
  process.env.DATABASE_MODE === "local" ||
  process.env.LOCAL_ONLY_DB === "true" ||
  !process.env.DATABASE_URL;

let timer = null;
let running = false;

function toDate(value) {
  if (!value) return undefined;
  return value instanceof Date ? value : new Date(value);
}

async function deletePostInNeon(id) {
  const existingPost = await neon.post.findUnique({ where: { id }, select: { id: true } });
  if (!existingPost) return;

  await neon.$transaction(async (tx) => {
    await tx.adminReport.deleteMany({ where: { postId: id } });
    await tx.share.deleteMany({ where: { postId: id } });
    await tx.postView.deleteMany({ where: { postId: id } });
    await tx.media.deleteMany({ where: { postId: id } });
    await tx.pollOption.deleteMany({ where: { postId: id } });
    await tx.post.updateMany({ where: { parentId: id }, data: { parentId: null } });
    await tx.post.delete({ where: { id } });
  });
}

async function syncPostCreate(payload) {
  const post = payload.post;
  if (!post?.id) return;

  await neon.post.upsert({
    where: { id: post.id },
    update: {
      text: post.text || "",
      type: post.type,
      authorId: post.authorId,
      communityId: post.communityId || null,
      parentId: post.parentId || null,
      keywords: post.keywords || [],
      status: post.status || "ACTIVE",
      featured: Boolean(post.featured),
      engagement: post.engagement || 0,
      updatedAt: toDate(post.updatedAt),
    },
    create: {
      id: post.id,
      text: post.text || "",
      type: post.type,
      authorId: post.authorId,
      communityId: post.communityId || null,
      parentId: post.parentId || null,
      keywords: post.keywords || [],
      status: post.status || "ACTIVE",
      featured: Boolean(post.featured),
      engagement: post.engagement || 0,
      createdAt: toDate(post.createdAt),
      updatedAt: toDate(post.updatedAt),
    },
  });

  for (const source of payload.sources || []) {
    await neon.source.upsert({
      where: { id: source.id },
      update: {
        name: source.name || "",
        link: source.link || "",
        postId: post.id,
      },
      create: {
        id: source.id,
        name: source.name || "",
        link: source.link || "",
        postId: post.id,
      },
    });
  }

  for (const media of payload.media || []) {
    await neon.media.upsert({
      where: { id: media.id },
      update: {
        url: media.url,
        type: media.type,
        size: media.size || 0,
        uploaderId: media.uploaderId,
        postId: post.id,
      },
      create: {
        id: media.id,
        url: media.url,
        type: media.type,
        size: media.size || 0,
        createdAt: toDate(media.createdAt),
        uploaderId: media.uploaderId,
        postId: post.id,
      },
    });
  }

  for (const option of payload.pollOptions || []) {
    await neon.pollOption.upsert({
      where: { id: option.id },
      update: {
        text: option.text || "",
        postId: post.id,
      },
      create: {
        id: option.id,
        text: option.text || "",
        postId: post.id,
      },
    });
  }
}

async function syncPostUpdate(payload) {
  if (!payload.id) return;
  await neon.post.update({
    where: { id: payload.id },
    data: {
      text: payload.text || "",
      updatedAt: toDate(payload.updatedAt),
    },
  });
}

async function syncLikeToggle(payload) {
  if (!payload.userId || !payload.postId) return;

  if (payload.liked) {
    await neon.like.upsert({
      where: { userId_postId: { userId: payload.userId, postId: payload.postId } },
      update: {},
      create: {
        id: payload.id,
        userId: payload.userId,
        postId: payload.postId,
      },
    });
    return;
  }

  await neon.like.deleteMany({
    where: { userId: payload.userId, postId: payload.postId },
  });
}

async function syncSaveToggle(payload) {
  if (!payload.userId || !payload.postId) return;

  if (payload.saved) {
    await neon.save.upsert({
      where: { userId_postId: { userId: payload.userId, postId: payload.postId } },
      update: {},
      create: {
        id: payload.id,
        userId: payload.userId,
        postId: payload.postId,
      },
    });
    return;
  }

  await neon.save.deleteMany({
    where: { userId: payload.userId, postId: payload.postId },
  });
}

async function syncShareCreate(payload) {
  if (!payload.id || !payload.userId || !payload.postId) return;
  await neon.share.upsert({
    where: { id: payload.id },
    update: {},
    create: {
      id: payload.id,
      userId: payload.userId,
      postId: payload.postId,
    },
  });
}

async function syncCommentCreate(payload) {
  const comment = payload.comment;
  if (!comment?.id) return;

  await neon.comment.upsert({
    where: { id: comment.id },
    update: {
      text: comment.text || "",
      updatedAt: toDate(comment.updatedAt),
      parentId: comment.parentId || null,
    },
    create: {
      id: comment.id,
      postId: comment.postId,
      authorId: comment.authorId,
      text: comment.text || "",
      parentId: comment.parentId || null,
      createdAt: toDate(comment.createdAt),
      updatedAt: toDate(comment.updatedAt),
    },
  });
}

async function syncCommentUpdate(payload) {
  if (!payload.id) return;
  await neon.comment.update({
    where: { id: payload.id },
    data: {
      text: payload.text || "",
      updatedAt: toDate(payload.updatedAt),
    },
  });
}

async function syncCommentDelete(payload) {
  if (!payload.id) return;
  await neon.comment.deleteMany({ where: { id: payload.id } });
}

async function syncCommentLikeToggle(payload) {
  if (!payload.userId || !payload.commentId) return;

  if (payload.liked) {
    await neon.like.upsert({
      where: {
        userId_commentId: { userId: payload.userId, commentId: payload.commentId },
      },
      update: {},
      create: {
        id: payload.id,
        userId: payload.userId,
        commentId: payload.commentId,
      },
    });
    return;
  }

  await neon.like.deleteMany({
    where: { userId: payload.userId, commentId: payload.commentId },
  });
}

async function syncPostViewCreate(payload) {
  if (!payload.userId || String(payload.userId).startsWith("guest:")) return;

  const viewedAt = toDate(payload.viewedAt);
  try {
    await neon.postView.create({
      data: {
        userId: payload.userId,
        postId: payload.postId || null,
        articleId: payload.articleId || null,
        viewedAt,
      },
    });
  } catch (error) {
    if (error?.code !== "P2002") throw error;
  }
}

async function syncPollVote(payload) {
  if (!payload.optionId || !payload.userId) return;
  await neon.pollOption.update({
    where: { id: payload.optionId },
    data: {
      votedUsers: {
        connect: { id: payload.userId },
      },
    },
  });
}

async function applyJob(job) {
  const payload = JSON.parse(job.payload || "{}");
  const type = `${job.entity}:${job.action}`;

  switch (type) {
    case "post:create":
      return syncPostCreate(payload);
    case "post:update":
      return syncPostUpdate(payload);
    case "post:delete":
      return deletePostInNeon(payload.id);
    case "like:toggle":
      return syncLikeToggle(payload);
    case "save:toggle":
      return syncSaveToggle(payload);
    case "share:create":
      return syncShareCreate(payload);
    case "comment:create":
      return syncCommentCreate(payload);
    case "comment:update":
      return syncCommentUpdate(payload);
    case "comment:delete":
      return syncCommentDelete(payload);
    case "commentLike:toggle":
      return syncCommentLikeToggle(payload);
    case "postView:create":
      return syncPostViewCreate(payload);
    case "poll:vote":
      return syncPollVote(payload);
    default:
      console.warn(`Unknown sync job type: ${type}`);
  }
}

async function syncOnce(options = {}) {
  if (localOnly) return { processed: 0, skipped: "local-only-mode" };

  if (running || !local.isReady()) {
    return { processed: 0, skipped: running ? "already-running" : "local-db-not-ready" };
  }

  running = true;
  const batchSize = Number(options.batchSize || process.env.HYBRID_SYNC_BATCH_SIZE || DEFAULT_BATCH_SIZE);
  const maxAttempts = Number(options.maxAttempts || process.env.HYBRID_SYNC_MAX_ATTEMPTS || DEFAULT_MAX_ATTEMPTS);
  let processed = 0;

  try {
    const jobs = local.getPendingSyncJobs(batchSize, maxAttempts);
    for (const job of jobs) {
      try {
        await applyJob(job);
        local.markJobSynced(job.id);
        processed += 1;
      } catch (error) {
        local.markJobFailed(job.id, error);
        console.error(`Hybrid sync failed for ${job.entity}:${job.action}`, error.message);
      }
    }

    local.cleanupSyncedJobs();
    return { processed };
  } finally {
    running = false;
  }
}

function startSyncEngine() {
  if (localOnly) {
    console.log("Hybrid sync engine disabled because DATABASE_MODE=local.");
    return null;
  }

  if (process.env.HYBRID_DB_ENABLED === "false") {
    console.log("Hybrid sync engine disabled by HYBRID_DB_ENABLED=false");
    return null;
  }

  if (!local.isReady()) {
    console.warn("Hybrid sync engine not started because local SQLite is not ready.");
    return null;
  }

  if (timer) return timer;

  const intervalMs = Number(process.env.HYBRID_SYNC_INTERVAL_MS || DEFAULT_INTERVAL_MS);
  timer = setInterval(() => {
    syncOnce().catch((error) => console.error("Hybrid sync loop error:", error));
  }, intervalMs);

  syncOnce().catch((error) => console.error("Initial hybrid sync failed:", error));
  console.log(`Hybrid sync engine started; interval=${intervalMs}ms`);
  return timer;
}

module.exports = {
  startSyncEngine,
  syncOnce,
};
