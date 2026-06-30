const local = require("../db/local");
const localDeletion = require("./localDeletionService");

function basicPublicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    name: row.name,
    googleId: row.googleId,
    provider: row.provider,
    image: row.image,
    description: row.description || "",
    isAuthorized: Boolean(row.isAuthorized),
    isSupporter: Boolean(row.isSupporter),
    roleLevel: row.roleLevel || "Starter",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function publicCommunity(row) {
  if (!row) return null;
  return {
    id: row.communityId || row.id,
    name: row.communityName || row.name,
    interests: (() => {
      try { return JSON.parse(row.interestsJson || "[]"); } catch { return []; }
    })(),
    slogan: row.slogan,
    discription: row.discription,
    icon: row.icon,
    banner: row.banner,
    status: row.communityStatus || row.status,
    featured: Boolean(row.featured),
    engagement: Number(row.engagement || 0),
    creatorId: row.creatorId,
  };
}

function publicUser(row) {
  if (!row) return null;
  const db = local.getDb();
  const followers = db
    ? db.prepare("SELECT id, followerId, followingId, createdAt FROM Follows WHERE followingId = ? ORDER BY datetime(createdAt) DESC").all(row.id)
    : [];
  const following = db
    ? db.prepare("SELECT id, followerId, followingId, createdAt FROM Follows WHERE followerId = ? ORDER BY datetime(createdAt) DESC").all(row.id)
    : [];
  const membershipRows = db
    ? db.prepare(`
        SELECT cm.id AS membershipId, cm.userId, cm.communityId, cm.role, cm.joinedAt,
          c.name AS communityName, c.interestsJson, c.slogan, c.discription, c.icon,
          c.banner, c.status AS communityStatus, c.featured, c.engagement, c.creatorId
        FROM CommunityMember cm
        JOIN Community c ON c.id = cm.communityId
        WHERE cm.userId = ?
        ORDER BY datetime(cm.joinedAt) DESC
      `).all(row.id)
    : [];
  const ownedCommunities = db
    ? db.prepare("SELECT * FROM Community WHERE creatorId = ? ORDER BY lower(name)").all(row.id).map(publicCommunity)
    : [];
  return {
    ...basicPublicUser(row),
    memberships: membershipRows.map((membership) => ({
      id: membership.membershipId,
      userId: membership.userId,
      communityId: membership.communityId,
      role: membership.role,
      joinedAt: membership.joinedAt,
      community: publicCommunity(membership),
    })),
    ownedCommunities,
    followers,
    following,
    followerCount: followers.length,
    followingCount: following.length,
    blockedUsers: [],
  };
}

function privateUser(row) {
  if (!row) return null;
  return {
    ...publicUser(row),
    password: row.password,
  };
}

function findByEmailOrUsername(value) {
  const db = local.getDb();
  if (!db) throw new Error("Local SQLite is not ready.");
  const row = db
    .prepare("SELECT * FROM User WHERE lower(email) = lower(?) OR lower(username) = lower(?) LIMIT 1")
    .get(value, value);
  return privateUser(row);
}

function findByEmail(email) {
  const db = local.getDb();
  if (!db) throw new Error("Local SQLite is not ready.");
  return privateUser(db.prepare("SELECT * FROM User WHERE lower(email) = lower(?) LIMIT 1").get(email));
}

function findByUsername(username) {
  const db = local.getDb();
  if (!db) throw new Error("Local SQLite is not ready.");
  return publicUser(db.prepare("SELECT * FROM User WHERE lower(username) = lower(?) AND provider != 'engagement' LIMIT 1").get(username));
}

function findById(id) {
  const db = local.getDb();
  if (!db) throw new Error("Local SQLite is not ready.");
  return privateUser(db.prepare("SELECT * FROM User WHERE id = ? LIMIT 1").get(id));
}

function createUser({ name, email, username, password, googleId = null, provider = "local", image = null, description = "" }) {
  const db = local.getDb();
  if (!db) throw new Error("Local SQLite is not ready.");

  const existing = findByEmailOrUsername(email) || findByEmailOrUsername(username);
  if (existing) {
    const error = new Error("Email or username already exists");
    error.statusCode = 400;
    throw error;
  }

  const now = local.nowIso();
  const user = {
    id: local.newId(),
    email,
    username,
    name,
    password,
    googleId,
    provider,
    image,
    description,
    isAuthorized: 0,
    isSupporter: 0,
    roleLevel: "Starter",
    createdAt: now,
    updatedAt: now,
    data: "{}",
  };

  db.prepare(
    `INSERT INTO User (
      id, email, username, name, password, googleId, provider, image, description,
      isAuthorized, isSupporter, roleLevel, createdAt, updatedAt, data
    )
    VALUES (
      @id, @email, @username, @name, @password, @googleId, @provider, @image, @description,
      @isAuthorized, @isSupporter, @roleLevel, @createdAt, @updatedAt, @data
    )`
  ).run(user);

  return publicUser(user);
}

function upsertGoogleUser({ email, name, googleId, image }) {
  const db = local.getDb();
  if (!db) throw new Error("Local SQLite is not ready.");

  const existing = findByEmail(email);
  if (existing) {
    const updatedAt = local.nowIso();
    db.prepare("UPDATE User SET name = ?, googleId = ?, image = COALESCE(?, image), provider = 'google', updatedAt = ? WHERE id = ?")
      .run(name, googleId, image || null, updatedAt, existing.id);
    return publicUser(db.prepare("SELECT * FROM User WHERE id = ?").get(existing.id));
  }

  return createUser({
    email,
    name,
    username: `user_${String(googleId).slice(0, 8)}`,
    password: null,
    googleId,
    provider: "google",
    image,
  });
}

function searchUsers(query, requesterId = null) {
  const db = local.getDb();
  if (!db) throw new Error("Local SQLite is not ready.");
  const rows = db
    .prepare(
      `SELECT *
       FROM User
       WHERE (@requesterId = '' OR id != @requesterId)
         AND provider != 'engagement'
         AND lower(username) LIKE lower(@query)
       ORDER BY username ASC
       LIMIT 5`
    )
    .all({ requesterId: requesterId || "", query: `%${query}%` });
  return rows.map(basicPublicUser);
}

function listUsers(limit = 500) {
  const db = local.getDb();
  if (!db) throw new Error("Local SQLite is not ready.");
  return db
    .prepare("SELECT * FROM User WHERE provider != 'engagement' ORDER BY datetime(createdAt) DESC LIMIT ?")
    .all(limit)
    .map(basicPublicUser);
}

function updateUser(id, data) {
  const db = local.getDb();
  if (!db) throw new Error("Local SQLite is not ready.");

  const existing = db.prepare("SELECT * FROM User WHERE id = ?").get(id);
  if (!existing) return null;

  const updated = {
    name: data.name ?? existing.name,
    email: data.email ?? existing.email,
    username: data.username ?? existing.username,
    description: data.description ?? existing.description,
    image: data.image ?? existing.image,
    isAuthorized:
      data.isAuthorized === undefined ? existing.isAuthorized : data.isAuthorized ? 1 : 0,
    isSupporter:
      data.isSupporter === undefined ? existing.isSupporter : data.isSupporter ? 1 : 0,
    roleLevel: data.roleLevel ?? existing.roleLevel,
    updatedAt: local.nowIso(),
    id,
  };

  db.prepare(
    `UPDATE User
     SET name = @name, email = @email, username = @username,
         description = @description, image = @image,
         isAuthorized = @isAuthorized, isSupporter = @isSupporter,
         roleLevel = @roleLevel, updatedAt = @updatedAt
     WHERE id = @id`
  ).run(updated);

  return publicUser(db.prepare("SELECT * FROM User WHERE id = ?").get(id));
}

function updatePassword(id, hashedPassword) {
  const db = local.getDb();
  if (!db) throw new Error("Local SQLite is not ready.");
  db.prepare("UPDATE User SET password = ?, updatedAt = ? WHERE id = ?").run(hashedPassword, local.nowIso(), id);
}

function followUser(followerId, followingId) {
  const db = local.getDb();
  if (!db) throw new Error("Local SQLite is not ready.");
  if (followerId === followingId) return { created: false, reason: "self" };
  const users = db.prepare("SELECT id FROM User WHERE id IN (?, ?)").all(followerId, followingId);
  if (users.length !== 2) return { created: false, reason: "not-found" };
  const result = db.prepare(`
    INSERT OR IGNORE INTO Follows (id, followerId, followingId, createdAt)
    VALUES (?, ?, ?, ?)
  `).run(local.newId(), followerId, followingId, local.nowIso());
  return { created: Boolean(result.changes), reason: result.changes ? null : "exists" };
}

function unfollowUser(followerId, followingId) {
  const db = local.getDb();
  if (!db) throw new Error("Local SQLite is not ready.");
  return Boolean(db.prepare("DELETE FROM Follows WHERE followerId = ? AND followingId = ?").run(followerId, followingId).changes);
}

function isFollowing(followerId, followingId) {
  if (!followerId || !followingId) return false;
  const db = local.getDb();
  if (!db) throw new Error("Local SQLite is not ready.");
  return Boolean(db.prepare("SELECT 1 FROM Follows WHERE followerId = ? AND followingId = ?").get(followerId, followingId));
}

function canViewConnections(requesterId, targetId) {
  if (!requesterId || !targetId) return false;
  if (requesterId === targetId) return true;
  return isFollowing(requesterId, targetId) && isFollowing(targetId, requesterId);
}

function listFollowers(username) {
  const db = local.getDb();
  if (!db) throw new Error("Local SQLite is not ready.");
  return db.prepare(`
    SELECT u.* FROM Follows f
    JOIN User u ON u.id = f.followerId
    JOIN User target ON target.id = f.followingId
    WHERE lower(target.username) = lower(?)
    ORDER BY datetime(f.createdAt) DESC
  `).all(username).map(basicPublicUser);
}

function listFollowing(username) {
  const db = local.getDb();
  if (!db) throw new Error("Local SQLite is not ready.");
  return db.prepare(`
    SELECT u.* FROM Follows f
    JOIN User u ON u.id = f.followingId
    JOIN User source ON source.id = f.followerId
    WHERE lower(source.username) = lower(?)
    ORDER BY datetime(f.createdAt) DESC
  `).all(username).map(basicPublicUser);
}

function listFriends(username) {
  const db = local.getDb();
  if (!db) throw new Error("Local SQLite is not ready.");
  return db.prepare(`
    SELECT friend.*
    FROM User source
    JOIN Follows outgoing ON outgoing.followerId = source.id
    JOIN Follows incoming
      ON incoming.followerId = outgoing.followingId
     AND incoming.followingId = outgoing.followerId
    JOIN User friend ON friend.id = outgoing.followingId
    WHERE lower(source.username) = lower(?)
      AND friend.provider != 'engagement'
    ORDER BY friend.name ASC, friend.username ASC
  `).all(username).map(basicPublicUser);
}

function deleteUser(id) {
  const db = local.getDb();
  if (!db) throw new Error("Local SQLite is not ready.");
  return localDeletion.deleteUser(db, id);
}

module.exports = {
  basicPublicUser,
  canViewConnections,
  createUser,
  deleteUser,
  findByEmail,
  findByEmailOrUsername,
  findById,
  findByUsername,
  followUser,
  isFollowing,
  listFollowers,
  listFriends,
  listFollowing,
  listUsers,
  publicUser,
  searchUsers,
  updatePassword,
  updateUser,
  unfollowUser,
  upsertGoogleUser,
};
