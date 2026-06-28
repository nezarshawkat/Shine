const local = require("../db/local");
const localDeletion = require("./localDeletionService");

function parseJson(value, fallback = []) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function communityFromRow(row, db = local.getDb()) {
  if (!row) return null;
  const communityMembers = db
    ? db.prepare(`
        SELECT cm.*, u.username, u.name, u.image
        FROM CommunityMember cm
        LEFT JOIN User u ON u.id = cm.userId
        WHERE cm.communityId = ?
        ORDER BY CASE cm.role WHEN 'MAIN_ADMIN' THEN 0 WHEN 'ADMIN' THEN 1 ELSE 2 END, datetime(cm.joinedAt)
      `).all(row.id).map((member) => ({
        id: member.id,
        userId: member.userId,
        communityId: member.communityId,
        role: member.role,
        joinedAt: member.joinedAt,
        user: { id: member.userId, username: member.username, name: member.name, image: member.image },
      }))
    : [];
  const requests = db
    ? db.prepare(`
        SELECT cr.*, u.username, u.name, u.image
        FROM CommunityRequest cr
        LEFT JOIN User u ON u.id = cr.userId
        WHERE cr.communityId = ? AND cr.status = 'PENDING'
        ORDER BY datetime(cr.createdAt)
      `).all(row.id).map((request) => ({
        id: request.id,
        userId: request.userId,
        communityId: request.communityId,
        status: request.status,
        createdAt: request.createdAt,
        user: { id: request.userId, username: request.username, name: request.name, image: request.image },
      }))
    : [];

  return {
    id: row.id,
    name: row.name,
    interests: parseJson(row.interestsJson, []),
    slogan: row.slogan,
    discription: row.discription,
    icon: row.icon,
    banner: row.banner,
    status: row.status || "PUBLIC",
    featured: Boolean(row.featured),
    engagement: Number(row.engagement || 0),
    creatorId: row.creatorId,
    communityMembers,
    requests,
    _count: {
      communityMembers: communityMembers.length,
      requests: requests.length,
    },
  };
}

function listCommunities() {
  const db = local.getDb();
  if (!db) throw new Error("Local SQLite is not ready.");
  return db.prepare("SELECT * FROM Community ORDER BY name ASC").all().map((row) => communityFromRow(row, db));
}

function getCommunity(id) {
  const db = local.getDb();
  if (!db) throw new Error("Local SQLite is not ready.");
  return communityFromRow(db.prepare("SELECT * FROM Community WHERE id = ?").get(id), db);
}

function createCommunity({ name, slogan, discription, interests = [], icon = null, banner = null, status = "PUBLIC", creatorId }) {
  const db = local.getDb();
  if (!db) throw new Error("Local SQLite is not ready.");

  const now = local.nowIso();
  const community = {
    id: local.newId(),
    name,
    interestsJson: JSON.stringify(interests),
    slogan: slogan || null,
    discription: discription || null,
    icon,
    banner,
    status,
    featured: 0,
    engagement: 0,
    creatorId,
    data: "{}",
  };

  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO Community (
        id, name, interestsJson, slogan, discription, icon, banner, status,
        featured, engagement, creatorId, data
      )
      VALUES (
        @id, @name, @interestsJson, @slogan, @discription, @icon, @banner, @status,
        @featured, @engagement, @creatorId, @data
      )`
    ).run(community);

    db.prepare(
      `INSERT INTO CommunityMember (id, userId, communityId, role, joinedAt)
       VALUES (?, ?, ?, 'MAIN_ADMIN', ?)`
    ).run(local.newId(), creatorId, community.id, now);
  });
  tx();

  return communityFromRow({ ...community }, db);
}

function updateCommunity(id, data) {
  const db = local.getDb();
  if (!db) throw new Error("Local SQLite is not ready.");
  const existing = db.prepare("SELECT * FROM Community WHERE id = ?").get(id);
  if (!existing) return null;

  const updated = {
    id,
    name: data.name ?? existing.name,
    slogan: data.slogan ?? existing.slogan,
    discription: data.discription ?? existing.discription,
    status: data.status ?? existing.status,
    icon: data.icon ?? existing.icon,
    banner: data.banner ?? existing.banner,
  };

  db.prepare(
    `UPDATE Community
     SET name = @name, slogan = @slogan, discription = @discription,
         status = @status, icon = @icon, banner = @banner
     WHERE id = @id`
  ).run(updated);

  return getCommunity(id);
}

function deleteCommunity(id) {
  const db = local.getDb();
  if (!db) throw new Error("Local SQLite is not ready.");
  return localDeletion.deleteCommunity(db, id);
}

function joinCommunity(id, userId) {
  const db = local.getDb();
  if (!db) throw new Error("Local SQLite is not ready.");
  const community = getCommunity(id);
  if (!community) return null;

  if (community.status === "PRIVATE") {
    db.prepare(
      `INSERT INTO CommunityRequest (id, userId, communityId, status, createdAt)
       VALUES (?, ?, ?, 'PENDING', ?)
       ON CONFLICT(userId, communityId) DO UPDATE SET status = 'PENDING'`
    ).run(local.newId(), userId, id, local.nowIso());
    return { message: "Join request sent", status: "PENDING" };
  }

  db.prepare(
    `INSERT OR IGNORE INTO CommunityMember (id, userId, communityId, role, joinedAt)
     VALUES (?, ?, ?, 'MEMBER', ?)`
  ).run(local.newId(), userId, id, local.nowIso());
  return { message: "Joined successfully", status: "MEMBER" };
}

function membership(id, userId) {
  const db = local.getDb();
  if (!db) throw new Error("Local SQLite is not ready.");
  const member = db.prepare("SELECT * FROM CommunityMember WHERE userId = ? AND communityId = ?").get(userId, id);
  if (member) return { isMember: true, role: member.role, status: "ACCEPTED" };
  const request = db.prepare("SELECT * FROM CommunityRequest WHERE userId = ? AND communityId = ?").get(userId, id);
  if (request) return { isMember: false, status: request.status };
  return { isMember: false, status: "NONE" };
}

function updateMemberRole(id, targetUserId, role) {
  const db = local.getDb();
  if (!db) throw new Error("Local SQLite is not ready.");
  if (!["MEMBER", "ADMIN", "MAIN_ADMIN"].includes(role)) {
    const error = new Error("Invalid community role");
    error.statusCode = 400;
    throw error;
  }

  const member = db.prepare("SELECT * FROM CommunityMember WHERE communityId = ? AND userId = ?").get(id, targetUserId);
  if (!member) return null;
  if (member.role === "MAIN_ADMIN" && role !== "MAIN_ADMIN") {
    const error = new Error("Transfer ownership to another member before changing the Main Admin role");
    error.statusCode = 409;
    throw error;
  }

  const transaction = db.transaction(() => {
    if (role === "MAIN_ADMIN") {
      db.prepare("UPDATE CommunityMember SET role = 'ADMIN' WHERE communityId = ? AND role = 'MAIN_ADMIN'").run(id);
      db.prepare("UPDATE Community SET creatorId = ? WHERE id = ?").run(targetUserId, id);
    }
    db.prepare("UPDATE CommunityMember SET role = ? WHERE communityId = ? AND userId = ?").run(role, id, targetUserId);
  });
  transaction();
  return membership(id, targetUserId);
}

function removeMember(id, targetUserId) {
  const db = local.getDb();
  if (!db) throw new Error("Local SQLite is not ready.");
  const member = db.prepare("SELECT role FROM CommunityMember WHERE communityId = ? AND userId = ?").get(id, targetUserId);
  if (!member) return false;
  if (member.role === "MAIN_ADMIN") {
    const error = new Error("The Main Admin cannot be removed before ownership is transferred");
    error.statusCode = 409;
    throw error;
  }
  db.prepare("DELETE FROM CommunityMember WHERE communityId = ? AND userId = ?").run(id, targetUserId);
  db.prepare("DELETE FROM CommunityRequest WHERE communityId = ? AND userId = ?").run(id, targetUserId);
  return true;
}

function leaveCommunity(id, userId) {
  return removeMember(id, userId);
}

function listRequests(id) {
  return getCommunity(id)?.requests || [];
}

function resolveRequest(id, requestId, action) {
  const db = local.getDb();
  if (!db) throw new Error("Local SQLite is not ready.");
  const request = db.prepare("SELECT * FROM CommunityRequest WHERE id = ? AND communityId = ?").get(requestId, id);
  if (!request) return null;

  const transaction = db.transaction(() => {
    if (action === "ACCEPT") {
      db.prepare(
        `INSERT OR IGNORE INTO CommunityMember (id, userId, communityId, role, joinedAt)
         VALUES (?, ?, ?, 'MEMBER', ?)`
      ).run(local.newId(), request.userId, id, local.nowIso());
    }
    db.prepare("DELETE FROM CommunityRequest WHERE id = ?").run(requestId);
  });
  transaction();
  return { message: action === "ACCEPT" ? "Accepted" : "Declined" };
}

module.exports = {
  createCommunity,
  deleteCommunity,
  getCommunity,
  joinCommunity,
  leaveCommunity,
  listCommunities,
  listRequests,
  membership,
  removeMember,
  resolveRequest,
  updateMemberRole,
  updateCommunity,
};
