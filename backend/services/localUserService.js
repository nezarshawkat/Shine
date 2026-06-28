const local = require("../db/local");
const localDeletion = require("./localDeletionService");

function publicUser(row) {
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
    memberships: [],
    followers: [],
    following: [],
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
  return publicUser(db.prepare("SELECT * FROM User WHERE lower(username) = lower(?) LIMIT 1").get(username));
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
         AND lower(username) LIKE lower(@query)
       ORDER BY username ASC
       LIMIT 5`
    )
    .all({ requesterId: requesterId || "", query: `%${query}%` });
  return rows.map(publicUser);
}

function listUsers(limit = 500) {
  const db = local.getDb();
  if (!db) throw new Error("Local SQLite is not ready.");
  return db
    .prepare("SELECT * FROM User ORDER BY datetime(createdAt) DESC LIMIT ?")
    .all(limit)
    .map(publicUser);
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

function deleteUser(id) {
  const db = local.getDb();
  if (!db) throw new Error("Local SQLite is not ready.");
  return localDeletion.deleteUser(db, id);
}

module.exports = {
  createUser,
  deleteUser,
  findByEmail,
  findByEmailOrUsername,
  findById,
  findByUsername,
  listUsers,
  publicUser,
  searchUsers,
  updatePassword,
  updateUser,
  upsertGoogleUser,
};
