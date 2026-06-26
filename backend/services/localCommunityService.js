const local = require("../db/local");

function parseJson(value, fallback = []) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function communityFromRow(row, db = local.getDb()) {
  if (!row) return null;
  const memberCount = db
    ? db.prepare("SELECT COUNT(*) AS count FROM CommunityMember WHERE communityId = ?").get(row.id)?.count || 0
    : 0;
  const requestCount = db
    ? db.prepare("SELECT COUNT(*) AS count FROM CommunityRequest WHERE communityId = ? AND status = 'PENDING'").get(row.id)?.count || 0
    : 0;

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
    communityMembers: [],
    requests: [],
    _count: {
      communityMembers: Number(memberCount),
      requests: Number(requestCount),
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
  db.prepare("DELETE FROM CommunityMember WHERE communityId = ?").run(id);
  db.prepare("DELETE FROM CommunityRequest WHERE communityId = ?").run(id);
  db.prepare("DELETE FROM Community WHERE id = ?").run(id);
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

module.exports = {
  createCommunity,
  deleteCommunity,
  getCommunity,
  joinCommunity,
  listCommunities,
  membership,
  updateCommunity,
};
