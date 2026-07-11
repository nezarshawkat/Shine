const local = require("../db/local");
const { SEEDED_PROFILES } = require("../seed_profile_images");

const localOnly =
  process.env.DATABASE_MODE === "local" ||
  process.env.LOCAL_ONLY_DB === "true" ||
  !process.env.DATABASE_URL;
const SHINE_COMMUNITY_MEMBER_TARGET = 223;

const SEEDED_COMMUNITIES = [
  {
    key: "progressive_assembly",
    name: "Progressive Assembly",
    slogan: "Public services, workers, climate justice.",
    discription: "A party-style community for progressive voters discussing labor rights, public healthcare, climate action, housing, and social equality.",
    interests: ["progressive party", "labor rights", "climate justice"],
    status: "PUBLIC",
    icon: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?auto=format&fit=crop&w=300&q=80",
    banner: "https://images.unsplash.com/photo-1555848962-6e79363ec58f?auto=format&fit=crop&w=1400&q=80",
    memberTarget: 136,
  },
  {
    key: "conservative_front",
    name: "Conservative Front",
    slogan: "Tradition, security, low taxes.",
    discription: "A right-leaning political community for voters focused on national security, family policy, fiscal restraint, and cultural conservatism.",
    interests: ["conservative party", "security", "tax policy"],
    status: "PUBLIC",
    icon: "https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=300&q=80",
    banner: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?auto=format&fit=crop&w=1400&q=80",
    memberTarget: 174,
  },
  {
    key: "liberty_caucus",
    name: "Liberty Caucus",
    slogan: "Free markets, civil liberties, smaller state.",
    discription: "A libertarian-leaning space for supporters of deregulation, privacy rights, decentralization, entrepreneurship, and limits on state power.",
    interests: ["libertarian party", "civil liberties", "free markets"],
    status: "PUBLIC",
    icon: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=300&q=80",
    banner: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1400&q=80",
    memberTarget: 119,
  },
  {
    key: "green_future_bloc",
    name: "Green Future Bloc",
    slogan: "Climate first, people included.",
    discription: "A green-party inspired community for climate policy, renewable energy, urban transit, environmental justice, and sustainable agriculture.",
    interests: ["green party", "renewable energy", "climate policy"],
    status: "PUBLIC",
    icon: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=300&q=80",
    banner: "https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=1400&q=80",
    memberTarget: 151,
  },
  {
    key: "social_democracy_network",
    name: "Social Democracy Network",
    slogan: "Fair markets, strong welfare, stable reform.",
    discription: "A center-left community for social democratic voters discussing public investment, unions, welfare policy, taxation, and democratic institutions.",
    interests: ["social democracy", "public investment", "welfare policy"],
    status: "PUBLIC",
    icon: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=300&q=80",
    banner: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1400&q=80",
    memberTarget: 144,
  },
  {
    key: "national_sovereignty_forum",
    name: "National Sovereignty Forum",
    slogan: "Borders, industry, national interest.",
    discription: "A nationalist-populist political forum for debates about migration, trade protection, sovereignty, defense, and domestic industry.",
    interests: ["sovereignty party", "border policy", "trade protection"],
    status: "PUBLIC",
    icon: "https://images.unsplash.com/photo-1521295121783-8a321d551ad2?auto=format&fit=crop&w=300&q=80",
    banner: "https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=1400&q=80",
    memberTarget: 128,
  },
  {
    key: "campaign_strategy_room",
    name: "Campaign Strategy Room",
    slogan: "Private polling, messaging, field plans.",
    discription: "A private backroom for campaign-style strategy, message testing, turnout planning, and debate preparation.",
    interests: ["campaign strategy", "polling", "field organizing"],
    status: "PRIVATE",
    icon: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=300&q=80",
    banner: "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1400&q=80",
    memberTarget: 58,
  },
  {
    key: "coalition_negotiation_table",
    name: "Coalition Negotiation Table",
    slogan: "Private deals before public votes.",
    discription: "A private cross-faction room for simulated coalition talks, compromise proposals, committee priorities, and internal political bargaining.",
    interests: ["coalition politics", "party negotiation", "committee work"],
    status: "PRIVATE",
    icon: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=300&q=80",
    banner: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=80",
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

const WELCOME_POST_TEXT = "Welcome to Shine";
const WELCOME_POST_TARGETS = {
  views: 249,
  likes: 211,
  comments: 28,
  shares: 73,
};
const WELCOME_COMMENTS = [
  "This is a strong start. I like that the focus is on different points of view.",
  "Happy to see a space built around real discussion instead of just quick reactions.",
  "The idea feels needed right now. People want somewhere calmer to talk.",
  "Excited to see how the conversations here develop over time.",
  "This feels welcoming without trying too hard. Good first impression.",
  "A place for ideas and disagreement with context would be genuinely useful.",
  "The tone here is exactly what most discussion platforms are missing.",
  "Looking forward to seeing more people bring thoughtful posts here.",
  "This is the kind of community message that makes people want to join in.",
  "I hope Shine keeps this balance between openness and better conversation.",
  "The discover different points of view part is what makes this interesting.",
  "Good to be here early. Curious to watch the community grow.",
  "This already feels more intentional than most new social spaces.",
  "A clean beginning. Now the important part is keeping the discussions useful.",
  "I like that it invites people to start their own discussions too.",
  "This feels like a good home for longer, smarter conversations.",
  "The welcome message sets the right expectation for the whole app.",
  "Hope this becomes a place where people can disagree without making it personal.",
  "Simple message, but it explains the point of Shine clearly.",
  "Glad to see a platform trying to make conversation feel human again.",
];

function findLocalWelcomePost(db) {
  return db.prepare(`
    SELECT id
    FROM Post
    WHERE deletedAt IS NULL
      AND text LIKE ?
    ORDER BY datetime(createdAt) ASC
    LIMIT 1
  `).get(`%${WELCOME_POST_TEXT}%`);
}

function normalizeLocalWelcomePostEngagement(db, seedIds) {
  if (!seedIds.length) return false;
  const post = findLocalWelcomePost(db);
  if (!post) return false;
  const now = Date.now();

  db.transaction(() => {
    db.exec("DROP TABLE IF EXISTS temp.WelcomeSeedIds");
    db.exec("CREATE TEMP TABLE WelcomeSeedIds (id TEXT PRIMARY KEY)");
    const insertSeed = db.prepare("INSERT OR IGNORE INTO WelcomeSeedIds (id) VALUES (?)");
    seedIds.forEach((userId) => insertSeed.run(userId));

    db.prepare("DELETE FROM LikeRecord WHERE postId = ? AND userId IN (SELECT id FROM WelcomeSeedIds)").run(post.id);
    db.prepare("DELETE FROM ShareRecord WHERE postId = ? AND userId IN (SELECT id FROM WelcomeSeedIds)").run(post.id);
    db.prepare("DELETE FROM PostView WHERE postId = ? AND userId IN (SELECT id FROM WelcomeSeedIds)").run(post.id);
    db.prepare("DELETE FROM Comment WHERE postId = ? AND authorId IN (SELECT id FROM WelcomeSeedIds)").run(post.id);

    const remaining = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM LikeRecord WHERE postId = ?) AS likes,
        (SELECT COUNT(*) FROM Comment WHERE postId = ? AND deletedAt IS NULL) AS comments,
        (SELECT COUNT(*) FROM ShareRecord WHERE postId = ?) AS shares,
        (SELECT COUNT(*) FROM PostView WHERE postId = ?) AS views
    `).get(post.id, post.id, post.id, post.id);

    const viewInsert = db.prepare("INSERT INTO PostView (id, userId, postId, viewedAt, data) VALUES (?, ?, ?, ?, '{}')");
    for (let index = 0; index < Math.max(0, WELCOME_POST_TARGETS.views - remaining.views); index += 1) {
      viewInsert.run(
        local.newId(),
        seedIds[(index * 17) % seedIds.length],
        post.id,
        new Date(now - index * 4500).toISOString()
      );
    }

    const likeInsert = db.prepare("INSERT OR IGNORE INTO LikeRecord (id, userId, postId, createdAt, data) VALUES (?, ?, ?, ?, '{}')");
    for (let index = 0; index < Math.max(0, WELCOME_POST_TARGETS.likes - remaining.likes); index += 1) {
      likeInsert.run(local.newId(), seedIds[(index * 11) % seedIds.length], post.id, local.nowIso());
    }

    const shareInsert = db.prepare("INSERT INTO ShareRecord (id, userId, postId, createdAt, data) VALUES (?, ?, ?, ?, '{}')");
    for (let index = 0; index < Math.max(0, WELCOME_POST_TARGETS.shares - remaining.shares); index += 1) {
      shareInsert.run(local.newId(), seedIds[(index * 23) % seedIds.length], post.id, local.nowIso());
    }

    const commentInsert = db.prepare(`
      INSERT INTO Comment (id, postId, authorId, text, createdAt, updatedAt, likesCount, repliesCount, data)
      VALUES (?, ?, ?, ?, ?, ?, 0, 0, '{}')
    `);
    for (let index = 0; index < Math.max(0, WELCOME_POST_TARGETS.comments - remaining.comments); index += 1) {
      const createdAt = new Date(now - (index + 1) * 3600000).toISOString();
      commentInsert.run(
        local.newId(),
        post.id,
        seedIds[(index * 19 + 7) % seedIds.length],
        WELCOME_COMMENTS[index % WELCOME_COMMENTS.length],
        createdAt,
        createdAt
      );
    }

    const counts = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM LikeRecord WHERE postId = ?) AS likes,
        (SELECT COUNT(*) FROM Comment WHERE postId = ? AND deletedAt IS NULL) AS comments,
        (SELECT COUNT(*) FROM ShareRecord WHERE postId = ?) AS shares,
        (SELECT COUNT(*) FROM PostView WHERE postId = ?) AS views
    `).get(post.id, post.id, post.id, post.id);
    db.prepare("UPDATE Post SET likesCount = ?, commentsCount = ?, sharesCount = ?, viewsCount = ?, engagement = ? WHERE id = ?")
      .run(counts.likes, counts.comments, counts.shares, counts.views, counts.likes + counts.comments * 2 + counts.shares * 3 + counts.views, post.id);
    db.exec("DROP TABLE IF EXISTS temp.WelcomeSeedIds");
  })();

  return true;
}

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

async function normalizeCloudWelcomePostEngagement(prisma, seedIds) {
  if (!seedIds.length) return false;
  const post = await prisma.post.findFirst({
    where: {
      text: { contains: WELCOME_POST_TEXT, mode: "insensitive" },
    },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!post) return false;

  await prisma.$transaction([
    prisma.like.deleteMany({ where: { postId: post.id, user: { provider: "seed" } } }),
    prisma.share.deleteMany({ where: { postId: post.id, user: { provider: "seed" } } }),
    prisma.postView.deleteMany({ where: { postId: post.id, user: { provider: "seed" } } }),
    prisma.comment.deleteMany({ where: { postId: post.id, author: { provider: "seed" } } }),
  ]);

  const [remainingLikes, remainingComments, remainingShares, remainingViews] = await Promise.all([
    prisma.like.count({ where: { postId: post.id } }),
    prisma.comment.count({ where: { postId: post.id } }),
    prisma.share.count({ where: { postId: post.id } }),
    prisma.postView.count({ where: { postId: post.id } }),
  ]);
  const now = Date.now();
  const viewCount = Math.max(0, WELCOME_POST_TARGETS.views - remainingViews);
  const likeCount = Math.max(0, WELCOME_POST_TARGETS.likes - remainingLikes);
  const shareCount = Math.max(0, WELCOME_POST_TARGETS.shares - remainingShares);
  const commentCount = Math.max(0, WELCOME_POST_TARGETS.comments - remainingComments);

  for (let start = 0; start < viewCount; start += 1000) {
    const batchSize = Math.min(1000, viewCount - start);
    await prisma.postView.createMany({
      data: Array.from({ length: batchSize }, (_value, offset) => {
        const index = start + offset;
        return {
          userId: seedIds[(index * 17) % seedIds.length],
          postId: post.id,
          viewedAt: new Date(now - index * 4500),
        };
      }),
    });
  }

  await prisma.like.createMany({
    data: Array.from({ length: likeCount }, (_value, index) => ({
      userId: seedIds[(index * 11) % seedIds.length],
      postId: post.id,
    })),
    skipDuplicates: true,
  });
  await prisma.share.createMany({
    data: Array.from({ length: shareCount }, (_value, index) => ({
      userId: seedIds[(index * 23) % seedIds.length],
      postId: post.id,
    })),
  });
  await prisma.comment.createMany({
    data: Array.from({ length: commentCount }, (_value, index) => ({
      authorId: seedIds[(index * 19 + 7) % seedIds.length],
      postId: post.id,
      text: WELCOME_COMMENTS[index % WELCOME_COMMENTS.length],
      createdAt: new Date(now - (index + 1) * 3600000),
      updatedAt: new Date(now - (index + 1) * 3600000),
    })),
  });

  const [likes, comments, shares, views] = await Promise.all([
    prisma.like.count({ where: { postId: post.id } }),
    prisma.comment.count({ where: { postId: post.id } }),
    prisma.share.count({ where: { postId: post.id } }),
    prisma.postView.count({ where: { postId: post.id } }),
  ]);
  await prisma.post.update({
    where: { id: post.id },
    data: { engagement: likes + comments * 2 + shares * 3 + views },
  });
  return true;
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
      username = excluded.username,
      name = excluded.name,
      provider = 'seed',
      image = excluded.image,
      description = excluded.description,
      isAuthorized = 1,
      updatedAt = excluded.updatedAt,
      data = excluded.data
  `);

  const transaction = db.transaction(() => {
    const existingSeedRows = db.prepare("SELECT id, username, createdAt FROM User WHERE provider = 'seed' ORDER BY datetime(createdAt) ASC, username ASC").all();
    for (const [index, profile] of SEEDED_PROFILES.entries()) {
      const existing =
        db.prepare("SELECT id, createdAt FROM User WHERE username = ?").get(profile.username) ||
        (profile.previousUsername ? db.prepare("SELECT id, createdAt FROM User WHERE username = ?").get(profile.previousUsername) : null) ||
        existingSeedRows[index];
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
  normalizeLocalWelcomePostEngagement(db, seededUsers.map((user) => user.id));
  normalizeLocalArticleDates(db);
  return SEEDED_PROFILES.length;
}

async function seedCloudAccounts(prisma) {
  await cleanupCloudEngagementAccounts(prisma);
  const existingSeedRows = await prisma.user.findMany({
    where: { provider: "seed" },
    orderBy: [{ createdAt: "asc" }, { username: "asc" }],
    select: { id: true, username: true },
  });
  for (const [index, profile] of SEEDED_PROFILES.entries()) {
    const existing =
      (await prisma.user.findUnique({ where: { username: profile.username }, select: { id: true } })) ||
      (profile.previousUsername ? await prisma.user.findUnique({ where: { username: profile.previousUsername }, select: { id: true } }) : null) ||
      existingSeedRows[index];
    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          username: profile.username,
          name: profile.name,
          description: profile.description,
          email: `${profile.username}@mock.shine.local`,
          provider: "seed",
          isAuthorized: true,
          image: profile.image,
        },
      });
    } else {
      await prisma.user.create({
        data: {
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
  await normalizeCloudWelcomePostEngagement(prisma, orderedIds);
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
