const local = require("../db/local");
const { SEEDED_PROFILES } = require("../seed_profile_images");

const localOnly =
  process.env.DATABASE_MODE === "local" ||
  process.env.LOCAL_ONLY_DB === "true" ||
  !process.env.DATABASE_URL;

function seededFollowPairs(userIds) {
  const pairs = [];
  for (let index = 0; index < userIds.length; index += 1) {
    const targetCount = 4 + ((index * 7) % 9);
    const targets = new Set();
    let step = 1;
    while (targets.size < Math.min(targetCount, userIds.length - 1)) {
      const targetIndex = (index + step * 11 + index * 3) % userIds.length;
      if (targetIndex !== index) targets.add(targetIndex);
      step += 1;
    }
    for (const targetIndex of targets) {
      pairs.push({ followerId: userIds[index], followingId: userIds[targetIndex] });
    }
  }
  return pairs;
}

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
  const seededUsers = SEEDED_PROFILES
    .map((profile) => db.prepare("SELECT id FROM User WHERE username = ? AND provider = 'seed'").get(profile.username))
    .filter(Boolean);
  const insertFollow = db.prepare(`
    INSERT OR IGNORE INTO Follows (id, followerId, followingId, createdAt)
    VALUES (?, ?, ?, ?)
  `);
  db.transaction(() => {
    for (const pair of seededFollowPairs(seededUsers.map((user) => user.id))) {
      insertFollow.run(local.newId(), pair.followerId, pair.followingId, timestamp);
    }
  })();
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
  const users = await prisma.user.findMany({
    where: { username: { in: SEEDED_PROFILES.map((profile) => profile.username) }, provider: "seed" },
    select: { id: true, username: true },
  });
  const byUsername = new Map(users.map((user) => [user.username, user.id]));
  const orderedIds = SEEDED_PROFILES.map((profile) => byUsername.get(profile.username)).filter(Boolean);
  await prisma.follows.createMany({ data: seededFollowPairs(orderedIds), skipDuplicates: true });
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
