const local = require("../db/local");
const { SEEDED_PROFILES } = require("../seed_profile_images");

const localOnly =
  process.env.DATABASE_MODE === "local" ||
  process.env.LOCAL_ONLY_DB === "true" ||
  !process.env.DATABASE_URL;
const SHINE_COMMUNITY_MEMBER_TARGET = 223;

const SEEDED_COMMUNITIES = [
  {
    key: "civic_room",
    name: "Civic Room",
    slogan: "City politics without the shouting.",
    discription: "A practical community for local policy, housing, transit, taxes, and civic life.",
    interests: ["local politics", "housing", "public policy"],
    status: "PUBLIC",
    icon: "https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=300&q=80",
    banner: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=1400&q=80",
    memberTarget: 136,
  },
  {
    key: "atlas_forum",
    name: "Atlas Forum",
    slogan: "Maps, borders, power.",
    discription: "Geopolitics, diplomacy, alliances, sanctions, conflict tracking, and sourced analysis.",
    interests: ["geopolitics", "diplomacy", "security"],
    status: "PUBLIC",
    icon: "https://images.unsplash.com/photo-1521295121783-8a321d551ad2?auto=format&fit=crop&w=300&q=80",
    banner: "https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=1400&q=80",
    memberTarget: 174,
  },
  {
    key: "policy_cafe",
    name: "Policy Cafe",
    slogan: "Quiet arguments, good sources.",
    discription: "A slower space for people who want policy debates with context and less noise.",
    interests: ["policy", "economics", "debate"],
    status: "PUBLIC",
    icon: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=300&q=80",
    banner: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=80",
    memberTarget: 119,
  },
  {
    key: "energy_watch",
    name: "Energy Watch",
    slogan: "Oil, grids, climate, prices.",
    discription: "Energy markets, renewables, oil routes, climate tradeoffs, and supply-chain pressure.",
    interests: ["energy", "climate", "markets"],
    status: "PUBLIC",
    icon: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=300&q=80",
    banner: "https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=1400&q=80",
    memberTarget: 151,
  },
  {
    key: "middle_east_desk",
    name: "Middle East Desk",
    slogan: "Regional voices and careful context.",
    discription: "A community for Middle East politics, regional diplomacy, civil society, and security.",
    interests: ["middle east", "regional politics", "diplomacy"],
    status: "PUBLIC",
    icon: "https://images.unsplash.com/photo-1512632578888-169bbbc64f33?auto=format&fit=crop&w=300&q=80",
    banner: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1400&q=80",
    memberTarget: 144,
  },
  {
    key: "eu_room",
    name: "EU Room",
    slogan: "Brussels, borders, budgets.",
    discription: "European politics, elections, defense, migration, regulation, and public opinion.",
    interests: ["europe", "eu politics", "regulation"],
    status: "PUBLIC",
    icon: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=300&q=80",
    banner: "https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&w=1400&q=80",
    memberTarget: 128,
  },
  {
    key: "verified_sources_lab",
    name: "Verified Sources Lab",
    slogan: "Private source-checking room.",
    discription: "A private workspace for checking claims, links, context, and source quality before posting.",
    interests: ["sources", "fact checking", "moderation"],
    status: "PRIVATE",
    icon: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=300&q=80",
    banner: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1400&q=80",
    memberTarget: 58,
  },
  {
    key: "organizers_backchannel",
    name: "Organizers Backchannel",
    slogan: "Private planning, public impact.",
    discription: "A private planning community for civic organizers and community managers.",
    interests: ["organizing", "events", "community"],
    status: "PRIVATE",
    icon: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=300&q=80",
    banner: "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1400&q=80",
    memberTarget: 64,
  },
];

function pickMembers(ids, target, offset = 0) {
  if (!ids.length) return [];
  const limit = Math.min(target, ids.length);
  return Array.from({ length: limit }, (_value, index) => ids[(offset + index * 7) % ids.length]);
}

function ensureLocalShineCommunityMembers(db, seededIds, timestamp) {
  const community = db.prepare("SELECT id FROM Community WHERE lower(name) = 'shine' LIMIT 1").get();
  if (!community) return 0;

  const preservedIds = db.prepare(`
    SELECT cm.userId
    FROM CommunityMember cm
    JOIN User u ON u.id = cm.userId
    WHERE cm.communityId = ?
      AND lower(COALESCE(u.provider, '')) != 'seed'
  `).all(community.id).map((row) => row.userId);
  const selectedSeedIds = pickMembers(seededIds, SHINE_COMMUNITY_MEMBER_TARGET, 0);
  const mandatoryIds = [...new Set([...preservedIds, ...selectedSeedIds])].slice(0, SHINE_COMMUNITY_MEMBER_TARGET);
  const insert = db.prepare(`
    INSERT OR IGNORE INTO CommunityMember (id, userId, communityId, role, joinedAt)
    VALUES (?, ?, ?, 'MEMBER', ?)
  `);

  db.transaction(() => {
    db.prepare(`DELETE FROM CommunityMember
      WHERE communityId = ?
        AND userId IN (SELECT id FROM User WHERE provider = 'seed')`).run(community.id);
    for (const userId of mandatoryIds) {
      insert.run(local.newId(), userId, community.id, timestamp);
    }
  })();

  return db.prepare("SELECT COUNT(*) AS count FROM CommunityMember WHERE communityId = ?").get(community.id).count;
}

function seededFollowPairs(userIds) {
  const pairs = [];
  for (let index = 0; index < userIds.length; index += 1) {
    const targetCount = 38 + ((index * 13) % 44);
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
  let target = 54 + ((index * 29 + 17) % 142);
  if (target % 10 === 0) target += 3;
  return target;
}

function seededFollowingTarget(index) {
  let target = Math.max(45, Math.min(205, seededFollowerTarget(index) + ((index * 17) % 37) - 18));
  if (target % 10 === 0) target += 3;
  return target;
}

function primaryUserFriendPairs(primaryUserId, seedIds) {
  if (!primaryUserId) return [];
  const selectedIds = seedIds.filter((_id, index) => index % 3 === 0).slice(0, 54);
  return selectedIds.flatMap((seedId) => [
    { followerId: primaryUserId, followingId: seedId },
    { followerId: seedId, followingId: primaryUserId },
  ]);
}

function primaryUserSeedPairs(primaryUserId, seedIds, namedFriendCount = 54) {
  if (!primaryUserId || !seedIds.length) return [];
  const followerCount = Math.min(181 - namedFriendCount, seedIds.length);
  const followingCount = Math.min(167 - namedFriendCount, seedIds.length);
  const sequence = Array.from({ length: seedIds.length }, (_value, index) => seedIds[(17 + index * 11) % seedIds.length]);
  return [
    ...sequence.slice(0, followerCount).map((followerId) => ({ followerId, followingId: primaryUserId })),
    ...sequence.slice(sequence.length - followingCount).map((followingId) => ({ followerId: primaryUserId, followingId })),
  ];
}

function cleanupLocalEngagementAccounts(db) {
  const count = db.prepare("SELECT COUNT(*) AS count FROM User WHERE provider = 'engagement' OR username LIKE 'guest_engagement_%'").get().count;
  if (!count) return 0;
  db.transaction(() => {
    db.exec("DROP TABLE IF EXISTS temp.CleanupEngagementIds");
    db.exec("CREATE TEMP TABLE CleanupEngagementIds (id TEXT PRIMARY KEY)");
    db.exec("INSERT INTO CleanupEngagementIds SELECT id FROM User WHERE provider = 'engagement' OR username LIKE 'guest_engagement_%'");
    db.exec("DELETE FROM LikeRecord WHERE userId IN (SELECT id FROM CleanupEngagementIds)");
    db.exec("DELETE FROM SaveRecord WHERE userId IN (SELECT id FROM CleanupEngagementIds)");
    db.exec("DELETE FROM ShareRecord WHERE userId IN (SELECT id FROM CleanupEngagementIds)");
    db.exec("DELETE FROM PostView WHERE userId IN (SELECT id FROM CleanupEngagementIds)");
    db.exec("DELETE FROM PollVote WHERE userId IN (SELECT id FROM CleanupEngagementIds)");
    db.exec("DELETE FROM Comment WHERE authorId IN (SELECT id FROM CleanupEngagementIds)");
    db.exec("DELETE FROM Follows WHERE followerId IN (SELECT id FROM CleanupEngagementIds) OR followingId IN (SELECT id FROM CleanupEngagementIds)");
    db.exec("DELETE FROM CommunityMember WHERE userId IN (SELECT id FROM CleanupEngagementIds)");
    db.exec("DELETE FROM CommunityRequest WHERE userId IN (SELECT id FROM CleanupEngagementIds)");
    db.exec("DELETE FROM User WHERE id IN (SELECT id FROM CleanupEngagementIds)");
    db.exec("DROP TABLE IF EXISTS temp.CleanupEngagementIds");
  })();
  return count;
}

function ensureLocalCommunities(db, seededIds, timestamp) {
  if (!seededIds.length) return 0;
  const insertCommunity = db.prepare(`
    INSERT INTO Community (id, name, interestsJson, slogan, discription, icon, banner, status, featured, engagement, creatorId, data)
    VALUES (@id, @name, @interestsJson, @slogan, @discription, @icon, @banner, @status, @featured, @engagement, @creatorId, @data)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      interestsJson = excluded.interestsJson,
      slogan = excluded.slogan,
      discription = excluded.discription,
      icon = excluded.icon,
      banner = excluded.banner,
      status = excluded.status,
      featured = excluded.featured,
      engagement = excluded.engagement,
      creatorId = excluded.creatorId,
      data = excluded.data
  `);
  const insertMember = db.prepare(`
    INSERT OR IGNORE INTO CommunityMember (id, userId, communityId, role, joinedAt)
    VALUES (?, ?, ?, ?, ?)
  `);

  db.transaction(() => {
    SEEDED_COMMUNITIES.forEach((community, index) => {
      const existing = db.prepare("SELECT id FROM Community WHERE lower(name) = lower(?)").get(community.name);
      const id = existing?.id || `seed-community-${community.key}`;
      const creatorId = seededIds[(index * 19) % seededIds.length];
      insertCommunity.run({
        id,
        name: community.name,
        interestsJson: JSON.stringify(community.interests),
        slogan: community.slogan,
        discription: community.discription,
        icon: community.icon,
        banner: community.banner,
        status: community.status,
        featured: community.status === "PUBLIC" ? 1 : 0,
        engagement: community.memberTarget * (index + 3),
        creatorId,
        data: JSON.stringify({ seededCommunity: true, key: community.key }),
      });
      db.prepare("DELETE FROM CommunityMember WHERE communityId = ? AND userId IN (SELECT id FROM User WHERE provider = 'seed')").run(id);
      insertMember.run(local.newId(), creatorId, id, "MAIN_ADMIN", timestamp);
      pickMembers(seededIds, community.memberTarget, index * 23).forEach((userId) => {
        if (userId !== creatorId) insertMember.run(local.newId(), userId, id, "MEMBER", timestamp);
      });
    });
  })();
  return SEEDED_COMMUNITIES.length;
}

function naturalCount(seed, min, max) {
  const span = max - min + 1;
  let value = min + ((seed * 37 + 19) % span);
  if (value % 50 === 0) value += 7;
  if (value > max) value = max - 3;
  return value;
}

function engagementPlan(index, actorCount) {
  const maxViews = Math.max(80, Math.min(360, actorCount + 95));
  const views = naturalCount(index + 3, 48, maxViews);
  const likes = Math.min(actorCount, naturalCount(index + 11, 12, Math.max(13, Math.floor(views * (0.35 + (index % 5) * 0.08)))));
  const comments = naturalCount(index + 5, 1, 7);
  const shares = naturalCount(index + 7, 1, Math.max(2, Math.floor(views * 0.08)));
  return { views, likes, comments, shares };
}

function engagementUsers(seedIds, count, offset) {
  if (!seedIds.length || count <= 0) return [];
  return Array.from({ length: count }, (_value, index) => seedIds[(offset + index * 13) % seedIds.length]);
}

const COMMENT_SNIPPETS = [
  "This is the part people keep skipping when they talk about policy.",
  "The source matters here, but the political reaction matters just as much.",
  "I agree with the concern, though the timeline feels more complicated.",
  "This connects with what local officials have been warning about too.",
  "The public messaging around this has been really poor.",
  "Hard to separate the economics from the security angle on this one.",
  "I want more context, but the direction is worrying.",
  "The second-order effects are probably bigger than the headline.",
  "This is why trust in institutions keeps dropping.",
  "People are going to feel this in normal daily life first.",
];

function normalizeLocalSeedEngagement(db, seedIds) {
  if (!seedIds.length) return 0;
  const posts = db.prepare(`
    SELECT p.id, p.type
    FROM Post p
    JOIN User u ON u.id = p.authorId
    WHERE u.provider = 'seed' AND p.deletedAt IS NULL
    ORDER BY datetime(p.createdAt) ASC
  `).all();
  const publicCommunityIds = db.prepare(`
    SELECT id
    FROM Community
    WHERE status = 'PUBLIC'
      AND (lower(name) = 'shine' OR json_extract(COALESCE(data, '{}'), '$.seededCommunity') = 1)
    ORDER BY CASE WHEN lower(name) = 'shine' THEN 0 ELSE 1 END, name
  `).all().map((row) => row.id);
  const now = Date.now();
  db.transaction(() => {
    for (const [index, post] of posts.entries()) {
      const plan = engagementPlan(index, seedIds.length);
      const viewers = engagementUsers(seedIds, plan.views, index * 5);
      const likers = [...new Set(viewers)].slice(0, plan.likes);
      const sharers = engagementUsers(seedIds, plan.shares, index * 11);
      const commenters = engagementUsers(seedIds, plan.comments, index * 17);
      const communityId = index % 4 === 0 && publicCommunityIds.length
        ? publicCommunityIds[(index / 4) % publicCommunityIds.length]
        : null;

      db.prepare("DELETE FROM LikeRecord WHERE postId = ? AND userId IN (SELECT id FROM User WHERE provider = 'seed')").run(post.id);
      db.prepare("DELETE FROM ShareRecord WHERE postId = ? AND userId IN (SELECT id FROM User WHERE provider = 'seed')").run(post.id);
      db.prepare("DELETE FROM PostView WHERE postId = ? AND userId IN (SELECT id FROM User WHERE provider = 'seed')").run(post.id);

      viewers.forEach((userId, viewIndex) => {
        db.prepare("INSERT INTO PostView (id, userId, postId, viewedAt, data) VALUES (?, ?, ?, ?, '{}')")
          .run(local.newId(), userId, post.id, new Date(now - (index * 600000 + viewIndex * 11000)).toISOString());
      });
      likers.forEach((userId) => {
        db.prepare("INSERT OR IGNORE INTO LikeRecord (id, userId, postId, createdAt, data) VALUES (?, ?, ?, ?, '{}')")
          .run(local.newId(), userId, post.id, local.nowIso());
      });
      sharers.forEach((userId) => {
        db.prepare("INSERT INTO ShareRecord (id, userId, postId, createdAt, data) VALUES (?, ?, ?, ?, '{}')")
          .run(local.newId(), userId, post.id, local.nowIso());
      });
      const currentComments = db.prepare("SELECT COUNT(*) AS count FROM Comment WHERE postId = ? AND deletedAt IS NULL").get(post.id).count;
      if (currentComments < plan.comments) {
        commenters.slice(0, plan.comments - currentComments).forEach((userId, commentIndex) => {
          db.prepare(`INSERT INTO Comment (id, postId, authorId, text, createdAt, updatedAt, likesCount, repliesCount, data) VALUES (?, ?, ?, ?, ?, ?, 0, 0, '{}')`)
            .run(local.newId(), post.id, userId, COMMENT_SNIPPETS[(index + commentIndex) % COMMENT_SNIPPETS.length], local.nowIso(), local.nowIso());
        });
      }
      const counts = db.prepare(`
        SELECT
          (SELECT COUNT(*) FROM LikeRecord WHERE postId = ?) AS likes,
          (SELECT COUNT(*) FROM Comment WHERE postId = ? AND deletedAt IS NULL) AS comments,
          (SELECT COUNT(*) FROM ShareRecord WHERE postId = ?) AS shares,
          (SELECT COUNT(*) FROM PostView WHERE postId = ?) AS views
      `).get(post.id, post.id, post.id, post.id);
      db.prepare("UPDATE Post SET communityId = ?, likesCount = ?, commentsCount = ?, sharesCount = ?, viewsCount = ?, engagement = ? WHERE id = ?")
        .run(communityId, counts.likes, counts.comments, counts.shares, counts.views, counts.likes + counts.comments * 2 + counts.shares * 3 + counts.views, post.id);
    }
  })();
  return posts.length;
}

function normalizeLocalArticleDates(db) {
  const articles = db.prepare(`
    SELECT a.id
    FROM Article a
    JOIN User u ON u.id = a.authorId
    WHERE u.provider = 'seed' AND a.deletedAt IS NULL
    ORDER BY datetime(a.createdAt) ASC
  `).all();
  const offsets = [-42, -35, -28, -21, -14, -8, -3, 2, 9, 16];
  const now = new Date();
  db.transaction(() => {
    articles.forEach((article, index) => {
      const date = new Date(now);
      date.setDate(now.getDate() + offsets[index % offsets.length]);
      date.setHours(10 + (index % 8), 15 + (index % 5) * 7, 0, 0);
      db.prepare("UPDATE Article SET createdAt = ?, updatedAt = ? WHERE id = ?").run(date.toISOString(), date.toISOString(), article.id);
    });
  })();
  return articles.length;
}

async function cleanupCloudEngagementAccounts(prisma) {
  const users = await prisma.user.findMany({
    where: { OR: [{ provider: "engagement" }, { username: { startsWith: "guest_engagement_" } }] },
    select: { id: true },
  });
  const ids = users.map((user) => user.id);
  if (!ids.length) return 0;
  await prisma.$transaction([
    prisma.like.deleteMany({ where: { userId: { in: ids } } }),
    prisma.save.deleteMany({ where: { userId: { in: ids } } }),
    prisma.share.deleteMany({ where: { userId: { in: ids } } }),
    prisma.postView.deleteMany({ where: { userId: { in: ids } } }),
    prisma.comment.deleteMany({ where: { authorId: { in: ids } } }),
    prisma.notification.deleteMany({ where: { userId: { in: ids } } }),
    prisma.follows.deleteMany({ where: { OR: [{ followerId: { in: ids } }, { followingId: { in: ids } }] } }),
    prisma.communityMember.deleteMany({ where: { userId: { in: ids } } }),
    prisma.communityRequest.deleteMany({ where: { userId: { in: ids } } }),
  ]);
  for (let start = 0; start < ids.length; start += 500) {
    const batch = ids.slice(start, start + 500);
    await prisma.$executeRawUnsafe(
      `DELETE FROM "_PollOptionToUser" WHERE "B" IN (${batch.map((_, index) => `$${index + 1}`).join(",")})`,
      ...batch
    );
    await prisma.user.deleteMany({ where: { id: { in: batch } } });
  }
  return ids.length;
}

async function ensureCloudCommunities(prisma, seedIds) {
  if (!seedIds.length) return 0;
  for (const [index, community] of SEEDED_COMMUNITIES.entries()) {
    const creatorId = seedIds[(index * 19) % seedIds.length];
    const saved = await prisma.community.upsert({
      where: { id: `seed-community-${community.key}` },
      update: {
        name: community.name,
        slogan: community.slogan,
        discription: community.discription,
        interests: community.interests,
        icon: community.icon,
        banner: community.banner,
        status: community.status,
        featured: community.status === "PUBLIC",
        engagement: community.memberTarget * (index + 3),
        creatorId,
      },
      create: {
        id: `seed-community-${community.key}`,
        name: community.name,
        slogan: community.slogan,
        discription: community.discription,
        interests: community.interests,
        icon: community.icon,
        banner: community.banner,
        status: community.status,
        featured: community.status === "PUBLIC",
        engagement: community.memberTarget * (index + 3),
        creatorId,
      },
    });
    await prisma.communityMember.deleteMany({ where: { communityId: saved.id, user: { provider: "seed" } } });
    const members = pickMembers(seedIds, community.memberTarget, index * 23);
    await prisma.communityMember.createMany({
      data: [
        { userId: creatorId, communityId: saved.id, role: "MAIN_ADMIN" },
        ...members.filter((userId) => userId !== creatorId).map((userId) => ({ userId, communityId: saved.id, role: "MEMBER" })),
      ],
      skipDuplicates: true,
    });
  }
  return SEEDED_COMMUNITIES.length;
}

async function normalizeCloudSeedEngagement(prisma, seedIds) {
  if (!seedIds.length) return 0;
  const publicCommunities = await prisma.community.findMany({
    where: {
      status: "PUBLIC",
      OR: [
        { name: { equals: "Shine", mode: "insensitive" } },
        { id: { startsWith: "seed-community-" } },
      ],
    },
    select: { id: true },
    orderBy: { name: "asc" },
  });
  const publicCommunityIds = publicCommunities.map((community) => community.id);
  const posts = await prisma.post.findMany({
    where: { author: { provider: "seed" } },
    orderBy: { createdAt: "asc" },
    select: { id: true, type: true },
  });
  for (const [index, post] of posts.entries()) {
    const plan = engagementPlan(index, seedIds.length);
    const viewers = engagementUsers(seedIds, plan.views, index * 5);
    const likers = [...new Set(viewers)].slice(0, plan.likes);
    const sharers = engagementUsers(seedIds, plan.shares, index * 11);
    const commenters = engagementUsers(seedIds, plan.comments, index * 17);
    const communityId = index % 4 === 0 && publicCommunityIds.length
      ? publicCommunityIds[Math.floor(index / 4) % publicCommunityIds.length]
      : null;
    await prisma.$transaction([
      prisma.like.deleteMany({ where: { postId: post.id, user: { provider: "seed" } } }),
      prisma.share.deleteMany({ where: { postId: post.id, user: { provider: "seed" } } }),
      prisma.postView.deleteMany({ where: { postId: post.id, user: { provider: "seed" } } }),
    ]);
    const baseTime = Date.now() - index * 600000;
    await prisma.postView.createMany({
      data: viewers.map((userId, viewIndex) => ({ userId, postId: post.id, viewedAt: new Date(baseTime - viewIndex * 11000) })),
    });
    await prisma.like.createMany({
      data: likers.map((userId) => ({ userId, postId: post.id })),
      skipDuplicates: true,
    });
    await prisma.share.createMany({
      data: sharers.map((userId) => ({ userId, postId: post.id })),
    });
    const currentComments = await prisma.comment.count({ where: { postId: post.id } });
    if (currentComments < plan.comments) {
      await prisma.comment.createMany({
        data: commenters.slice(0, plan.comments - currentComments).map((authorId, commentIndex) => ({
          authorId,
          postId: post.id,
          text: COMMENT_SNIPPETS[(index + commentIndex) % COMMENT_SNIPPETS.length],
        })),
      });
    }
    const [likes, comments, shares, views] = await Promise.all([
      prisma.like.count({ where: { postId: post.id } }),
      prisma.comment.count({ where: { postId: post.id } }),
      prisma.share.count({ where: { postId: post.id } }),
      prisma.postView.count({ where: { postId: post.id } }),
    ]);
    await prisma.post.update({
      where: { id: post.id },
      data: { communityId, engagement: likes + comments * 2 + shares * 3 + views },
    });
  }
  return posts.length;
}

async function normalizeCloudArticleDates(prisma) {
  const articles = await prisma.article.findMany({
    where: { author: { provider: "seed" } },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  const offsets = [-42, -35, -28, -21, -14, -8, -3, 2, 9, 16];
  const now = new Date();
  for (const [index, article] of articles.entries()) {
    const date = new Date(now);
    date.setDate(now.getDate() + offsets[index % offsets.length]);
    date.setHours(10 + (index % 8), 15 + (index % 5) * 7, 0, 0);
    await prisma.article.update({
      where: { id: article.id },
      data: { createdAt: date, updatedAt: date },
    });
  }
  return articles.length;
}

function seedLocalAccounts() {
  const db = local.getDb();
  if (!db) throw new Error("Local SQLite is not ready.");
  const timestamp = local.nowIso();
  cleanupLocalEngagementAccounts(db);
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
        data: JSON.stringify({ seeded: true, region: profile.region, gender: profile.gender }),
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
  db.transaction(() => {
    db.prepare(`
      DELETE FROM Follows
      WHERE (followerId IN (SELECT id FROM User WHERE provider = 'seed')
        AND followingId IN (SELECT id FROM User WHERE provider = 'seed'))
    `).run();
    for (const pair of namedPairs) {
      insertFollow.run(local.newId(), pair.followerId, pair.followingId, timestamp);
    }
    const primaryUser = db.prepare("SELECT id FROM User WHERE lower(username) = 'nezarismail'").get();
    for (const pair of primaryUserFriendPairs(primaryUser?.id, seededUsers.map((user) => user.id))) {
      insertFollow.run(local.newId(), pair.followerId, pair.followingId, timestamp);
    }
    if (primaryUser) {
      db.prepare(`
        DELETE FROM Follows
        WHERE (followerId = ? AND followingId IN (SELECT id FROM User WHERE provider = 'seed'))
           OR (followingId = ? AND followerId IN (SELECT id FROM User WHERE provider = 'seed'))
      `).run(primaryUser.id, primaryUser.id);
      for (const pair of [...primaryUserFriendPairs(primaryUser.id, seededUsers.map((user) => user.id)), ...primaryUserSeedPairs(primaryUser.id, seededUsers.map((user) => user.id))]) {
        insertFollow.run(local.newId(), pair.followerId, pair.followingId, timestamp);
      }
    }
  })();
  ensureLocalShineCommunityMembers(db, seededUsers.map((user) => user.id), timestamp);
  ensureLocalCommunities(db, seededUsers.map((user) => user.id), timestamp);
  normalizeLocalSeedEngagement(db, seededUsers.map((user) => user.id));
  normalizeLocalArticleDates(db);
  return SEEDED_PROFILES.length;
}

async function seedCloudAccounts(prisma) {
  await cleanupCloudEngagementAccounts(prisma);
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
  await prisma.follows.deleteMany({
    where: {
      follower: { provider: "seed" },
      following: { provider: "seed" },
    },
  });
  await prisma.follows.createMany({ data: namedPairs, skipDuplicates: true });
  const shineCommunity = await prisma.community.findFirst({
    where: { name: { equals: "Shine", mode: "insensitive" } },
    select: { id: true },
  });
  if (shineCommunity) {
    const preserved = await prisma.communityMember.findMany({
      where: {
        communityId: shineCommunity.id,
        user: { provider: { not: "seed" } },
      },
      select: { userId: true },
    });
    const selectedSeedIds = pickMembers(orderedIds, SHINE_COMMUNITY_MEMBER_TARGET, 0);
    const mandatoryIds = [...new Set([...preserved.map((row) => row.userId), ...selectedSeedIds])].slice(0, SHINE_COMMUNITY_MEMBER_TARGET);
    await prisma.communityMember.deleteMany({
      where: { communityId: shineCommunity.id, user: { provider: "seed" } },
    });
    await prisma.communityMember.createMany({
      data: mandatoryIds.map((userId) => ({ userId, communityId: shineCommunity.id })),
      skipDuplicates: true,
    });
  }
  await ensureCloudCommunities(prisma, orderedIds);
  const primaryUser = await prisma.user.findUnique({ where: { username: "nezarismail" }, select: { id: true } });
  if (primaryUser) {
    await prisma.follows.deleteMany({
      where: {
        OR: [
          { followerId: primaryUser.id, following: { provider: "seed" } },
          { followingId: primaryUser.id, follower: { provider: "seed" } },
        ],
      },
    });
    await prisma.follows.createMany({
      data: [
        ...primaryUserFriendPairs(primaryUser.id, orderedIds),
        ...primaryUserSeedPairs(primaryUser.id, orderedIds),
      ],
      skipDuplicates: true,
    });
  }
  await normalizeCloudSeedEngagement(prisma, orderedIds);
  await normalizeCloudArticleDates(prisma);
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
  return db.prepare("SELECT * FROM User WHERE provider = 'seed' ORDER BY createdAt ASC LIMIT 250").all();
}

module.exports = {
  ensureSeededAccounts,
  getLocalSeededAccounts,
  seedLocalAccounts,
  seededFollowerTarget,
  seededFollowingTarget,
  SHINE_COMMUNITY_MEMBER_TARGET,
};
