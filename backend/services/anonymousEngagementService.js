const local = require("../db/local");

const localOnly =
  process.env.DATABASE_MODE === "local" ||
  process.env.LOCAL_ONLY_DB === "true" ||
  !process.env.DATABASE_URL;
const configuredCount = Number(process.env.ANONYMOUS_ENGAGEMENT_USERS || 5000);
const targetCount = Math.max(5000, Math.min(Number.isFinite(configuredCount) ? configuredCount : 5000, 10000));

function anonymousIdentity(index) {
  const code = 100000 + ((354353 + index * 7919) % 900000);
  return {
    username: `user_${code}`,
    email: `user_${code}@engagement.shine.local`,
    name: `User ${code}`,
  };
}

function seedLocalAccounts() {
  const db = local.getDb();
  if (!db) throw new Error("Local SQLite is not ready.");
  const existingCount = db.prepare("SELECT COUNT(*) AS count FROM User WHERE provider = 'engagement'").get().count;
  if (existingCount >= targetCount) return existingCount;

  const now = local.nowIso();
  const insert = db.prepare(`
    INSERT OR IGNORE INTO User (
      id, email, username, name, provider, image, description,
      isAuthorized, isSupporter, roleLevel, createdAt, updatedAt, data
    ) VALUES (
      @id, @email, @username, @name, 'engagement', NULL, '',
      1, 0, 'Starter', @createdAt, @updatedAt, @data
    )
  `);
  db.transaction(() => {
    for (let index = 0; index < targetCount; index += 1) {
      const identity = anonymousIdentity(index);
      insert.run({
        id: local.newId(),
        ...identity,
        createdAt: now,
        updatedAt: now,
        data: JSON.stringify({ anonymousEngagement: true }),
      });
    }
  })();
  return db.prepare("SELECT COUNT(*) AS count FROM User WHERE provider = 'engagement'").get().count;
}

async function seedCloudAccounts(prisma) {
  const existingCount = await prisma.user.count({ where: { provider: "engagement" } });
  if (existingCount >= targetCount) return existingCount;

  const records = Array.from({ length: targetCount }, (_, index) => ({
    ...anonymousIdentity(index),
    provider: "engagement",
    description: "",
    isAuthorized: true,
  }));
  for (let start = 0; start < records.length; start += 500) {
    await prisma.user.createMany({ data: records.slice(start, start + 500), skipDuplicates: true });
  }
  return prisma.user.count({ where: { provider: "engagement" } });
}

async function ensureAnonymousEngagementAccounts(prisma = null) {
  if (localOnly) return seedLocalAccounts();
  if (!prisma) throw new Error("Prisma is required outside local mode.");
  return seedCloudAccounts(prisma);
}

async function getAnonymousEngagementAccounts(prisma = null) {
  await ensureAnonymousEngagementAccounts(prisma);
  if (localOnly) {
    return local.getDb().prepare("SELECT id, username FROM User WHERE provider = 'engagement' ORDER BY username LIMIT ?").all(targetCount);
  }
  return prisma.user.findMany({ where: { provider: "engagement" }, select: { id: true, username: true }, take: targetCount });
}

module.exports = {
  anonymousIdentity,
  ensureAnonymousEngagementAccounts,
  getAnonymousEngagementAccounts,
  targetCount,
};
