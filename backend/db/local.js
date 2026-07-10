const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

let Database = null;
let loadError = null;

try {
  Database = require("better-sqlite3");
} catch (error) {
  loadError = error;
}

const hybridEnabled = process.env.HYBRID_DB_ENABLED !== "false";
const localOnly =
  process.env.DATABASE_MODE === "local" ||
  process.env.LOCAL_ONLY_DB === "true" ||
  !process.env.DATABASE_URL;
const dbPath =
  process.env.LOCAL_DATABASE_PATH ||
  path.join(__dirname, "..", "data", "shine-local.db");

let db = null;
let warnedAboutMissingDriver = false;

function newId() {
  return crypto.randomUUID();
}

function nowIso() {
  return new Date().toISOString();
}

function getDb() {
  if (!hybridEnabled) return null;

  if (!Database) {
    if (!warnedAboutMissingDriver) {
      warnedAboutMissingDriver = true;
      console.warn(
        "Hybrid DB disabled: install backend dependency better-sqlite3 to enable the local SQLite cache.",
        loadError?.message || ""
      );
    }
    return null;
  }

  if (db) return db;

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.pragma("foreign_keys = OFF");
  migrate(db);
  return db;
}

function migrate(database = getDb()) {
  if (!database) return false;

  database.exec(`
    CREATE TABLE IF NOT EXISTS LocalMeta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS SyncQueue (
      id TEXT PRIMARY KEY,
      entity TEXT NOT NULL,
      action TEXT NOT NULL,
      payload TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER NOT NULL DEFAULT 0,
      lastError TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      syncedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS User (
      id TEXT PRIMARY KEY,
      email TEXT,
      username TEXT,
      name TEXT,
      password TEXT,
      googleId TEXT,
      provider TEXT,
      image TEXT,
      description TEXT,
      isAuthorized INTEGER NOT NULL DEFAULT 0,
      isSupporter INTEGER NOT NULL DEFAULT 0,
      roleLevel TEXT NOT NULL DEFAULT 'Starter',
      createdAt TEXT,
      updatedAt TEXT,
      data TEXT
    );

    CREATE TABLE IF NOT EXISTS Community (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      interestsJson TEXT NOT NULL DEFAULT '[]',
      slogan TEXT,
      discription TEXT,
      icon TEXT,
      banner TEXT,
      status TEXT NOT NULL DEFAULT 'PUBLIC',
      featured INTEGER NOT NULL DEFAULT 0,
      engagement INTEGER NOT NULL DEFAULT 0,
      creatorId TEXT,
      data TEXT
    );

    CREATE TABLE IF NOT EXISTS CommunityMember (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      communityId TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'MEMBER',
      joinedAt TEXT NOT NULL,
      UNIQUE(userId, communityId)
    );

    CREATE TABLE IF NOT EXISTS CommunityRequest (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      communityId TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      createdAt TEXT NOT NULL,
      UNIQUE(userId, communityId)
    );

    CREATE TABLE IF NOT EXISTS Follows (
      id TEXT PRIMARY KEY,
      followerId TEXT NOT NULL,
      followingId TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      UNIQUE(followerId, followingId)
    );

    CREATE TABLE IF NOT EXISTS Post (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      text TEXT NOT NULL DEFAULT '',
      keywordsJson TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      featured INTEGER NOT NULL DEFAULT 0,
      engagement INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      authorId TEXT NOT NULL,
      communityId TEXT,
      parentId TEXT,
      likesCount INTEGER NOT NULL DEFAULT 0,
      commentsCount INTEGER NOT NULL DEFAULT 0,
      sharesCount INTEGER NOT NULL DEFAULT 0,
      viewsCount INTEGER NOT NULL DEFAULT 0,
      savesCount INTEGER NOT NULL DEFAULT 0,
      deletedAt TEXT,
      data TEXT
    );

    CREATE TABLE IF NOT EXISTS Media (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      type TEXT NOT NULL,
      size INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      uploaderId TEXT,
      postId TEXT,
      articleId TEXT,
      data TEXT
    );

    CREATE TABLE IF NOT EXISTS Source (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      link TEXT NOT NULL,
      postId TEXT,
      articleId TEXT,
      data TEXT
    );

    CREATE TABLE IF NOT EXISTS PollOption (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      votes INTEGER NOT NULL DEFAULT 0,
      postId TEXT NOT NULL,
      votedUserIdsJson TEXT NOT NULL DEFAULT '[]',
      data TEXT
    );

    CREATE TABLE IF NOT EXISTS PollVote (
      id TEXT PRIMARY KEY,
      postId TEXT NOT NULL,
      optionId TEXT NOT NULL,
      userId TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      UNIQUE(postId, userId)
    );

    CREATE TABLE IF NOT EXISTS LikeRecord (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      postId TEXT,
      articleId TEXT,
      commentId TEXT,
      createdAt TEXT NOT NULL,
      data TEXT,
      UNIQUE(userId, postId),
      UNIQUE(userId, articleId),
      UNIQUE(userId, commentId)
    );

    CREATE TABLE IF NOT EXISTS SaveRecord (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      postId TEXT,
      articleId TEXT,
      createdAt TEXT NOT NULL,
      data TEXT,
      UNIQUE(userId, postId),
      UNIQUE(userId, articleId)
    );

    CREATE TABLE IF NOT EXISTS ShareRecord (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      postId TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      data TEXT
    );

    CREATE TABLE IF NOT EXISTS Comment (
      id TEXT PRIMARY KEY,
      postId TEXT NOT NULL,
      authorId TEXT NOT NULL,
      text TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      parentId TEXT,
      likesCount INTEGER NOT NULL DEFAULT 0,
      repliesCount INTEGER NOT NULL DEFAULT 0,
      deletedAt TEXT,
      data TEXT
    );

    CREATE TABLE IF NOT EXISTS PostView (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      postId TEXT,
      articleId TEXT,
      viewedAt TEXT NOT NULL,
      data TEXT
    );

    CREATE TABLE IF NOT EXISTS FeedInteraction (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      postId TEXT NOT NULL,
      sessionId TEXT NOT NULL,
      impressedAt TEXT NOT NULL,
      openedAt TEXT,
      dwellMs INTEGER NOT NULL DEFAULT 0,
      skipped INTEGER NOT NULL DEFAULT 0,
      hidden INTEGER NOT NULL DEFAULT 0,
      reported INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      UNIQUE(userId, postId, sessionId)
    );

    CREATE TABLE IF NOT EXISTS Article (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      authorId TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      likesCount INTEGER NOT NULL DEFAULT 0,
      savesCount INTEGER NOT NULL DEFAULT 0,
      viewsCount INTEGER NOT NULL DEFAULT 0,
      deletedAt TEXT,
      data TEXT
    );

    CREATE TABLE IF NOT EXISTS ArticleApplication (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL UNIQUE,
      introduction TEXT NOT NULL,
      workSample TEXT NOT NULL,
      socialLink TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      reviewedBy TEXT,
      reviewedAt TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      data TEXT
    );

    CREATE TABLE IF NOT EXISTS OrganicEngagementState (
      id TEXT PRIMARY KEY,
      entityType TEXT NOT NULL,
      entityId TEXT NOT NULL,
      tier TEXT NOT NULL,
      targetViews INTEGER NOT NULL,
      targetLikes INTEGER NOT NULL,
      targetComments INTEGER NOT NULL,
      targetShares INTEGER NOT NULL DEFAULT 0,
      startedAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      UNIQUE(entityType, entityId)
    );

    CREATE TABLE IF NOT EXISTS Event (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      detailsMessage TEXT,
      externalLink TEXT,
      actionType TEXT NOT NULL DEFAULT 'MESSAGE',
      image TEXT NOT NULL,
      date TEXT NOT NULL,
      location TEXT,
      mode TEXT NOT NULL DEFAULT 'OFFLINE',
      creatorId TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      featured INTEGER NOT NULL DEFAULT 0,
      engagement INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      data TEXT
    );

    CREATE TABLE IF NOT EXISTS EventParticipation (
      id TEXT PRIMARY KEY,
      eventId TEXT NOT NULL,
      userId TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      UNIQUE(eventId, userId)
    );

    CREATE TABLE IF NOT EXISTS Admin (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'SUPER_ADMIN',
      permissionsJson TEXT NOT NULL DEFAULT '{}',
      isActive INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS Notification (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      link TEXT,
      isRead INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS Message (
      id TEXT PRIMARY KEY,
      text TEXT,
      imageUrl TEXT,
      senderId TEXT,
      receiverId TEXT NOT NULL,
      isRead INTEGER NOT NULL DEFAULT 0,
      isLiked INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      deletedByJson TEXT NOT NULL DEFAULT '[]'
    );

    CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON SyncQueue(status, attempts, createdAt);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_user_email_unique ON User(email) WHERE email IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_user_username_unique ON User(username) WHERE username IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_post_created ON Post(deletedAt, createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_post_author ON Post(authorId);
    CREATE INDEX IF NOT EXISTS idx_post_community ON Post(communityId, deletedAt, createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_community_member_user ON CommunityMember(userId);
    CREATE INDEX IF NOT EXISTS idx_community_member_community ON CommunityMember(communityId);
    CREATE INDEX IF NOT EXISTS idx_community_request_community ON CommunityRequest(communityId, status);
    CREATE INDEX IF NOT EXISTS idx_follows_follower ON Follows(followerId);
    CREATE INDEX IF NOT EXISTS idx_follows_following ON Follows(followingId);
    CREATE INDEX IF NOT EXISTS idx_media_post ON Media(postId);
    CREATE INDEX IF NOT EXISTS idx_source_post ON Source(postId);
    CREATE INDEX IF NOT EXISTS idx_poll_option_post ON PollOption(postId);
    CREATE INDEX IF NOT EXISTS idx_like_post_user ON LikeRecord(postId, userId);
    CREATE INDEX IF NOT EXISTS idx_like_user ON LikeRecord(userId);
    CREATE INDEX IF NOT EXISTS idx_save_post_user ON SaveRecord(postId, userId);
    CREATE INDEX IF NOT EXISTS idx_save_user ON SaveRecord(userId);
    CREATE INDEX IF NOT EXISTS idx_share_post ON ShareRecord(postId);
    CREATE INDEX IF NOT EXISTS idx_share_user ON ShareRecord(userId);
    CREATE INDEX IF NOT EXISTS idx_comment_post ON Comment(postId, parentId, deletedAt, createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_comment_author ON Comment(authorId);
    CREATE INDEX IF NOT EXISTS idx_post_view_post ON PostView(postId);
    CREATE INDEX IF NOT EXISTS idx_post_view_user ON PostView(userId);
    CREATE INDEX IF NOT EXISTS idx_poll_vote_user ON PollVote(userId);
    CREATE INDEX IF NOT EXISTS idx_feed_interaction_user ON FeedInteraction(userId, updatedAt DESC);
    CREATE INDEX IF NOT EXISTS idx_feed_interaction_post ON FeedInteraction(postId, updatedAt DESC);
    CREATE INDEX IF NOT EXISTS idx_article_created ON Article(deletedAt, createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_article_author ON Article(authorId);
    CREATE INDEX IF NOT EXISTS idx_article_application_user ON ArticleApplication(userId, status);
    CREATE INDEX IF NOT EXISTS idx_organic_engagement_entity ON OrganicEngagementState(entityType, entityId);
    CREATE INDEX IF NOT EXISTS idx_source_article ON Source(articleId);
    CREATE INDEX IF NOT EXISTS idx_event_date ON Event(status, date);
    CREATE INDEX IF NOT EXISTS idx_event_participation_user ON EventParticipation(userId);
    CREATE INDEX IF NOT EXISTS idx_notification_user ON Notification(userId, type, createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_message_receiver ON Message(receiverId, createdAt DESC);
  `);

  return true;
}

function isReady() {
  return Boolean(getDb());
}

function setMeta(key, value) {
  const database = getDb();
  if (!database) return;
  database
    .prepare(
      `INSERT INTO LocalMeta (key, value, updatedAt)
       VALUES (@key, @value, @updatedAt)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt`
    )
    .run({ key, value: String(value), updatedAt: nowIso() });
}

function getMeta(key) {
  const database = getDb();
  if (!database) return null;
  return database.prepare("SELECT value FROM LocalMeta WHERE key = ?").get(key)?.value || null;
}

function queueSync(entity, action, payload) {
  if (localOnly) return null;

  const database = getDb();
  if (!database) return null;

  const id = newId();
  const timestamp = nowIso();
  database
    .prepare(
      `INSERT INTO SyncQueue (id, entity, action, payload, status, attempts, createdAt, updatedAt)
       VALUES (@id, @entity, @action, @payload, 'pending', 0, @createdAt, @updatedAt)`
    )
    .run({
      id,
      entity,
      action,
      payload: JSON.stringify(payload || {}),
      createdAt: timestamp,
      updatedAt: timestamp,
    });

  return id;
}

function getPendingSyncJobs(limit = 25, maxAttempts = 8) {
  const database = getDb();
  if (!database) return [];

  return database
    .prepare(
      `SELECT *
       FROM SyncQueue
       WHERE status IN ('pending', 'failed') AND attempts < ?
       ORDER BY createdAt ASC
       LIMIT ?`
    )
    .all(maxAttempts, limit);
}

function markJobSynced(id) {
  const timestamp = nowIso();
  getDb()
    ?.prepare(
      `UPDATE SyncQueue
       SET status = 'synced', syncedAt = ?, updatedAt = ?, lastError = NULL
       WHERE id = ?`
    )
    .run(timestamp, timestamp, id);
}

function markJobFailed(id, error) {
  getDb()
    ?.prepare(
      `UPDATE SyncQueue
       SET status = 'failed', attempts = attempts + 1, lastError = ?, updatedAt = ?
       WHERE id = ?`
    )
    .run(String(error?.message || error || "Unknown sync error").slice(0, 1000), nowIso(), id);
}

function markJobRetryable(id, error) {
  getDb()
    ?.prepare(
      `UPDATE SyncQueue
       SET status = 'failed', lastError = ?, updatedAt = ?
       WHERE id = ?`
    )
    .run(String(error?.message || error || "Network unavailable").slice(0, 1000), nowIso(), id);
}

function cleanupSyncedJobs(maxAgeHours = 24) {
  const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000).toISOString();
  getDb()
    ?.prepare("DELETE FROM SyncQueue WHERE status = 'synced' AND syncedAt < ?")
    .run(cutoff);
}

function getStatus() {
  const database = getDb();
  if (!database) {
    return {
      enabled: hybridEnabled,
      ready: false,
      path: dbPath,
      error: loadError?.message || null,
    };
  }

  const queue = database
    .prepare(
      `SELECT status, COUNT(*) AS count
       FROM SyncQueue
       GROUP BY status`
    )
    .all();

  return {
    enabled: hybridEnabled,
    ready: true,
    path: dbPath,
    queue,
  };
}

module.exports = {
  cleanupSyncedJobs,
  getDb,
  getMeta,
  getPendingSyncJobs,
  getStatus,
  isReady,
  markJobFailed,
  markJobRetryable,
  markJobSynced,
  migrate,
  newId,
  nowIso,
  queueSync,
  setMeta,
};
