const local = require("../db/local");

const localOnly =
  process.env.DATABASE_MODE === "local" ||
  process.env.LOCAL_ONLY_DB === "true" ||
  !process.env.DATABASE_URL;

async function sendSystemMessage(userId, content, link = "/messenger", prisma = null) {
  if (!userId || !content) return null;
  if (localOnly) {
    const notification = {
      id: local.newId(),
      userId,
      type: "SYSTEM",
      content,
      link,
      createdAt: local.nowIso(),
    };
    local.getDb().prepare(`
      INSERT INTO Notification (id, userId, type, content, link, isRead, createdAt)
      VALUES (@id, @userId, @type, @content, @link, 0, @createdAt)
    `).run(notification);
    return notification;
  }
  return prisma.notification.create({ data: { userId, type: "SYSTEM", content, link } });
}

module.exports = { sendSystemMessage };
