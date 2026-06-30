const local = require("../db/local");
const { SEEDED_PROFILES } = require("../seed_profile_images");

const localOnly =
  process.env.DATABASE_MODE === "local" ||
  process.env.LOCAL_ONLY_DB === "true" ||
  !process.env.DATABASE_URL;
const SHINE_COMMUNITY_MEMBER_TARGET = 2234;

function ensureLocalShineCommunityMembers(db, seededIds, engagementIds, timestamp) {
  const community = db.prepare("SELECT id FROM Community WHERE lower(name) = 'shine' LIMIT 1").get();
  if (!community) return 0;

  const preservedIds = db.prepare(`
    SELECT cm.userId
    FROM CommunityMember cm
    JOIN User u ON u.id = cm.userId
    WHERE cm.communityId = ?
      AND lower(COALESCE(u.provider, '')) NOT IN ('seed', 'engagement')
  `).all(community.id).map((row) => row.userId);
  const mandatoryIds = [...new Set([...preservedIds, ...seededIds])];
  const engagementSlots = Math.max(0, SHINE_COMMUNITY_MEMBER_TARGET - mandatoryIds.length);
  const selectedEngagementIds = engagementIds.slice(0, engagementSlots);
  const insert = db.prepare(`
    INSERT OR IGNORE INTO CommunityMember (id, userId, communityId, role, joinedAt)
    VALUES (?, ?, ?, 'MEMBER', ?)
  `);

  db.transaction(() => {
    db.prepare(`DELETE FROM CommunityMember
      WHERE communityId = ?
        AND userId IN (SELECT id FROM User WHERE provider = 'engagement')`).run(community.id);
    for (const userId of [...seededIds, ...selectedEngagementIds]) {
      insert.run(local.newId(), userId, community.id, timestamp);
    }
  })();

  return db.prepare("SELECT COUNT(*) AS count FROM CommunityMember WHERE communityId = ?").get(community.id).count;
}

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

function seededFollowerTarget(index) {
  let target = 50 + ((index * 941 + 173) % 2451);
  if (target % 10 === 0) target += target === 2500 ? -1 : 1;
  return target;
}

function seededFollowingTarget(index) {
  let target = Math.max(50, Math.min(2500, seededFollowerTarget(index) + ((index * 73) % 241) - 120));
  if (target % 10 === 0) target += target === 2500 ? -1 : 1;
  return target;
}

function anonymousSeedConnectionPairs(seedIds, engagementIds, namedPairs) {
  if (!engagementIds.length) return [];
  const namedFollowerCounts = new Map(seedIds.map((id) => [id, 0]));
  const namedFollowingCounts = new Map(seedIds.map((id) => [id, 0]));
  for (const pair of namedPairs) {
    namedFollowerCounts.set(pair.followingId, (namedFollowerCounts.get(pair.followingId) || 0) + 1);
    namedFollowingCounts.set(pair.followerId, (namedFollowingCounts.get(pair.followerId) || 0) + 1);
  }

  const pairs = [];
  seedIds.forEach((seedId, index) => {
    const followerCount = Math.max(0, seededFollowerTarget(index) - (namedFollowerCounts.get(seedId) || 0));
    const followingCount = Math.max(0, seededFollowingTarget(index) - (namedFollowingCounts.get(seedId) || 0));
    const sequence = Array.from(
      { length: engagementIds.length },
      (_value, offset) => engagementIds[(index * 97 + offset * 13) % engagementIds.length]
    );
    for (let offset = 0; offset < followerCount; offset += 1) {
      pairs.push({ followerId: sequence[offset], followingId: seedId });
    }
    for (let offset = 0; offset < followingCount; offset += 1) {
      pairs.push({ followerId: seedId, followingId: sequence[sequence.length - 1 - offset] });
    }
  });
  return pairs;
}

function primaryUserFriendPairs(primaryUserId, seedIds) {
  if (!primaryUserId) return [];
  const selectedIds = seedIds.filter((_id, index) => index % 4 === 0).slice(0, 12);
  return selectedIds.flatMap((seedId) => [
    { followerId: primaryUserId, followingId: seedId },
    { followerId: seedId, followingId: primaryUserId },
  ]);
}

function primaryUserFakePairs(primaryUserId, engagementIds, namedFriendCount = 12) {
  if (!primaryUserId || !engagementIds.length) return [];
  const followerCount = 1873 - namedFriendCount;
  const followingCount = 1647 - namedFriendCount;
  const sequence = Array.from(
    { length: engagementIds.length },
    (_value, index) => engagementIds[(211 + index * 17) % engagementIds.length]
  );
  return [
    ...sequence.slice(0, followerCount).map((followerId) => ({ followerId, followingId: primaryUserId })),
    ...sequence.slice(sequence.length - followingCount).map((followingId) => ({ followerId: primaryUserId, followingId })),
  ];
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
  const namedPairs = seededFollowPairs(seededUsers.map((user) => user.id));
  const engagementIds = db.prepare("SELECT id FROM User WHERE provider = 'engagement' ORDER BY username").all().map((user) => user.id);
  db.transaction(() => {
    for (const pair of namedPairs) {
      insertFollow.run(local.newId(), pair.followerId, pair.followingId, timestamp);
    }
    db.prepare(`
      DELETE FROM Follows
      WHERE (followerId IN (SELECT id FROM User WHERE provider = 'engagement')
        AND followingId IN (SELECT id FROM User WHERE provider = 'seed'))
         OR (followerId IN (SELECT id FROM User WHERE provider = 'seed')
        AND followingId IN (SELECT id FROM User WHERE provider = 'engagement'))
    `).run();
    for (const pair of anonymousSeedConnectionPairs(seededUsers.map((user) => user.id), engagementIds, namedPairs)) {
      insertFollow.run(local.newId(), pair.followerId, pair.followingId, timestamp);
    }
    const primaryUser = db.prepare("SELECT id FROM User WHERE lower(username) = 'nezarismail'").get();
    for (const pair of primaryUserFriendPairs(primaryUser?.id, seededUsers.map((user) => user.id))) {
      insertFollow.run(local.newId(), pair.followerId, pair.followingId, timestamp);
    }
    if (primaryUser) {
      db.prepare(`
        DELETE FROM Follows
        WHERE (followerId = ? AND followingId IN (SELECT id FROM User WHERE provider = 'engagement'))
           OR (followingId = ? AND followerId IN (SELECT id FROM User WHERE provider = 'engagement'))
      `).run(primaryUser.id, primaryUser.id);
      for (const pair of primaryUserFakePairs(primaryUser.id, engagementIds)) {
        insertFollow.run(local.newId(), pair.followerId, pair.followingId, timestamp);
      }
    }
  })();
  ensureLocalShineCommunityMembers(
    db,
    seededUsers.map((user) => user.id),
    engagementIds,
    timestamp
  );
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
  const namedPairs = seededFollowPairs(orderedIds);
  await prisma.follows.createMany({ data: namedPairs, skipDuplicates: true });
  const engagementUsers = await prisma.user.findMany({
    where: { provider: "engagement" },
    orderBy: { username: "asc" },
    select: { id: true },
  });
  const shineCommunity = await prisma.community.findFirst({
    where: { name: { equals: "Shine", mode: "insensitive" } },
    select: { id: true },
  });
  if (shineCommunity) {
    const preserved = await prisma.communityMember.findMany({
      where: {
        communityId: shineCommunity.id,
        user: { provider: { notIn: ["seed", "engagement"] } },
      },
      select: { userId: true },
    });
    const mandatoryIds = [...new Set([...preserved.map((row) => row.userId), ...orderedIds])];
    const engagementSlots = Math.max(0, SHINE_COMMUNITY_MEMBER_TARGET - mandatoryIds.length);
    await prisma.communityMember.deleteMany({
      where: { communityId: shineCommunity.id, user: { provider: "engagement" } },
    });
    await prisma.communityMember.createMany({
      data: [
        ...orderedIds.map((userId) => ({ userId, communityId: shineCommunity.id })),
        ...engagementUsers.slice(0, engagementSlots).map(({ id: userId }) => ({ userId, communityId: shineCommunity.id })),
      ],
      skipDuplicates: true,
    });
  }
  await prisma.follows.deleteMany({
    where: {
      OR: [
        { follower: { provider: "engagement" }, following: { provider: "seed" } },
        { follower: { provider: "seed" }, following: { provider: "engagement" } },
      ],
    },
  });
  const anonymousPairs = anonymousSeedConnectionPairs(orderedIds, engagementUsers.map((user) => user.id), namedPairs);
  for (let start = 0; start < anonymousPairs.length; start += 1000) {
    await prisma.follows.createMany({ data: anonymousPairs.slice(start, start + 1000), skipDuplicates: true });
  }
  const primaryUser = await prisma.user.findUnique({ where: { username: "nezarismail" }, select: { id: true } });
  if (primaryUser) {
    await prisma.follows.deleteMany({
      where: {
        OR: [
          { followerId: primaryUser.id, following: { provider: "engagement" } },
          { followingId: primaryUser.id, follower: { provider: "engagement" } },
        ],
      },
    });
    await prisma.follows.createMany({
      data: [
        ...primaryUserFriendPairs(primaryUser.id, orderedIds),
        ...primaryUserFakePairs(primaryUser.id, engagementUsers.map((user) => user.id)),
      ],
      skipDuplicates: true,
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
  seededFollowerTarget,
  seededFollowingTarget,
  SHINE_COMMUNITY_MEMBER_TARGET,
};
