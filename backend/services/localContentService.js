const local = require("../db/local");

function db() {
  const database = local.getDb();
  if (!database) throw new Error("Local SQLite is not ready.");
  return database;
}

function publicUser(row) {
  if (!row) return null;
  return { id: row.id, email: row.email, username: row.username, name: row.name, image: row.image, description: row.description };
}

function hydrateArticle(row) {
  if (!row) return null;
  const database = db();
  return {
    ...row,
    author: publicUser(database.prepare("SELECT * FROM User WHERE id = ?").get(row.authorId)),
    media: database.prepare("SELECT * FROM Media WHERE articleId = ? ORDER BY datetime(createdAt) ASC").all(row.id),
    sources: database.prepare("SELECT * FROM Source WHERE articleId = ?").all(row.id),
    _count: { likes: row.likesCount || 0, saves: row.savesCount || 0, views: row.viewsCount || 0 },
  };
}

function listArticles({ page = 1, limit = 10, search = "", authorId = null } = {}) {
  const database = db();
  page = Math.max(1, Number(page) || 1);
  limit = Math.max(1, Math.min(100, Number(limit) || 10));
  const clauses = ["deletedAt IS NULL"];
  const params = [];
  if (search) {
    clauses.push("(lower(title) LIKE lower(?) OR lower(content) LIKE lower(?))");
    params.push(`%${search}%`, `%${search}%`);
  }
  if (authorId) {
    clauses.push("authorId = ?");
    params.push(authorId);
  }
  const where = clauses.join(" AND ");
  const totalArticles = database.prepare(`SELECT COUNT(*) AS count FROM Article WHERE ${where}`).get(...params).count;
  const rows = database.prepare(`
    SELECT * FROM Article WHERE ${where}
    ORDER BY datetime(createdAt) DESC LIMIT ? OFFSET ?
  `).all(...params, limit, (page - 1) * limit);
  const totalPages = Math.ceil(totalArticles / limit);
  return {
    metadata: { totalArticles, totalPages, currentPage: page, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
    articles: rows.map(hydrateArticle),
  };
}

function createArticle({ title, content, authorId, sources = [], uploadedMedia = [], files = [] }) {
  const database = db();
  const author = database.prepare("SELECT * FROM User WHERE id = ?").get(authorId);
  if (!author) throw new Error("Author not found");
  if (!author.isAuthorized) throw new Error("Author is not authorized to post articles yet");
  const id = local.newId();
  const now = local.nowIso();
  const transaction = database.transaction(() => {
    database.prepare(`
      INSERT INTO Article (id, title, content, authorId, createdAt, updatedAt, data)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, title, content, authorId, now, now, JSON.stringify({ title, content }));
    for (const source of sources) {
      database.prepare("INSERT INTO Source (id, name, link, articleId, data) VALUES (?, ?, ?, ?, ?)")
        .run(local.newId(), String(source.name || ""), String(source.link || ""), id, JSON.stringify(source));
    }
    uploadedMedia.forEach((asset, index) => {
      const file = files[index] || {};
      database.prepare(`
        INSERT INTO Media (id, url, type, size, createdAt, uploaderId, articleId, data)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        local.newId(), asset.url, String(file.mimetype || "").startsWith("video") ? "video" : "image",
        Number(file.size || 0), now, authorId, id, JSON.stringify(asset)
      );
    });
  });
  transaction();
  return hydrateArticle(database.prepare("SELECT * FROM Article WHERE id = ?").get(id));
}

function updateArticle(id, { title, content, sources, uploadedMedia = [], files = [], removeMediaIds = [] }) {
  const database = db();
  const existing = database.prepare("SELECT * FROM Article WHERE id = ? AND deletedAt IS NULL").get(id);
  if (!existing) return null;
  const now = local.nowIso();
  database.transaction(() => {
    database.prepare("UPDATE Article SET title = ?, content = ?, updatedAt = ? WHERE id = ?")
      .run(title || existing.title, content || existing.content, now, id);
    if (Array.isArray(sources)) {
      database.prepare("DELETE FROM Source WHERE articleId = ?").run(id);
      for (const source of sources) {
        database.prepare("INSERT INTO Source (id, name, link, articleId, data) VALUES (?, ?, ?, ?, ?)")
          .run(local.newId(), String(source.name || ""), String(source.link || ""), id, JSON.stringify(source));
      }
    }
    for (const mediaId of removeMediaIds) database.prepare("DELETE FROM Media WHERE id = ? AND articleId = ?").run(mediaId, id);
    uploadedMedia.forEach((asset, index) => {
      const file = files[index] || {};
      database.prepare(`INSERT INTO Media (id, url, type, size, createdAt, uploaderId, articleId, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(local.newId(), asset.url, String(file.mimetype || "").startsWith("video") ? "video" : "image", Number(file.size || 0), now, existing.authorId, id, JSON.stringify(asset));
    });
  })();
  return hydrateArticle(database.prepare("SELECT * FROM Article WHERE id = ?").get(id));
}

function getArticle(id) {
  return hydrateArticle(db().prepare("SELECT * FROM Article WHERE id = ? AND deletedAt IS NULL").get(id));
}

function toggleArticleRecord(table, countColumn, articleId, userId) {
  const database = db();
  const existing = database.prepare(`SELECT id FROM ${table} WHERE articleId = ? AND userId = ?`).get(articleId, userId);
  let status;
  if (existing) {
    database.prepare(`DELETE FROM ${table} WHERE id = ?`).run(existing.id);
    status = false;
  } else {
    const columns = table === "LikeRecord" ? "id, userId, articleId, createdAt, data" : "id, userId, articleId, createdAt, data";
    database.prepare(`INSERT INTO ${table} (${columns}) VALUES (?, ?, ?, ?, ?)`)
      .run(local.newId(), userId, articleId, local.nowIso(), "{}");
    status = true;
  }
  const count = database.prepare(`SELECT COUNT(*) AS count FROM ${table} WHERE articleId = ?`).get(articleId).count;
  database.prepare(`UPDATE Article SET ${countColumn} = ? WHERE id = ?`).run(count, articleId);
  return { status, count };
}

function toggleArticleLike(articleId, userId) {
  const result = toggleArticleRecord("LikeRecord", "likesCount", articleId, userId);
  return { status: result.status, likesCount: result.count };
}

function toggleArticleSave(articleId, userId) {
  const result = toggleArticleRecord("SaveRecord", "savesCount", articleId, userId);
  return { status: result.status, savesCount: result.count };
}

function articleStatus(table, articleId, userId) {
  if (!userId) return false;
  return Boolean(db().prepare(`SELECT 1 FROM ${table} WHERE articleId = ? AND userId = ?`).get(articleId, userId));
}

function recordArticleView(articleId, userId) {
  const database = db();
  const viewerId = String(userId || "guest:anonymous").trim();
  const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const recent = database.prepare("SELECT 1 FROM PostView WHERE articleId = ? AND userId = ? AND viewedAt >= ?").get(articleId, viewerId, cutoff);
  if (!recent) {
    database.prepare("INSERT INTO PostView (id, userId, articleId, viewedAt, data) VALUES (?, ?, ?, ?, '{}')")
      .run(local.newId(), viewerId, articleId, local.nowIso());
  }
  const viewsCount = database.prepare("SELECT COUNT(*) AS count FROM PostView WHERE articleId = ?").get(articleId).count;
  database.prepare("UPDATE Article SET viewsCount = ? WHERE id = ?").run(viewsCount, articleId);
  return { viewsCount };
}

function deleteArticle(id) {
  const database = db();
  if (!database.prepare("SELECT id FROM Article WHERE id = ? AND deletedAt IS NULL").get(id)) return false;
  database.transaction(() => {
    database.prepare("DELETE FROM Source WHERE articleId = ?").run(id);
    database.prepare("DELETE FROM Media WHERE articleId = ?").run(id);
    database.prepare("DELETE FROM LikeRecord WHERE articleId = ?").run(id);
    database.prepare("DELETE FROM SaveRecord WHERE articleId = ?").run(id);
    database.prepare("DELETE FROM PostView WHERE articleId = ?").run(id);
    database.prepare("UPDATE Article SET deletedAt = ?, updatedAt = ? WHERE id = ?").run(local.nowIso(), local.nowIso(), id);
  })();
  return true;
}

function listEvents() {
  return db().prepare("SELECT * FROM Event WHERE status = 'ACTIVE' ORDER BY datetime(date) ASC").all();
}

function getEvent(id) {
  return db().prepare("SELECT * FROM Event WHERE id = ? AND status = 'ACTIVE'").get(id) || null;
}

function createEvent(input) {
  const database = db();
  const now = local.nowIso();
  const event = {
    id: local.newId(), title: input.title, description: input.description,
    detailsMessage: input.actionType === "MESSAGE" ? input.detailsMessage || null : null,
    externalLink: input.actionType === "LINK" ? input.externalLink || null : null,
    actionType: input.actionType === "LINK" ? "LINK" : "MESSAGE",
    image: input.image, date: input.date || now, location: input.location || null,
    mode: input.mode || "OFFLINE", creatorId: input.creatorId || null,
    createdAt: now, updatedAt: now,
  };
  database.prepare(`
    INSERT INTO Event (id, title, description, detailsMessage, externalLink, actionType, image, date, location, mode, creatorId, status, featured, engagement, createdAt, updatedAt, data)
    VALUES (@id, @title, @description, @detailsMessage, @externalLink, @actionType, @image, @date, @location, @mode, @creatorId, 'ACTIVE', 0, 0, @createdAt, @updatedAt, @data)
  `).run({ ...event, data: JSON.stringify(input) });
  return getEvent(event.id);
}

function updateEvent(id, input) {
  const database = db();
  const existing = database.prepare("SELECT * FROM Event WHERE id = ?").get(id);
  if (!existing) return null;
  const actionType = input.actionType || existing.actionType;
  database.prepare(`
    UPDATE Event SET title = ?, description = ?, detailsMessage = ?, externalLink = ?, actionType = ?, image = ?, updatedAt = ? WHERE id = ?
  `).run(
    input.title || existing.title, input.description || existing.description,
    actionType === "MESSAGE" ? (input.detailsMessage ?? existing.detailsMessage) : null,
    actionType === "LINK" ? (input.externalLink ?? existing.externalLink) : null,
    actionType, input.image ?? existing.image, local.nowIso(), id
  );
  return database.prepare("SELECT * FROM Event WHERE id = ?").get(id);
}

function deleteEvent(id) {
  const database = db();
  database.prepare("DELETE FROM EventParticipation WHERE eventId = ?").run(id);
  return database.prepare("DELETE FROM Event WHERE id = ?").run(id).changes > 0;
}

function participateInEvent(eventId, userId) {
  const database = db();
  const existing = database.prepare("SELECT * FROM EventParticipation WHERE eventId = ? AND userId = ?").get(eventId, userId);
  if (existing) return { participation: existing, alreadyParticipating: true };
  const participation = { id: local.newId(), eventId, userId, createdAt: local.nowIso() };
  database.prepare("INSERT INTO EventParticipation (id, eventId, userId, createdAt) VALUES (@id, @eventId, @userId, @createdAt)").run(participation);
  return { participation, alreadyParticipating: false };
}

module.exports = {
  articleStatus,
  createArticle,
  createEvent,
  deleteArticle,
  deleteEvent,
  getArticle,
  getEvent,
  hydrateArticle,
  listArticles,
  listEvents,
  participateInEvent,
  recordArticleView,
  toggleArticleLike,
  toggleArticleSave,
  updateArticle,
  updateEvent,
};
