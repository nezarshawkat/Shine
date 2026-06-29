const local = require("../db/local");
const neon = require("../db/neon");

const DEFAULT_REFRESH_MS = 60000;
const DEFAULT_BOOTSTRAP_LIMIT = 100;
const localOnly =
  process.env.DATABASE_MODE === "local" ||
  process.env.LOCAL_ONLY_DB === "true" ||
  !process.env.DATABASE_URL;

let refreshingFeed = false;

function toIso(value) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function parseJson(value, fallback) {
  if (value === null || value === undefined || value === "") return fallback;
  if (Array.isArray(value) || typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function json(value) {
  return JSON.stringify(value ?? null);
}

function boolInt(value) {
  return value ? 1 : 0;
}

function intBool(value) {
  return Boolean(Number(value || 0));
}

function countsFromPost(post, fallback = {}) {
  return {
    likesCount: Number(post.likesCount ?? post._count?.likes ?? fallback.likesCount ?? 0),
    commentsCount: Number(post.commentsCount ?? post._count?.comments ?? fallback.commentsCount ?? 0),
    sharesCount: Number(post.sharesCount ?? post._count?.shares ?? fallback.sharesCount ?? 0),
    viewsCount: Number(post.viewsCount ?? post._count?.views ?? fallback.viewsCount ?? 0),
    savesCount: Number(post.savesCount ?? post._count?.saves ?? fallback.savesCount ?? 0),
  };
}

function visiblePostWhere(userId) {
  return {
    AND: [
      {
        OR: [
          { communityId: null },
          { community: { status: "PUBLIC" } },
          ...(userId ? [{ community: { communityMembers: { some: { userId } } } }] : []),
        ],
      },
      ...(userId
        ? [
            { author: { blockedUsers: { none: { blockedId: userId } } } },
            { author: { blockedBy: { none: { blockerId: userId } } } },
          ]
        : []),
    ],
  };
}

function postInclude(userId) {
  return {
    author: true,
    media: true,
    sources: true,
    community: true,
    pollOptions: {
      include: {
        votedUsers: { select: { id: true } },
        _count: { select: { votedUsers: true } },
      },
    },
    parentPost: {
      include: {
        author: true,
        media: true,
      },
    },
    likes: userId ? { where: { userId } } : false,
    saves: userId ? { where: { userId } } : false,
    _count: {
      select: {
        likes: true,
        comments: true,
        shares: true,
        views: true,
        saves: true,
      },
    },
  };
}

function formatCloudPost(post, userId) {
  if (!post) return null;
  const counts = countsFromPost(post);
  return {
    ...post,
    isLiked: Boolean(userId && post.likes?.length),
    isSaved: Boolean(userId && post.saves?.length),
    viewsCount: counts.viewsCount,
    likesCount: counts.likesCount,
    commentsCount: counts.commentsCount,
    sharesCount: counts.sharesCount,
    savesCount: counts.savesCount,
  };
}

function formatCloudComment(comment, userId) {
  if (!comment) return null;
  return {
    ...comment,
    _count: {
      likes: comment._count?.likes || 0,
      replies: comment._count?.replies || 0,
    },
    isLiked: Boolean(userId && comment.likes?.length),
  };
}

function upsertUser(db, user) {
  if (!db || !user?.id) return;

  db.prepare(
    `INSERT INTO User (
      id, email, username, name, password, googleId, provider, image, description,
      isAuthorized, isSupporter, roleLevel, createdAt, updatedAt, data
    )
    VALUES (
      @id, @email, @username, @name, @password, @googleId, @provider, @image, @description,
      @isAuthorized, @isSupporter, @roleLevel, @createdAt, @updatedAt, @data
    )
    ON CONFLICT(id) DO UPDATE SET
      email = excluded.email,
      username = excluded.username,
      name = excluded.name,
      password = excluded.password,
      googleId = excluded.googleId,
      provider = excluded.provider,
      image = excluded.image,
      description = excluded.description,
      isAuthorized = excluded.isAuthorized,
      isSupporter = excluded.isSupporter,
      roleLevel = excluded.roleLevel,
      createdAt = excluded.createdAt,
      updatedAt = excluded.updatedAt,
      data = excluded.data`
  ).run({
    id: user.id,
    email: user.email || null,
    username: user.username || null,
    name: user.name || user.username || "Unknown User",
    password: user.password || null,
    googleId: user.googleId || null,
    provider: user.provider || null,
    image: user.image || null,
    description: user.description || null,
    isAuthorized: boolInt(user.isAuthorized),
    isSupporter: boolInt(user.isSupporter),
    roleLevel: user.roleLevel || "Starter",
    createdAt: toIso(user.createdAt),
    updatedAt: toIso(user.updatedAt),
    data: json(user),
  });
}

function upsertCommunity(db, community) {
  if (!db || !community?.id) return;

  db.prepare(
    `INSERT INTO Community (
      id, name, interestsJson, slogan, discription, icon, banner, status,
      featured, engagement, creatorId, data
    )
    VALUES (
      @id, @name, @interestsJson, @slogan, @discription, @icon, @banner, @status,
      @featured, @engagement, @creatorId, @data
    )
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      interestsJson = excluded.interestsJson,
      slogan = excluded.slogan,
      discription = excluded.discription,
      icon = excluded.icon,
      banner = excluded.banner,
      status = excluded.status,
      featured = excluded.featured,
      engagement = excluded.engagement,
      creatorId = excluded.creatorId,
      data = excluded.data`
  ).run({
    id: community.id,
    name: community.name || "Community",
    interestsJson: json(community.interests || []),
    slogan: community.slogan || null,
    discription: community.discription || null,
    icon: community.icon || null,
    banner: community.banner || null,
    status: community.status || "PUBLIC",
    featured: boolInt(community.featured),
    engagement: Number(community.engagement || 0),
    creatorId: community.creatorId || community.creator?.id || null,
    data: json(community),
  });
}

function upsertPostRow(db, post) {
  if (!db || !post?.id) return;

  const existing = db.prepare("SELECT * FROM Post WHERE id = ?").get(post.id);
  const counts = countsFromPost(post, existing || {});
  const createdAt = toIso(post.createdAt) || existing?.createdAt || local.nowIso();
  const updatedAt = toIso(post.updatedAt) || existing?.updatedAt || createdAt;

  db.prepare(
    `INSERT INTO Post (
      id, type, text, keywordsJson, status, featured, engagement, createdAt, updatedAt,
      authorId, communityId, parentId, likesCount, commentsCount, sharesCount,
      viewsCount, savesCount, deletedAt, data
    )
    VALUES (
      @id, @type, @text, @keywordsJson, @status, @featured, @engagement, @createdAt, @updatedAt,
      @authorId, @communityId, @parentId, @likesCount, @commentsCount, @sharesCount,
      @viewsCount, @savesCount, NULL, @data
    )
    ON CONFLICT(id) DO UPDATE SET
      type = excluded.type,
      text = excluded.text,
      keywordsJson = excluded.keywordsJson,
      status = excluded.status,
      featured = excluded.featured,
      engagement = excluded.engagement,
      createdAt = excluded.createdAt,
      updatedAt = excluded.updatedAt,
      authorId = excluded.authorId,
      communityId = excluded.communityId,
      parentId = excluded.parentId,
      likesCount = excluded.likesCount,
      commentsCount = excluded.commentsCount,
      sharesCount = excluded.sharesCount,
      viewsCount = excluded.viewsCount,
      savesCount = excluded.savesCount,
      deletedAt = NULL,
      data = excluded.data`
  ).run({
    id: post.id,
    type: post.type || "opinion",
    text: post.text || "",
    keywordsJson: json(post.keywords || []),
    status: post.status || "ACTIVE",
    featured: boolInt(post.featured),
    engagement: Number(post.engagement || 0),
    createdAt,
    updatedAt,
    authorId: post.authorId || post.author?.id,
    communityId: post.communityId || post.community?.id || null,
    parentId: post.parentId || post.parentPost?.id || null,
    ...counts,
    data: json(post),
  });
}

function upsertMedia(db, media) {
  if (!db || !media?.id) return;

  db.prepare(
    `INSERT INTO Media (id, url, type, size, createdAt, uploaderId, postId, articleId, data)
     VALUES (@id, @url, @type, @size, @createdAt, @uploaderId, @postId, @articleId, @data)
     ON CONFLICT(id) DO UPDATE SET
      url = excluded.url,
      type = excluded.type,
      size = excluded.size,
      createdAt = excluded.createdAt,
      uploaderId = excluded.uploaderId,
      postId = excluded.postId,
      articleId = excluded.articleId,
      data = excluded.data`
  ).run({
    id: media.id,
    url: media.url,
    type: media.type || "image",
    size: Number(media.size || 0),
    createdAt: toIso(media.createdAt) || local.nowIso(),
    uploaderId: media.uploaderId || null,
    postId: media.postId || null,
    articleId: media.articleId || null,
    data: json(media),
  });
}

function upsertSource(db, source) {
  if (!db || !source?.id) return;

  db.prepare(
    `INSERT INTO Source (id, name, link, postId, articleId, data)
     VALUES (@id, @name, @link, @postId, @articleId, @data)
     ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      link = excluded.link,
      postId = excluded.postId,
      articleId = excluded.articleId,
      data = excluded.data`
  ).run({
    id: source.id,
    name: source.name || "",
    link: source.link || "",
    postId: source.postId || null,
    articleId: source.articleId || null,
    data: json(source),
  });
}

function upsertPollOption(db, option) {
  if (!db || !option?.id) return;
  const votedUserIds = option.votedUserIds || option.votedUsers?.map((user) => user.id) || [];

  db.prepare(
    `INSERT INTO PollOption (id, text, votes, postId, votedUserIdsJson, data)
     VALUES (@id, @text, @votes, @postId, @votedUserIdsJson, @data)
     ON CONFLICT(id) DO UPDATE SET
      text = excluded.text,
      votes = excluded.votes,
      postId = excluded.postId,
      votedUserIdsJson = excluded.votedUserIdsJson,
      data = excluded.data`
  ).run({
    id: option.id,
    text: option.text || "",
    votes: Number(option.votes ?? option._count?.votedUsers ?? votedUserIds.length ?? 0),
    postId: option.postId,
    votedUserIdsJson: json(votedUserIds),
    data: json(option),
  });

  for (const userId of votedUserIds) {
    db.prepare(
      `INSERT OR IGNORE INTO PollVote (id, postId, optionId, userId, createdAt)
       VALUES (@id, @postId, @optionId, @userId, @createdAt)`
    ).run({
      id: local.newId(),
      postId: option.postId,
      optionId: option.id,
      userId,
      createdAt: local.nowIso(),
    });
  }
}

function upsertLike(db, like) {
  if (!db || !like?.id || !like.userId) return;

  db.prepare(
    `INSERT OR IGNORE INTO LikeRecord (id, userId, postId, articleId, commentId, createdAt, data)
     VALUES (@id, @userId, @postId, @articleId, @commentId, @createdAt, @data)`
  ).run({
    id: like.id,
    userId: like.userId,
    postId: like.postId || null,
    articleId: like.articleId || null,
    commentId: like.commentId || null,
    createdAt: toIso(like.createdAt) || local.nowIso(),
    data: json(like),
  });
}

function upsertSave(db, save) {
  if (!db || !save?.id || !save.userId) return;

  db.prepare(
    `INSERT OR IGNORE INTO SaveRecord (id, userId, postId, articleId, createdAt, data)
     VALUES (@id, @userId, @postId, @articleId, @createdAt, @data)`
  ).run({
    id: save.id,
    userId: save.userId,
    postId: save.postId || null,
    articleId: save.articleId || null,
    createdAt: toIso(save.createdAt) || local.nowIso(),
    data: json(save),
  });
}

function upsertCommentRow(db, comment) {
  if (!db || !comment?.id) return;
  const existing = db.prepare("SELECT * FROM Comment WHERE id = ?").get(comment.id);

  db.prepare(
    `INSERT INTO Comment (
      id, postId, authorId, text, createdAt, updatedAt, parentId,
      likesCount, repliesCount, deletedAt, data
    )
    VALUES (
      @id, @postId, @authorId, @text, @createdAt, @updatedAt, @parentId,
      @likesCount, @repliesCount, NULL, @data
    )
    ON CONFLICT(id) DO UPDATE SET
      postId = excluded.postId,
      authorId = excluded.authorId,
      text = excluded.text,
      createdAt = excluded.createdAt,
      updatedAt = excluded.updatedAt,
      parentId = excluded.parentId,
      likesCount = excluded.likesCount,
      repliesCount = excluded.repliesCount,
      deletedAt = NULL,
      data = excluded.data`
  ).run({
    id: comment.id,
    postId: comment.postId,
    authorId: comment.authorId || comment.author?.id,
    text: comment.text || "",
    createdAt: toIso(comment.createdAt) || existing?.createdAt || local.nowIso(),
    updatedAt: toIso(comment.updatedAt) || existing?.updatedAt || local.nowIso(),
    parentId: comment.parentId || null,
    likesCount: Number(comment.likesCount ?? comment._count?.likes ?? existing?.likesCount ?? 0),
    repliesCount: Number(comment.repliesCount ?? comment._count?.replies ?? existing?.repliesCount ?? 0),
    data: json(comment),
  });
}

function mirrorPostGraph(post) {
  const db = local.getDb();
  if (!db || !post?.id) return;

  const tx = db.transaction(() => {
    if (post.author) upsertUser(db, post.author);
    if (post.community) upsertCommunity(db, post.community);

    if (post.parentPost) {
      if (post.parentPost.author) upsertUser(db, post.parentPost.author);
      upsertPostRow(db, post.parentPost);
      db.prepare("DELETE FROM Media WHERE postId = ?").run(post.parentPost.id);
      for (const media of post.parentPost.media || []) {
        upsertMedia(db, { ...media, postId: post.parentPost.id });
      }
    }

    upsertPostRow(db, post);

    if (Array.isArray(post.media)) {
      db.prepare("DELETE FROM Media WHERE postId = ?").run(post.id);
      for (const media of post.media) upsertMedia(db, { ...media, postId: post.id });
    }

    if (Array.isArray(post.sources)) {
      db.prepare("DELETE FROM Source WHERE postId = ?").run(post.id);
      for (const source of post.sources) upsertSource(db, { ...source, postId: post.id });
    }

    if (Array.isArray(post.pollOptions)) {
      db.prepare("DELETE FROM PollOption WHERE postId = ?").run(post.id);
      for (const option of post.pollOptions) upsertPollOption(db, { ...option, postId: post.id });
    }

    for (const like of post.likes || []) upsertLike(db, like);
    for (const save of post.saves || []) upsertSave(db, save);
  });

  tx();
}

function mirrorComments(postId, comments) {
  const db = local.getDb();
  if (!db) return;

  const tx = db.transaction(() => {
    db.prepare("UPDATE Comment SET deletedAt = ? WHERE postId = ?").run(local.nowIso(), postId);
    for (const comment of comments || []) {
      if (comment.author) upsertUser(db, comment.author);
      upsertCommentRow(db, { ...comment, postId });
      for (const like of comment.likes || []) upsertLike(db, { ...like, commentId: comment.id });
    }
    db.prepare("UPDATE Post SET commentsCount = ? WHERE id = ?").run(comments?.length || 0, postId);
  });
  tx();
  local.setMeta(`comments:${postId}:refreshedAt`, local.nowIso());
}

function formatUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    name: row.name,
    password: row.password,
    googleId: row.googleId,
    provider: row.provider,
    image: row.image,
    description: row.description,
    isAuthorized: intBool(row.isAuthorized),
    isSupporter: intBool(row.isSupporter),
    roleLevel: row.roleLevel || "Starter",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function formatCommunity(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    interests: parseJson(row.interestsJson, []),
    slogan: row.slogan,
    discription: row.discription,
    icon: row.icon,
    banner: row.banner,
    status: row.status,
    featured: intBool(row.featured),
    engagement: Number(row.engagement || 0),
    creatorId: row.creatorId,
  };
}

function formatLocalPost(row, userId, options = {}) {
  const db = local.getDb();
  if (!db || !row) return null;

  const author = formatUser(db.prepare("SELECT * FROM User WHERE id = ?").get(row.authorId));
  const community = row.communityId
    ? formatCommunity(db.prepare("SELECT * FROM Community WHERE id = ?").get(row.communityId))
    : null;
  const media = db.prepare("SELECT * FROM Media WHERE postId = ? ORDER BY createdAt ASC").all(row.id);
  const sources = db.prepare("SELECT * FROM Source WHERE postId = ?").all(row.id);
  const pollOptions = db.prepare("SELECT * FROM PollOption WHERE postId = ?").all(row.id).map((option) => {
    const votedUserIds = parseJson(option.votedUserIdsJson, []);
    return {
      id: option.id,
      text: option.text,
      votes: Number(option.votes || votedUserIds.length || 0),
      postId: option.postId,
      votedUsers: votedUserIds.map((id) => ({ id })),
      _count: { votedUsers: Number(option.votes || votedUserIds.length || 0) },
    };
  });

  const parentPost = row.parentId && !options.skipParent
    ? formatLocalPost(db.prepare("SELECT * FROM Post WHERE id = ? AND deletedAt IS NULL").get(row.parentId), userId, {
        skipParent: true,
      })
    : null;

  const like = userId
    ? db.prepare("SELECT * FROM LikeRecord WHERE postId = ? AND userId = ?").get(row.id, userId)
    : null;
  const save = userId
    ? db.prepare("SELECT * FROM SaveRecord WHERE postId = ? AND userId = ?").get(row.id, userId)
    : null;

  return {
    id: row.id,
    type: row.type,
    text: row.text,
    keywords: parseJson(row.keywordsJson, []),
    status: row.status,
    featured: intBool(row.featured),
    engagement: Number(row.engagement || 0),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    authorId: row.authorId,
    communityId: row.communityId,
    parentId: row.parentId,
    author,
    community,
    media,
    sources,
    pollOptions,
    parentPost,
    likes: like ? [like] : [],
    saves: save ? [save] : [],
    _count: {
      likes: Number(row.likesCount || 0),
      comments: Number(row.commentsCount || 0),
      shares: Number(row.sharesCount || 0),
      views: Number(row.viewsCount || 0),
      saves: Number(row.savesCount || 0),
    },
    isLiked: Boolean(like),
    isSaved: Boolean(save),
    viewsCount: Number(row.viewsCount || 0),
    likesCount: Number(row.likesCount || 0),
    commentsCount: Number(row.commentsCount || 0),
    sharesCount: Number(row.sharesCount || 0),
    savesCount: Number(row.savesCount || 0),
  };
}

function formatLocalComment(row, userId) {
  const db = local.getDb();
  if (!db || !row) return null;
  const author = formatUser(db.prepare("SELECT * FROM User WHERE id = ?").get(row.authorId));
  const like = userId
    ? db.prepare("SELECT * FROM LikeRecord WHERE commentId = ? AND userId = ?").get(row.id, userId)
    : null;

  return {
    id: row.id,
    postId: row.postId,
    authorId: row.authorId,
    text: row.text,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    parentId: row.parentId,
    author,
    _count: {
      likes: Number(row.likesCount || 0),
      replies: Number(row.repliesCount || 0),
    },
    isLiked: Boolean(like),
  };
}

function selectLocalPosts({ page, pageSize, userId, communityId }) {
  const db = local.getDb();
  if (!db) return [];

  const offset = (page - 1) * pageSize;
  const params = { limit: pageSize, offset, userId: userId || "", communityId: communityId || null };
  const communityFilter = communityId ? "AND p.communityId = @communityId" : "";

  return db
    .prepare(
      `SELECT p.*
       FROM Post p
       LEFT JOIN Community c ON c.id = p.communityId
       WHERE p.deletedAt IS NULL
         ${communityFilter}
         AND (
          p.communityId IS NULL
          OR COALESCE(c.status, 'PUBLIC') = 'PUBLIC'
          OR p.authorId = @userId
        )
       ORDER BY datetime(p.createdAt) DESC
       LIMIT @limit OFFSET @offset`
    )
    .all(params);
}

function countLocalPosts({ userId, communityId }) {
  const db = local.getDb();
  if (!db) return 0;
  const communityFilter = communityId ? "AND p.communityId = @communityId" : "";

  return Number(
    db
      .prepare(
        `SELECT COUNT(*) AS count
         FROM Post p
         LEFT JOIN Community c ON c.id = p.communityId
         WHERE p.deletedAt IS NULL
          ${communityFilter}
          AND (
            p.communityId IS NULL
            OR COALESCE(c.status, 'PUBLIC') = 'PUBLIC'
            OR p.authorId = @userId
          )`
      )
      .get({ userId: userId || "", communityId: communityId || null })?.count || 0
  );
}

async function ensureLocalUser(userId) {
  const db = local.getDb();
  if (!db || !userId) return null;

  const existing = db.prepare("SELECT * FROM User WHERE id = ?").get(userId);
  if (existing) return formatUser(existing);

  if (!localOnly) {
    try {
    const user = await neon.user.findUnique({ where: { id: userId } });
    if (user) {
      upsertUser(db, user);
      return user;
    }
    } catch (error) {
      console.warn("Could not hydrate local user from Neon:", error.message);
    }
  }

  const placeholder = {
    id: userId,
    email: null,
    username: "offline-user",
    name: "Offline User",
    isAuthorized: false,
    isSupporter: false,
    roleLevel: "Starter",
    createdAt: local.nowIso(),
    updatedAt: local.nowIso(),
  };
  upsertUser(db, placeholder);
  return placeholder;
}

async function refreshPostFromNeon(id, userId = null) {
  if (localOnly) return null;
  const post = await neon.post.findUnique({
    where: { id },
    include: postInclude(userId),
  });
  if (post) mirrorPostGraph(post);
  return post;
}

async function fetchCloudPosts({ page, pageSize, userId, communityId }) {
  if (localOnly) return [];
  const where = communityId ? { communityId } : visiblePostWhere(userId);
  const posts = await neon.post.findMany({
    where,
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: { createdAt: "desc" },
    include: postInclude(userId),
  });

  for (const post of posts) mirrorPostGraph(post);
  return posts.map((post) => formatCloudPost(post, userId));
}

async function refreshRecentPostsFromNeon(limit = DEFAULT_BOOTSTRAP_LIMIT) {
  if (localOnly) return 0;
  const posts = await neon.post.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: postInclude(null),
  });

  for (const post of posts) mirrorPostGraph(post);
  local.setMeta("feedRefreshedAt", local.nowIso());
  return posts.length;
}

function scheduleFeedRefresh() {
  if (localOnly) return;
  if (!local.isReady() || refreshingFeed) return;

  const refreshMs = Number(process.env.HYBRID_REFRESH_MS || DEFAULT_REFRESH_MS);
  const last = local.getMeta("feedRefreshedAt");
  if (last && Date.now() - new Date(last).getTime() < refreshMs) return;

  refreshingFeed = true;
  refreshRecentPostsFromNeon(Number(process.env.HYBRID_BOOTSTRAP_POST_LIMIT || DEFAULT_BOOTSTRAP_LIMIT))
    .catch((error) => console.error("Hybrid feed refresh failed:", error.message))
    .finally(() => {
      refreshingFeed = false;
    });
}

async function getPosts({ page = 1, pageSize = 10, userId = null } = {}) {
  page = Number.isFinite(Number(page)) && Number(page) > 0 ? Number(page) : 1;
  pageSize = Number.isFinite(Number(pageSize)) && Number(pageSize) > 0 ? Number(pageSize) : 10;

  const db = local.getDb();
  if (db) {
    const rows = selectLocalPosts({ page, pageSize, userId });
    if (rows.length) {
      scheduleFeedRefresh();
      return rows.map((row) => formatLocalPost(row, userId));
    }
  }

  return fetchCloudPosts({ page, pageSize, userId });
}

async function getSinglePost(id, userId = null) {
  const db = local.getDb();
  if (db) {
    let row = db.prepare("SELECT * FROM Post WHERE id = ? AND deletedAt IS NULL").get(id);
    if (row) return formatLocalPost(row, userId);

    const cloudPost = await refreshPostFromNeon(id, userId);
    row = db.prepare("SELECT * FROM Post WHERE id = ? AND deletedAt IS NULL").get(id);
    if (row) return formatLocalPost(row, userId);
    return formatCloudPost(cloudPost, userId);
  }

  return formatCloudPost(await refreshPostFromNeon(id, userId), userId);
}

async function getTrends(limit = 10) {
  const db = local.getDb();
  const trendLimit = Math.max(1, Math.min(Number(limit) || 10, 20));
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  if (db) {
    const rows = db
      .prepare("SELECT text, keywordsJson, createdAt, viewsCount, likesCount FROM Post WHERE deletedAt IS NULL AND datetime(createdAt) > datetime(?)")
      .all(thirtyDaysAgo);

    if (rows.length) {
      const keywordScores = new Map();
      const hashtagScores = new Map();

      for (const row of rows) {
        const ageDays = Math.max(0, (Date.now() - new Date(row.createdAt).getTime()) / 86400000);
        const engagementWeight = Math.log1p(Number(row.viewsCount || 0)) * 0.3 + Math.log1p(Number(row.likesCount || 0)) * 0.8;
        const recencyWeight = Math.max(0, 1 - ageDays / 30);
        const seenInPost = new Set();
        for (const keyword of parseJson(row.keywordsJson, [])) {
          const label = String(keyword || "").replace(/^#+/, "").replace(/\s+/g, " ").trim();
          const key = label.toLocaleLowerCase();
          if (!key || key.length < 2 || seenInPost.has(key)) continue;
          seenInPost.add(key);
          const current = keywordScores.get(key) || { label, posts: 0, score: 0 };
          current.posts += 1;
          current.score += 1 + engagementWeight + recencyWeight;
          keywordScores.set(key, current);
        }

        const tags = new Set(row.text?.match(/#[\p{L}\p{N}_]+/gu) || []);
        for (const tag of tags) {
          const key = tag.slice(1).toLowerCase();
          const current = hashtagScores.get(key) || { name: key, postCount: 0, totalViews: 0, score: 0 };
          current.postCount += 1;
          current.totalViews += Number(row.viewsCount || 0);
          current.score += 1 + engagementWeight + recencyWeight;
          hashtagScores.set(key, current);
        }
      }

      return {
        viralKeywords: [...keywordScores.entries()]
          .sort((a, b) => b[1].score - a[1].score || b[1].posts - a[1].posts || a[1].label.localeCompare(b[1].label))
          .slice(0, trendLimit)
          .map(([, value]) => value.label),
        trendingHashtags: [...hashtagScores.values()]
          .sort((a, b) => b.postCount - a.postCount || b.score - a.score || a.name.localeCompare(b.name))
          .slice(0, trendLimit)
          .map((tag) => {
            const count = tag.postCount;
            const formattedCount = count >= 1000 ? `${(count / 1000).toFixed(1)}K` : `${count}`;
            return {
              name: tag.name,
              count,
              postCount: count,
              formattedCount,
              totalViews: tag.totalViews,
              rawCount: count,
              uses: count,
              views: formattedCount,
            };
          }),
      };
    }
  }

  if (localOnly) {
    return {
      viralKeywords: [],
      trendingHashtags: [],
    };
  }

  const viralKeywordsRaw = await neon.$queryRaw`
    SELECT unnest(keywords) as word, COUNT(*) as usage_count
    FROM "Post"
    WHERE "createdAt" > ${new Date(thirtyDaysAgo)}
    GROUP BY word
    ORDER BY usage_count DESC
    LIMIT ${trendLimit}
  `;

  const trendingPosts = await neon.post.findMany({
    where: { createdAt: { gte: new Date(thirtyDaysAgo) } },
    select: { text: true },
  });

  const hashtagMap = {};
  trendingPosts.forEach((post) => {
    const tags = new Set(post.text?.match(/#[\p{L}\p{N}_]+/gu) || []);
    tags.forEach((tag) => {
      const key = tag.slice(1).toLowerCase();
      hashtagMap[key] = (hashtagMap[key] || 0) + 1;
    });
  });

  return {
    viralKeywords: viralKeywordsRaw.map((item) => item.word).filter(Boolean),
    trendingHashtags: Object.entries(hashtagMap)
      .map(([name, count]) => ({
        name,
        count,
        postCount: count,
        formattedCount: count >= 1000 ? `${(count / 1000).toFixed(1)}K` : `${count}`,
        rawCount: count,
        uses: count,
        views: count >= 1000 ? `${(count / 1000).toFixed(1)}K` : `${count}`,
      }))
      .sort((a, b) => b.rawCount - a.rawCount)
      .slice(0, trendLimit),
  };
}

function normalizePollOptionsForStorage(values) {
  const options = (Array.isArray(values) ? values : [])
    .map((option) => String(option?.text || option || "").trim().slice(0, 120))
    .filter(Boolean);
  const uniqueOptions = [...new Set(options)].slice(0, 4);
  return uniqueOptions.length >= 2 ? uniqueOptions : ["Agree", "Disagree", "Not sure"];
}

async function createPostInNeon({ text, type, authorId, communityId, parentId, keywords, sources, uploadedMedia, files, pollOptions }) {
  if (localOnly) {
    throw new Error("Local SQLite is not ready. Install better-sqlite3 and set LOCAL_DATABASE_PATH.");
  }

  const post = await neon.post.create({
    data: {
      text: text || "",
      type,
      authorId,
      communityId: communityId && communityId !== "" ? communityId : null,
      parentId: parentId || null,
      keywords: type === "poll" ? [] : (keywords || []),
      sources: { create: sources || [] },
      media: {
        create: (uploadedMedia || []).map((asset, index) => ({
          url: asset.url,
          type: files?.[index]?.mimetype?.startsWith("image") ? "image" : "video",
          size: files?.[index]?.size || 0,
          uploaderId: authorId,
        })),
      },
      pollOptions:
        type === "poll"
          ? {
              create: normalizePollOptionsForStorage(pollOptions).map((text) => ({ text })),
            }
          : undefined,
    },
    include: postInclude(authorId),
  });
  mirrorPostGraph(post);
  return formatCloudPost(post, authorId);
}

function normalizeSource(source) {
  if (typeof source === "string") {
    return { id: local.newId(), name: source, link: source };
  }
  return {
    id: source.id || local.newId(),
    name: source.name || "",
    link: source.link || "",
  };
}

async function createPost(input) {
  const db = local.getDb();
  if (!db) return createPostInNeon(input);

  const now = local.nowIso();
  const id = local.newId();
  await ensureLocalUser(input.authorId);

  if (input.parentId) {
    try {
      await refreshPostFromNeon(input.parentId, input.authorId);
    } catch {
      // Parent hydration is helpful, not required for offline creation.
    }
  }

  const post = {
    id,
    text: input.text || "",
    type: input.type,
    authorId: input.authorId,
    communityId: input.communityId && input.communityId !== "" ? input.communityId : null,
    parentId: input.parentId || null,
    keywords: input.type === "poll" ? [] : (input.keywords || []),
    status: "ACTIVE",
    featured: false,
    engagement: 0,
    createdAt: now,
    updatedAt: now,
    likesCount: 0,
    commentsCount: 0,
    sharesCount: 0,
    viewsCount: 0,
    savesCount: 0,
  };

  const sources = (input.sources || []).map(normalizeSource).map((source) => ({ ...source, postId: id }));
  const media = (input.uploadedMedia || []).map((asset, index) => ({
    id: local.newId(),
    url: asset.url,
    type: input.files?.[index]?.mimetype?.startsWith("image") ? "image" : "video",
    size: input.files?.[index]?.size || 0,
    createdAt: now,
    uploaderId: input.authorId,
    postId: id,
  }));
  const pollOptions =
    input.type === "poll"
      ? normalizePollOptionsForStorage(input.pollOptions).map((text) => ({
          id: local.newId(),
          text,
          votes: 0,
          postId: id,
          votedUserIds: [],
        }))
      : [];

  const tx = db.transaction(() => {
    upsertPostRow(db, post);
    sources.forEach((source) => upsertSource(db, source));
    media.forEach((item) => upsertMedia(db, item));
    pollOptions.forEach((option) => upsertPollOption(db, option));
    local.queueSync("post", "create", { post, sources, media, pollOptions });
  });
  tx();

  return formatLocalPost(db.prepare("SELECT * FROM Post WHERE id = ?").get(id), input.authorId);
}

async function updatePost(id, text, userId = null) {
  const db = local.getDb();
  if (!db) {
    if (localOnly) {
      throw new Error("Local SQLite is not ready. Install better-sqlite3 and set LOCAL_DATABASE_PATH.");
    }

    const updatedPost = await neon.post.update({
      where: { id },
      data: { text },
      include: postInclude(userId),
    });
    mirrorPostGraph(updatedPost);
    return formatCloudPost(updatedPost, userId);
  }

  let row = db.prepare("SELECT * FROM Post WHERE id = ? AND deletedAt IS NULL").get(id);
  if (!row) {
    await refreshPostFromNeon(id, userId);
    row = db.prepare("SELECT * FROM Post WHERE id = ? AND deletedAt IS NULL").get(id);
  }
  if (!row) return null;

  const updatedAt = local.nowIso();
  db.prepare("UPDATE Post SET text = ?, updatedAt = ? WHERE id = ?").run(text || "", updatedAt, id);
  local.queueSync("post", "update", { id, text: text || "", updatedAt });
  return formatLocalPost(db.prepare("SELECT * FROM Post WHERE id = ?").get(id), userId);
}

async function deletePost(id) {
  const db = local.getDb();
  if (!db) {
    if (localOnly) {
      throw new Error("Local SQLite is not ready. Install better-sqlite3 and set LOCAL_DATABASE_PATH.");
    }

    await neon.$transaction(async (tx) => {
      await tx.adminReport.deleteMany({ where: { postId: id } });
      await tx.share.deleteMany({ where: { postId: id } });
      await tx.postView.deleteMany({ where: { postId: id } });
      await tx.media.deleteMany({ where: { postId: id } });
      await tx.pollOption.deleteMany({ where: { postId: id } });
      await tx.post.updateMany({ where: { parentId: id }, data: { parentId: null } });
      await tx.post.delete({ where: { id } });
    });
    return true;
  }

  let row = db.prepare("SELECT id FROM Post WHERE id = ? AND deletedAt IS NULL").get(id);
  if (!row) {
    const cloudPost = await refreshPostFromNeon(id);
    row = cloudPost ? db.prepare("SELECT id FROM Post WHERE id = ? AND deletedAt IS NULL").get(id) : null;
  }
  if (!row) return false;

  const tx = db.transaction(() => {
    db.prepare("UPDATE Post SET deletedAt = ? WHERE id = ?").run(local.nowIso(), id);
    db.prepare("UPDATE Post SET parentId = NULL WHERE parentId = ?").run(id);
    local.queueSync("post", "delete", { id });
  });
  tx();
  return true;
}

async function toggleLike(postId, userId) {
  const db = local.getDb();
  if (!db) {
    if (localOnly) {
      throw new Error("Local SQLite is not ready. Install better-sqlite3 and set LOCAL_DATABASE_PATH.");
    }

    const existing = await neon.like.findFirst({ where: { postId, userId } });
    if (existing) await neon.like.delete({ where: { id: existing.id } });
    else await neon.like.create({ data: { postId, userId } });
    const likesCount = await neon.like.count({ where: { postId } });
    return { status: !existing, liked: !existing, likesCount };
  }

  await ensureLocalUser(userId);
  let post = db.prepare("SELECT * FROM Post WHERE id = ? AND deletedAt IS NULL").get(postId);
  if (!post) {
    await refreshPostFromNeon(postId, userId);
    post = db.prepare("SELECT * FROM Post WHERE id = ? AND deletedAt IS NULL").get(postId);
  }
  if (!post) throw new Error("Post not found");

  const existing = db.prepare("SELECT * FROM LikeRecord WHERE postId = ? AND userId = ?").get(postId, userId);
  const liked = !existing;
  const likeId = existing?.id || local.newId();

  const tx = db.transaction(() => {
    if (existing) {
      db.prepare("DELETE FROM LikeRecord WHERE id = ?").run(existing.id);
      db.prepare("UPDATE Post SET likesCount = CASE WHEN likesCount > 0 THEN likesCount - 1 ELSE 0 END WHERE id = ?").run(postId);
    } else {
      db.prepare(
        `INSERT OR IGNORE INTO LikeRecord (id, userId, postId, createdAt, data)
         VALUES (?, ?, ?, ?, ?)`
      ).run(likeId, userId, postId, local.nowIso(), json({ id: likeId, userId, postId }));
      db.prepare("UPDATE Post SET likesCount = likesCount + 1 WHERE id = ?").run(postId);
    }
    local.queueSync("like", "toggle", { id: likeId, userId, postId, liked });
  });
  tx();

  const likesCount = db.prepare("SELECT likesCount FROM Post WHERE id = ?").get(postId)?.likesCount || 0;
  return { status: liked, liked, likesCount };
}

async function toggleSave(postId, userId) {
  const db = local.getDb();
  if (!db) {
    if (localOnly) {
      throw new Error("Local SQLite is not ready. Install better-sqlite3 and set LOCAL_DATABASE_PATH.");
    }

    const existing = await neon.save.findFirst({ where: { postId, userId } });
    if (existing) await neon.save.delete({ where: { id: existing.id } });
    else await neon.save.create({ data: { postId, userId } });
    const savesCount = await neon.save.count({ where: { postId } });
    return { status: !existing, saved: !existing, savesCount, savedCount: savesCount };
  }

  await ensureLocalUser(userId);
  let post = db.prepare("SELECT * FROM Post WHERE id = ? AND deletedAt IS NULL").get(postId);
  if (!post) {
    await refreshPostFromNeon(postId, userId);
    post = db.prepare("SELECT * FROM Post WHERE id = ? AND deletedAt IS NULL").get(postId);
  }
  if (!post) throw new Error("Post not found");

  const existing = db.prepare("SELECT * FROM SaveRecord WHERE postId = ? AND userId = ?").get(postId, userId);
  const saved = !existing;
  const saveId = existing?.id || local.newId();

  const tx = db.transaction(() => {
    if (existing) {
      db.prepare("DELETE FROM SaveRecord WHERE id = ?").run(existing.id);
      db.prepare("UPDATE Post SET savesCount = CASE WHEN savesCount > 0 THEN savesCount - 1 ELSE 0 END WHERE id = ?").run(postId);
    } else {
      db.prepare(
        `INSERT OR IGNORE INTO SaveRecord (id, userId, postId, createdAt, data)
         VALUES (?, ?, ?, ?, ?)`
      ).run(saveId, userId, postId, local.nowIso(), json({ id: saveId, userId, postId }));
      db.prepare("UPDATE Post SET savesCount = savesCount + 1 WHERE id = ?").run(postId);
    }
    local.queueSync("save", "toggle", { id: saveId, userId, postId, saved });
  });
  tx();

  const savesCount = db.prepare("SELECT savesCount FROM Post WHERE id = ?").get(postId)?.savesCount || 0;
  return { status: saved, saved, savesCount, savedCount: savesCount };
}

async function sharePost(postId, userId) {
  const db = local.getDb();
  if (!db) {
    if (localOnly) {
      throw new Error("Local SQLite is not ready. Install better-sqlite3 and set LOCAL_DATABASE_PATH.");
    }

    await neon.share.create({ data: { postId, userId } });
    const sharesCount = await neon.share.count({ where: { postId } });
    return { status: true, sharesCount, shares: sharesCount };
  }

  await ensureLocalUser(userId);
  let post = db.prepare("SELECT * FROM Post WHERE id = ? AND deletedAt IS NULL").get(postId);
  if (!post) {
    await refreshPostFromNeon(postId, userId);
    post = db.prepare("SELECT * FROM Post WHERE id = ? AND deletedAt IS NULL").get(postId);
  }
  if (!post) throw new Error("Post not found");

  const id = local.newId();
  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO ShareRecord (id, userId, postId, createdAt, data)
       VALUES (?, ?, ?, ?, ?)`
    ).run(id, userId, postId, local.nowIso(), json({ id, userId, postId }));
    db.prepare("UPDATE Post SET sharesCount = sharesCount + 1 WHERE id = ?").run(postId);
    local.queueSync("share", "create", { id, userId, postId });
  });
  tx();

  const sharesCount = db.prepare("SELECT sharesCount FROM Post WHERE id = ?").get(postId)?.sharesCount || 0;
  return { status: true, sharesCount, shares: sharesCount };
}

async function getComments(postId, userId = null) {
  const db = local.getDb();
  if (db) {
    const rows = db
      .prepare("SELECT * FROM Comment WHERE postId = ? AND parentId IS NULL AND deletedAt IS NULL ORDER BY datetime(createdAt) DESC")
      .all(postId);
    const refreshed = local.getMeta(`comments:${postId}:refreshedAt`);
    if (rows.length || refreshed) return rows.map((row) => formatLocalComment(row, userId));
  }

  if (localOnly) return [];

  const comments = await neon.comment.findMany({
    where: { postId, parentId: null },
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { id: true, name: true, image: true, username: true } },
      likes: userId ? { where: { userId }, select: { id: true, userId: true, commentId: true } } : false,
      _count: { select: { likes: true, replies: true } },
    },
  });
  mirrorComments(postId, comments);
  return comments.map((comment) => formatCloudComment(comment, userId));
}

async function createComment(postId, userId, text, parentId = null) {
  const db = local.getDb();
  if (!db) {
    if (localOnly) {
      throw new Error("Local SQLite is not ready. Install better-sqlite3 and set LOCAL_DATABASE_PATH.");
    }

    const newComment = await neon.comment.create({
      data: { text, authorId: userId, postId, parentId },
      include: {
        author: { select: { id: true, name: true, image: true, username: true } },
        likes: { where: { userId }, select: { id: true } },
        _count: { select: { likes: true, replies: true } },
      },
    });
    return formatCloudComment(newComment, userId);
  }

  await ensureLocalUser(userId);
  let post = db.prepare("SELECT * FROM Post WHERE id = ? AND deletedAt IS NULL").get(postId);
  if (!post) {
    await refreshPostFromNeon(postId, userId);
    post = db.prepare("SELECT * FROM Post WHERE id = ? AND deletedAt IS NULL").get(postId);
  }
  if (!post) throw new Error("Post not found");

  const now = local.nowIso();
  const comment = {
    id: local.newId(),
    postId,
    authorId: userId,
    text: text || "",
    parentId: parentId || null,
    createdAt: now,
    updatedAt: now,
    likesCount: 0,
    repliesCount: 0,
  };

  const tx = db.transaction(() => {
    upsertCommentRow(db, comment);
    if (parentId) {
      db.prepare("UPDATE Comment SET repliesCount = repliesCount + 1 WHERE id = ?").run(parentId);
    } else {
      db.prepare("UPDATE Post SET commentsCount = commentsCount + 1 WHERE id = ?").run(postId);
    }
    local.queueSync("comment", "create", { comment });
  });
  tx();

  const result = formatLocalComment(db.prepare("SELECT * FROM Comment WHERE id = ?").get(comment.id), userId);
  const commentsCount = db.prepare("SELECT commentsCount FROM Post WHERE id = ?").get(postId)?.commentsCount || 0;
  return { ...result, status: true, commentsCount };
}

async function updateComment(id, userId, text) {
  const db = local.getDb();
  if (!db) {
    if (localOnly) {
      throw new Error("Local SQLite is not ready. Install better-sqlite3 and set LOCAL_DATABASE_PATH.");
    }

    const comment = await neon.comment.findUnique({ where: { id } });
    if (!comment || comment.authorId !== userId) return null;
    const updated = await neon.comment.update({
      where: { id },
      data: { text },
      include: {
        author: { select: { id: true, name: true, image: true, username: true } },
        likes: { where: { userId }, select: { id: true } },
        _count: { select: { likes: true, replies: true } },
      },
    });
    return formatCloudComment(updated, userId);
  }

  const row = db.prepare("SELECT * FROM Comment WHERE id = ? AND deletedAt IS NULL").get(id);
  if (!row || row.authorId !== userId) return null;

  const updatedAt = local.nowIso();
  db.prepare("UPDATE Comment SET text = ?, updatedAt = ? WHERE id = ?").run(text || "", updatedAt, id);
  local.queueSync("comment", "update", { id, text: text || "", updatedAt });
  return formatLocalComment(db.prepare("SELECT * FROM Comment WHERE id = ?").get(id), userId);
}

async function deleteComment(id, userId) {
  const db = local.getDb();
  if (!db) {
    if (localOnly) {
      throw new Error("Local SQLite is not ready. Install better-sqlite3 and set LOCAL_DATABASE_PATH.");
    }

    const comment = await neon.comment.findUnique({ where: { id } });
    if (!comment || comment.authorId !== userId) return false;
    await neon.comment.delete({ where: { id } });
    return true;
  }

  const row = db.prepare("SELECT * FROM Comment WHERE id = ? AND deletedAt IS NULL").get(id);
  if (!row || row.authorId !== userId) return false;

  const tx = db.transaction(() => {
    db.prepare("UPDATE Comment SET deletedAt = ? WHERE id = ?").run(local.nowIso(), id);
    if (row.parentId) {
      db.prepare("UPDATE Comment SET repliesCount = CASE WHEN repliesCount > 0 THEN repliesCount - 1 ELSE 0 END WHERE id = ?").run(row.parentId);
    } else {
      db.prepare("UPDATE Post SET commentsCount = CASE WHEN commentsCount > 0 THEN commentsCount - 1 ELSE 0 END WHERE id = ?").run(row.postId);
    }
    local.queueSync("comment", "delete", { id });
  });
  tx();
  return true;
}

async function toggleCommentLike(commentId, userId) {
  const db = local.getDb();
  if (!db) {
    if (localOnly) {
      throw new Error("Local SQLite is not ready. Install better-sqlite3 and set LOCAL_DATABASE_PATH.");
    }

    const existing = await neon.like.findFirst({ where: { userId, commentId } });
    if (existing) await neon.like.delete({ where: { id: existing.id } });
    else await neon.like.create({ data: { userId, commentId } });
    const likeCount = await neon.like.count({ where: { commentId } });
    return { liked: !existing, likeCount };
  }

  await ensureLocalUser(userId);
  const row = db.prepare("SELECT * FROM Comment WHERE id = ? AND deletedAt IS NULL").get(commentId);
  if (!row) throw new Error("Comment not found");

  const existing = db.prepare("SELECT * FROM LikeRecord WHERE commentId = ? AND userId = ?").get(commentId, userId);
  const liked = !existing;
  const likeId = existing?.id || local.newId();

  const tx = db.transaction(() => {
    if (existing) {
      db.prepare("DELETE FROM LikeRecord WHERE id = ?").run(existing.id);
      db.prepare("UPDATE Comment SET likesCount = CASE WHEN likesCount > 0 THEN likesCount - 1 ELSE 0 END WHERE id = ?").run(commentId);
    } else {
      db.prepare(
        `INSERT OR IGNORE INTO LikeRecord (id, userId, commentId, createdAt, data)
         VALUES (?, ?, ?, ?, ?)`
      ).run(likeId, userId, commentId, local.nowIso(), json({ id: likeId, userId, commentId }));
      db.prepare("UPDATE Comment SET likesCount = likesCount + 1 WHERE id = ?").run(commentId);
    }
    local.queueSync("commentLike", "toggle", { id: likeId, userId, commentId, liked });
  });
  tx();

  const likeCount = db.prepare("SELECT likesCount FROM Comment WHERE id = ?").get(commentId)?.likesCount || 0;
  return { liked, likeCount };
}

async function recordView(postId, userId) {
  const db = local.getDb();
  if (!db) {
    if (localOnly) {
      throw new Error("Local SQLite is not ready. Install better-sqlite3 and set LOCAL_DATABASE_PATH.");
    }

    try {
      await neon.postView.create({ data: { postId, userId: String(userId) } });
    } catch {
      // Existing behavior ignores failed duplicate/guest view writes.
    }
    const count = await neon.postView.count({ where: { postId } });
    return { viewsCount: count };
  }

  let post = db.prepare("SELECT * FROM Post WHERE id = ? AND deletedAt IS NULL").get(postId);
  if (!post) {
    await refreshPostFromNeon(postId, userId);
    post = db.prepare("SELECT * FROM Post WHERE id = ? AND deletedAt IS NULL").get(postId);
  }
  if (!post) throw new Error("Post not found");

  const view = {
    id: local.newId(),
    postId,
    userId: String(userId),
    viewedAt: local.nowIso(),
  };

  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO PostView (id, userId, postId, articleId, viewedAt, data)
       VALUES (@id, @userId, @postId, NULL, @viewedAt, @data)`
    ).run({ ...view, data: json(view) });
    db.prepare("UPDATE Post SET viewsCount = viewsCount + 1 WHERE id = ?").run(postId);
    local.queueSync("postView", "create", view);
  });
  tx();

  const viewsCount = db.prepare("SELECT viewsCount FROM Post WHERE id = ?").get(postId)?.viewsCount || 0;
  return { viewsCount };
}

async function votePoll(postId, optionId, userId) {
  const db = local.getDb();
  if (!db) {
    if (localOnly) {
      throw new Error("Local SQLite is not ready. Install better-sqlite3 and set LOCAL_DATABASE_PATH.");
    }

    const existingVote = await neon.pollOption.findFirst({
      where: { postId, votedUsers: { some: { id: userId } } },
    });
    if (existingVote) {
      const error = new Error("Already voted");
      error.statusCode = 400;
      throw error;
    }

    await neon.pollOption.update({
      where: { id: optionId },
      data: { votedUsers: { connect: { id: userId } } },
    });
    return neon.pollOption.findMany({
      where: { postId },
      include: { votedUsers: { select: { id: true } }, _count: { select: { votedUsers: true } } },
    });
  }

  await ensureLocalUser(userId);
  let options = db.prepare("SELECT * FROM PollOption WHERE postId = ?").all(postId);
  if (!options.length) {
    await refreshPostFromNeon(postId, userId);
    options = db.prepare("SELECT * FROM PollOption WHERE postId = ?").all(postId);
  }

  const option = options.find((item) => item.id === optionId);
  if (!option) throw new Error("Poll option not found");

  const existingVote = db.prepare("SELECT * FROM PollVote WHERE postId = ? AND userId = ?").get(postId, userId);
  if (existingVote) {
    const error = new Error("Already voted");
    error.statusCode = 400;
    throw error;
  }

  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO PollVote (id, postId, optionId, userId, createdAt)
       VALUES (?, ?, ?, ?, ?)`
    ).run(local.newId(), postId, optionId, userId, local.nowIso());

    const votedUserIds = parseJson(option.votedUserIdsJson, []);
    votedUserIds.push(userId);
    db.prepare("UPDATE PollOption SET votes = votes + 1, votedUserIdsJson = ? WHERE id = ?").run(json(votedUserIds), optionId);
    local.queueSync("poll", "vote", { postId, optionId, userId });
  });
  tx();

  return db.prepare("SELECT * FROM PollOption WHERE postId = ?").all(postId).map((item) => {
    const votedUserIds = parseJson(item.votedUserIdsJson, []);
    return {
      id: item.id,
      text: item.text,
      votes: Number(item.votes || votedUserIds.length || 0),
      postId: item.postId,
      votedUsers: votedUserIds.map((id) => ({ id })),
      _count: { votedUsers: Number(item.votes || votedUserIds.length || 0) },
    };
  });
}

async function getLikeStatus(postId, userId) {
  if (!userId || userId === "null") return { liked: false };
  const db = local.getDb();
  if (db) {
    const like = db.prepare("SELECT id FROM LikeRecord WHERE postId = ? AND userId = ?").get(postId, userId);
    if (like) return { liked: true };
    const localPost = db.prepare("SELECT id FROM Post WHERE id = ?").get(postId);
    if (localPost) return { liked: false };
  }

  if (localOnly) return { liked: false };

  const like = await neon.like.findFirst({ where: { postId, userId } });
  if (db && like) upsertLike(db, like);
  return { liked: Boolean(like) };
}

async function getSaveStatus(postId, userId) {
  if (!userId || userId === "null") return { saved: false };
  const db = local.getDb();
  if (db) {
    const save = db.prepare("SELECT id FROM SaveRecord WHERE postId = ? AND userId = ?").get(postId, userId);
    if (save) return { saved: true };
    const localPost = db.prepare("SELECT id FROM Post WHERE id = ?").get(postId);
    if (localPost) return { saved: false };
  }

  if (localOnly) return { saved: false };

  const save = await neon.save.findFirst({ where: { postId, userId } });
  if (db && save) upsertSave(db, save);
  return { saved: Boolean(save) };
}

async function getCommunityPosts({ id, userId, page = 1, limit = 10 }) {
  const db = local.getDb();
  page = Number(page) > 0 ? Number(page) : 1;
  limit = Number(limit) > 0 ? Number(limit) : 10;
  let checkedCommunity = null;

  if (db) {
    let community = db.prepare("SELECT * FROM Community WHERE id = ?").get(id);
    if (!community) {
      if (localOnly) return null;
      const cloudCommunity = await neon.community.findUnique({ where: { id } });
      if (cloudCommunity) upsertCommunity(db, cloudCommunity);
      community = cloudCommunity ? db.prepare("SELECT * FROM Community WHERE id = ?").get(id) : null;
    }

    if (!community) return null;
    checkedCommunity = community;

    if (community.status === "PRIVATE") {
      if (localOnly) {
        return {
          posts: [],
          pagination: { total: 0, totalPages: 0, currentPage: page },
        };
      }

      const member = userId
        ? await neon.communityMember.findUnique({ where: { userId_communityId: { userId, communityId: id } } })
        : null;
      if (!member) {
        return {
          posts: [],
          pagination: { total: 0, totalPages: 0, currentPage: page },
        };
      }
    }

    const rows = selectLocalPosts({ page, pageSize: limit, userId, communityId: id });
    if (rows.length) {
      const total = countLocalPosts({ userId, communityId: id });
      scheduleFeedRefresh();
      return {
        posts: rows.map((row) => formatLocalPost(row, userId)),
        pagination: {
          total,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
        },
      };
    }
  }

  if (!checkedCommunity) {
    if (localOnly) return null;
    checkedCommunity = await neon.community.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!checkedCommunity) return null;
  }

  if (checkedCommunity.status === "PRIVATE") {
    if (localOnly) {
      return {
        posts: [],
        pagination: { total: 0, totalPages: 0, currentPage: page },
      };
    }

    const member = userId
      ? await neon.communityMember.findUnique({ where: { userId_communityId: { userId, communityId: id } } })
      : null;

    if (!member) {
      return {
        posts: [],
        pagination: { total: 0, totalPages: 0, currentPage: page },
      };
    }
  }

  if (localOnly) {
    return {
      posts: [],
      pagination: { total: 0, totalPages: 0, currentPage: page },
    };
  }

  const posts = await fetchCloudPosts({ page, pageSize: limit, userId, communityId: id });
  const totalPosts = await neon.post.count({ where: { communityId: id } });
  return {
    posts,
    pagination: {
      total: totalPosts,
      totalPages: Math.ceil(totalPosts / limit),
      currentPage: page,
    },
  };
}

async function getUserPosts(userId, requesterId = null) {
  const db = local.getDb();
  if (db) {
    const rows = db
      .prepare("SELECT * FROM Post WHERE authorId = ? AND deletedAt IS NULL ORDER BY datetime(createdAt) DESC")
      .all(userId);
    return rows.map((row) => formatLocalPost(row, requesterId || userId));
  }

  if (localOnly) return [];

  const posts = await neon.post.findMany({
    where: { authorId: userId },
    include: postInclude(requesterId || userId),
    orderBy: { createdAt: "desc" },
  });
  return posts.map((post) => formatCloudPost(post, requesterId || userId));
}

async function getUserLikedPosts(userId, requesterId = null) {
  const db = local.getDb();
  if (db) {
    const rows = db.prepare(`
      SELECT p.*
      FROM LikeRecord l
      JOIN Post p ON p.id = l.postId
      WHERE l.userId = ? AND p.deletedAt IS NULL
      ORDER BY datetime(l.createdAt) DESC
    `).all(userId);
    return rows.map((row) => formatLocalPost(row, requesterId || userId));
  }
  if (localOnly) return [];

  const likes = await neon.like.findMany({
    where: { userId, postId: { not: null } },
    include: { post: { include: postInclude(requesterId || userId) } },
    orderBy: { createdAt: "desc" },
  });
  return likes.map((like) => like.post).filter(Boolean).map((post) => formatCloudPost(post, requesterId || userId));
}

async function getUserSavedPosts(userId, requesterId = null) {
  const db = local.getDb();
  if (db) {
    const rows = db.prepare(`
      SELECT p.*
      FROM SaveRecord s
      JOIN Post p ON p.id = s.postId
      WHERE s.userId = ? AND p.deletedAt IS NULL
      ORDER BY datetime(s.createdAt) DESC
    `).all(userId);
    return rows.map((row) => formatLocalPost(row, requesterId || userId));
  }
  if (localOnly) return [];

  const saves = await neon.save.findMany({
    where: { userId, postId: { not: null } },
    include: { post: { include: postInclude(requesterId || userId) } },
    orderBy: { createdAt: "desc" },
  });
  return saves.map((save) => save.post).filter(Boolean).map((post) => formatCloudPost(post, requesterId || userId));
}

async function bootstrapLocalCache() {
  if (localOnly || !local.isReady() || process.env.HYBRID_BOOTSTRAP_ON_START === "false") return 0;
  return refreshRecentPostsFromNeon(Number(process.env.HYBRID_BOOTSTRAP_POST_LIMIT || DEFAULT_BOOTSTRAP_LIMIT));
}

module.exports = {
  bootstrapLocalCache,
  createComment,
  createPost,
  deleteComment,
  deletePost,
  getComments,
  getCommunityPosts,
  getUserLikedPosts,
  getUserPosts,
  getUserSavedPosts,
  getLikeStatus,
  getPosts,
  getSaveStatus,
  getSinglePost,
  getStatus: local.getStatus,
  getTrends,
  recordView,
  refreshRecentPostsFromNeon,
  sharePost,
  toggleCommentLike,
  toggleLike,
  toggleSave,
  updateComment,
  updatePost,
  votePoll,
};
