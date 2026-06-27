const local = require("../db/local");
const { SEEDED_PROFILES } = require("../seed_profile_images");

const localOnly =
  process.env.DATABASE_MODE === "local" ||
  process.env.LOCAL_ONLY_DB === "true" ||
  !process.env.DATABASE_URL;

function seedLocalAccounts() {
  const db = local.getDb();
  if (!db) throw new Error("Local SQLite is not ready.");
  const timestamp = local.nowIso();
  const upsert = db.prepare(`
    INSERT INTO User (
      id, email, username, name, provider, image, description,
      isAuthorized, isSupporter, roleLevel, createdAt, updatedAt, data
    ) VALUES (
      @id, @email, @username, @name, 'seed', @image, @description,
      1, 0, 'Starter', @createdAt, @updatedAt, @data
    )
    ON CONFLICT(id) DO UPDATE SET
      email = excluded.email,
      name = excluded.name,
      provider = 'seed',
      image = excluded.image,
      description = excluded.description,
      isAuthorized = 1,
      updatedAt = excluded.updatedAt,
      data = excluded.data
  `);

  const transaction = db.transaction(() => {
    for (const profile of SEEDED_PROFILES) {
      const existing = db.prepare("SELECT id, createdAt FROM User WHERE username = ?").get(profile.username);
      upsert.run({
        id: existing?.id || local.newId(),
        email: `${profile.username}@mock.shine.local`,
        username: profile.username,
        name: profile.name,
        image: profile.image,
        description: profile.description,
        createdAt: existing?.createdAt || timestamp,
        updatedAt: timestamp,
        data: JSON.stringify({ seeded: true }),
      });
    }
  });
  transaction();
  return SEEDED_PROFILES.length;
}

async function seedCloudAccounts(prisma) {
  for (const profile of SEEDED_PROFILES) {
    await prisma.user.upsert({
      where: { username: profile.username },
      update: {
        name: profile.name,
        description: profile.description,
        email: `${profile.username}@mock.shine.local`,
        provider: "seed",
        isAuthorized: true,
        image: profile.image,
      },
      create: {
        name: profile.name,
        username: profile.username,
        description: profile.description,
        email: `${profile.username}@mock.shine.local`,
        provider: "seed",
        image: profile.image,
        isAuthorized: true,
      },
    });
  }
  return SEEDED_PROFILES.length;
}

async function ensureSeededAccounts(prisma = null) {
  if (localOnly) return seedLocalAccounts();
  if (!prisma) throw new Error("Prisma is required outside local mode.");
  return seedCloudAccounts(prisma);
}

function getLocalSeededAccounts() {
  const db = local.getDb();
  if (!db) return [];
  return db.prepare("SELECT * FROM User WHERE provider = 'seed' ORDER BY createdAt ASC LIMIT 50").all();
}

module.exports = {
  ensureSeededAccounts,
  getLocalSeededAccounts,
  seedLocalAccounts,
};
