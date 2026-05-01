require('dotenv').config();
const bcrypt = require('bcrypt');
const prisma = require('../prisma');

const ACCOUNT_COUNT = 40;
const POST_COUNT = 200;
const COMMENT_COUNT = 760;
const POLL_COUNT = 40;
const ARTICLE_COUNT = 24;
const COMMUNITY_POST_COUNT = 90;

const DEMO_EMAIL_DOMAIN = '@shine.local';
const DEMO_USER_PREFIX = 'citizen_';

const FIRST_NAMES = [
  'Maya', 'Jordan', 'Elena', 'Marcus', 'Aaliyah', 'Noah', 'Priya', 'Daniel', 'Camila', 'Ethan',
  'Layla', 'Owen', 'Zoe', 'Isaiah', 'Nadia', 'Caleb', 'Sofia', 'Miles', 'Hannah', 'Julian',
  'Amara', 'Lucas', 'Ivy', 'Mateo', 'Leah', 'Xavier', 'Ava', 'Micah', 'Ruby', 'Eli',
  'Riley', 'Nora', 'Adrian', 'Tessa', 'Liam', 'Jasmine', 'Wyatt', 'Selena', 'Theo', 'Naomi'
];

const LAST_NAMES = [
  'Bennett', 'Rivera', 'Coleman', 'Patel', 'Hughes', 'Nguyen', 'Brooks', 'Foster', 'Diaz', 'Shaw',
  'Griffin', 'Morris', 'Rahman', 'Kim', 'Sullivan', 'Price', 'Long', 'Reed', 'Powell', 'Ward'
];

const IMAGE_POOL = [
  'https://images.unsplash.com/photo-1575320181282-9afab399332c?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1541872705-1f73c6400ec9?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1557992260-ec58e38d363c?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80'
];

const LAST_WEEK_NEWS = [
  {
    date: '2026-04-01',
    title: 'House and Senate Republicans reached a deal to end the Homeland Security shutdown',
    summary: 'Lawmakers moved a funding package after weeks of disruption at DHS and TSA operations.',
    source: { name: 'New York Times Live', link: 'https://www.nytimes.com/live/2026/04/01/us/trump-news' },
    tags: ['congress', 'shutdown', 'homelandsecurity', 'budget']
  },
  {
    date: '2026-04-03',
    title: 'Iran war messaging created friction for GOP midterm strategy',
    summary: 'Campaign strategists warned that unclear messaging on war goals is hurting voter confidence.',
    source: { name: 'Associated Press', link: 'https://apnews.com/article/trump-offers-murky-path-forward-for-republicans-as-iran-war-clouds-midterm-elections' },
    tags: ['war', 'midterms', 'foreignpolicy', 'gop']
  },
  {
    date: '2026-04-07',
    title: 'Georgia special House runoff delivered a winner after no one cleared 50% in the first round',
    summary: 'The result became an early test case for turnout and district-level mood before November.',
    source: { name: 'BBC', link: 'https://www.bbc.com/news' },
    tags: ['election', 'georgia', 'house', 'turnout']
  },
  {
    date: '2026-04-09',
    title: 'Democratic strategy meeting exposed internal Israel-policy tensions',
    summary: 'Party operatives debated coalition risks as activists demanded tougher lines on aid and oversight.',
    source: { name: 'AFP', link: 'https://www.nampa.org/text/22906659' },
    tags: ['democrats', 'israel', 'midterms', 'strategy']
  },
  {
    date: '2026-04-10',
    title: 'Budget and border funding hearings scheduled in Congress for next week',
    summary: 'Administration officials prepared testimony on reconciliation plans and agency funding requests.',
    source: { name: 'McDermott+ Policy Update', link: 'https://www.jdsupra.com/legalnews/mcdermott-check-up-april-10-2026-1161148/' },
    tags: ['budget', 'immigration', 'congress', 'hearings']
  },
  {
    date: '2026-04-11',
    title: 'Small-town political extremism and local polarization remained major campaign themes',
    summary: 'Local reporting highlighted pressure on school boards and municipal institutions.',
    source: { name: 'The Guardian', link: 'https://www.theguardian.com/us-news/us-politics/2026/apr/11/all' },
    tags: ['localpolitics', 'extremism', 'communities', 'campaigns']
  }
];

const COMMUNITY_BLUEPRINTS = [
  { name: 'Civic Wire', interests: ['politics', 'policy', 'elections'], slogan: 'Policy without spin' },
  { name: 'Metro Watch', interests: ['cities', 'transport', 'housing'], slogan: 'Street-level accountability' },
  { name: 'Budget Kitchen Table', interests: ['economy', 'taxes', 'inflation'], slogan: 'How policy hits paychecks' }
];

const rand = (max) => Math.floor(Math.random() * max);
const sample = (arr) => arr[rand(arr.length)];
const sampleMany = (arr, count) => [...arr].sort(() => Math.random() - 0.5).slice(0, count);

async function getDemoUsers() {
  return prisma.user.findMany({
    where: {
      email: { contains: DEMO_EMAIL_DOMAIN },
      username: { startsWith: DEMO_USER_PREFIX },
      description: { contains: DEMO_BIO_TAG }
    },
    select: { id: true }
  });
}

async function cleanupDemoData() {
  const demoUsers = await getDemoUsers();
  const userIds = demoUsers.map((u) => u.id);
  if (!userIds.length) return;

  const postIds = (await prisma.post.findMany({ where: { authorId: { in: userIds } }, select: { id: true } })).map((p) => p.id);
  const articleIds = (await prisma.article.findMany({ where: { authorId: { in: userIds } }, select: { id: true } })).map((a) => a.id);
  const commentIds = (await prisma.comment.findMany({
    where: { OR: [{ authorId: { in: userIds } }, ...(postIds.length ? [{ postId: { in: postIds } }] : [])] },
    select: { id: true }
  })).map((c) => c.id);

  await prisma.$transaction(async (tx) => {
    if (commentIds.length) await tx.like.deleteMany({ where: { commentId: { in: commentIds } } });

    await tx.like.deleteMany({ where: { OR: [{ userId: { in: userIds } }, ...(postIds.length ? [{ postId: { in: postIds } }] : []), ...(articleIds.length ? [{ articleId: { in: articleIds } }] : [])] } });
    await tx.share.deleteMany({ where: { OR: [{ userId: { in: userIds } }, ...(postIds.length ? [{ postId: { in: postIds } }] : [])] } });
    await tx.save.deleteMany({ where: { OR: [{ userId: { in: userIds } }, ...(postIds.length ? [{ postId: { in: postIds } }] : []), ...(articleIds.length ? [{ articleId: { in: articleIds } }] : [])] } });
    await tx.flag.deleteMany({ where: { userId: { in: userIds } } });
    await tx.postView.deleteMany({ where: { OR: [{ userId: { in: userIds } }, ...(postIds.length ? [{ postId: { in: postIds } }] : []), ...(articleIds.length ? [{ articleId: { in: articleIds } }] : [])] } });
    await tx.media.deleteMany({ where: { OR: [{ uploaderId: { in: userIds } }, ...(postIds.length ? [{ postId: { in: postIds } }] : []), ...(articleIds.length ? [{ articleId: { in: articleIds } }] : [])] } });

    if (postIds.length) {
      await tx.source.deleteMany({ where: { postId: { in: postIds } } });
      await tx.pollOption.deleteMany({ where: { postId: { in: postIds } } });
      await tx.comment.deleteMany({ where: { postId: { in: postIds } } });
      await tx.post.deleteMany({ where: { id: { in: postIds } } });
    }

    if (articleIds.length) {
      await tx.source.deleteMany({ where: { articleId: { in: articleIds } } });
      await tx.article.deleteMany({ where: { id: { in: articleIds } } });
    }

    await tx.comment.deleteMany({ where: { authorId: { in: userIds } } });
    await tx.communityMember.deleteMany({ where: { userId: { in: userIds } } });
    await tx.communityRequest.deleteMany({ where: { userId: { in: userIds } } });
    await tx.follows.deleteMany({ where: { OR: [{ followerId: { in: userIds } }, { followingId: { in: userIds } }] } });
    await tx.message.deleteMany({ where: { OR: [{ senderId: { in: userIds } }, { receiverId: { in: userIds } }] } });
    await tx.notification.deleteMany({ where: { userId: { in: userIds } } });
    await tx.emailNotificationBatch.deleteMany({ where: { userId: { in: userIds } } });
    await tx.emailNotificationPreference.deleteMany({ where: { userId: { in: userIds } } });
    await tx.user.deleteMany({ where: { id: { in: userIds } } });
  });
}

function makePersona(index) {
  const first = FIRST_NAMES[index % FIRST_NAMES.length];
  const last = LAST_NAMES[(index * 3) % LAST_NAMES.length];
  const username = `${first.toLowerCase()}_${last.toLowerCase()}${10 + index}`;
  return { first, last, username, name: `${first} ${last}` };
}

async function createUsers() {
  const password = await bcrypt.hash('ShineDemo!2026', 10);
  const users = [];

  for (let i = 0; i < ACCOUNT_COUNT; i += 1) {
    const persona = makePersona(i);
    users.push(await prisma.user.create({
      data: {
        email: `${persona.username}${DEMO_EMAIL_DOMAIN}`,
        username: persona.username,
        name: persona.name,
        password,
        provider: 'local',
        description: `${DEMO_BIO_TAG} Focused on policy, civic issues, and accountability reporting.`,
        image: `https://i.pravatar.cc/300?img=${11 + i}`,
        isAuthorized: true
      }
    }));
  }

  return users;
}

async function ensureCommunities(users) {
  const communities = [];
  const owner = users[0];

  let shine = await prisma.community.findFirst({ where: { name: { equals: 'Shine', mode: 'insensitive' } } });
  if (!shine) {
    shine = await prisma.community.create({
      data: {
        name: 'Shine',
        interests: ['news', 'politics', 'analysis'],
        slogan: 'Main community for platform-wide conversations',
        discription: 'Auto-managed by social demo seeder',
        creatorId: owner.id,
        icon: sample(IMAGE_POOL),
        banner: sample(IMAGE_POOL)
      }
    });
  }
  communities.push(shine);

  for (const bp of COMMUNITY_BLUEPRINTS) {
    communities.push(await prisma.community.create({
      data: {
        name: bp.name,
        interests: bp.interests,
        slogan: bp.slogan,
        discription: `Created by ${DEMO_BIO_TAG}`,
        creatorId: sample(users).id,
        icon: sample(IMAGE_POOL),
        banner: sample(IMAGE_POOL)
      }
    }));
  }

  for (const community of communities) {
    const selectedUsers = community.name.toLowerCase() === 'shine' ? users : sampleMany(users, 20 + rand(12));
    await prisma.communityMember.createMany({
      data: selectedUsers.map((u, idx) => ({
        userId: u.id,
        communityId: community.id,
        role: idx === 0 ? 'ADMIN' : 'MEMBER'
      })),
      skipDuplicates: true
    });
  }

  return communities;
}

function buildPostBody(type, authorName, news) {
  const opinion = [
    `I don't buy the spin around "${news.title}". ${news.summary}`,
    `This is why people are angry: ${news.summary.toLowerCase()}`,
    `Every press conference says "progress" while this keeps happening: ${news.title.toLowerCase()}.`
  ];
  const analysis = [
    `Quick read on ${news.date}: ${news.title}.`,
    `Policy signal today: ${news.title}.`,
    `Numbers aside, this week showed one thing clearly: ${news.title}.`
  ];
  const critique = [
    `Blunt take: leadership handled this poorly — ${news.title}.`,
    `I disagree with the official line here. ${news.summary}`,
    `This looks reactive, not strategic: ${news.title}.`
  ];

  const text = type === 'opinion' ? sample(opinion)
    : type === 'analysis' ? `${sample(analysis)}\n\nKey issue: implementation is lagging messaging.`
      : `${sample(critique)}\n\nVoters should push harder at local meetings.`;

  return `${text}\n\nSource context: ${news.source.name}\n— ${authorName}`;
}

async function seedFollows(users) {
  const edges = new Set();
  for (const follower of users) {
    const followCount = 8 + rand(14);
    for (let i = 0; i < followCount; i += 1) {
      const target = sample(users);
      if (target.id !== follower.id) edges.add(`${follower.id}:${target.id}`);
    }
  }
  await prisma.follows.createMany({
    data: [...edges].map((edge) => {
      const [followerId, followingId] = edge.split(':');
      return { followerId, followingId };
    }),
    skipDuplicates: true
  });
}

async function createPosts(users, communities) {
  const posts = [];
  const nonPollTypes = ['critique', 'critique', 'analysis', 'opinion', 'critique'];

  for (let i = 0; i < POST_COUNT; i += 1) {
    const author = sample(users);
    const news = LAST_WEEK_NEWS[i % LAST_WEEK_NEWS.length];
    const type = i < POLL_COUNT ? 'poll' : nonPollTypes[i % nonPollTypes.length];
    const createdAt = new Date(`${news.date}T${String(8 + rand(12)).padStart(2, '0')}:${String(rand(59)).padStart(2, '0')}:00.000Z`);
    const community = i < COMMUNITY_POST_COUNT ? communities[i % communities.length] : null;

    const poll = {
      question: `(${news.date}) ${news.title}. What's your read?`,
      options: [
        'Government overpromised',
        'Media coverage is overhyped',
        'Opposition is blocking progress',
        'Still unclear'
      ]
    };

    const post = await prisma.post.create({
      data: {
        type,
        text: type === 'poll' ? `${poll.question}\n\nContext: ${news.summary}` : buildPostBody(type, author.name, news),
        keywords: news.tags,
        authorId: author.id,
        communityId: community?.id || null,
        createdAt,
        updatedAt: createdAt,
        ...(type === 'poll' ? { pollOptions: { create: poll.options.map((opt) => ({ text: opt, votes: rand(180) + 20 })) } } : {}),
        sources: { create: [{ name: news.source.name, link: news.source.link }] }
      }
    });

    if (Math.random() < 0.8) {
      await prisma.media.create({
        data: {
          uploaderId: author.id,
          postId: post.id,
          url: sample(IMAGE_POOL),
          type: 'image/jpeg',
          size: 220000 + rand(500000),
          createdAt
        }
      });
    }

    posts.push(post);
  }

  const critiquePosts = posts.filter((p) => p.type === 'critique').slice(0, 45);
  const basePosts = posts.filter((p) => p.type !== 'critique');
  for (const critique of critiquePosts) {
    await prisma.post.update({ where: { id: critique.id }, data: { parentId: sample(basePosts).id } });
  }

  return posts;
}

async function createArticles(users) {
  for (let i = 0; i < ARTICLE_COUNT; i += 1) {
    const author = sample(users);
    const news = LAST_WEEK_NEWS[i % LAST_WEEK_NEWS.length];
    const createdAt = new Date(`${news.date}T${String(7 + rand(12)).padStart(2, '0')}:${String(rand(59)).padStart(2, '0')}:00.000Z`);

    const article = await prisma.article.create({
      data: {
        title: `${news.title} — What it means for voters`,
        content: `${news.summary}\n\nThis week, user sentiment shifted around accountability, affordability, and trust in institutions. This piece summarizes main arguments seen across community discussions and maps likely pressure points for the next hearings/elections.`,
        authorId: author.id,
        createdAt,
        updatedAt: createdAt,
        sources: { create: [{ name: news.source.name, link: news.source.link }] }
      }
    });

    if (Math.random() < 0.7) {
      await prisma.media.create({
        data: {
          uploaderId: author.id,
          articleId: article.id,
          url: sample(IMAGE_POOL),
          type: 'image/jpeg',
          size: 250000 + rand(300000),
          createdAt
        }
      });
    }
  }
}

async function seedComments(users, posts) {
  const comments = [];
  for (const post of posts) {
    const author = sample(users.filter((u) => u.id !== post.authorId));
    comments.push(await prisma.comment.create({
      data: {
        postId: post.id,
        authorId: author.id,
        text: sample([
          'Strongly disagree. This is exactly the problem with current leadership.',
          'I share your frustration, but this take ignores local implementation constraints.',
          'This one actually matches what happened in my district this week.',
          'Not neutral here: this policy is failing regular workers.'
        ])
      }
    }));
  }

  while (comments.length < COMMENT_COUNT) {
    const post = sample(posts);
    const author = sample(users.filter((u) => u.id !== post.authorId));
    const parent = Math.random() < 0.28 ? sample(comments) : null;
    comments.push(await prisma.comment.create({
      data: {
        postId: post.id,
        authorId: author.id,
        parentId: parent?.id,
        text: sample([
          'If this trend continues, turnout is going to break hard one direction.',
          'Feels like parties are gaming headlines instead of fixing execution.',
          'I voted in the poll and still think both sides are dodging details.',
          'Source checks out, but the spokesperson quote was pure spin.'
        ])
      }
    }));
  }
}

async function seedPostEngagement(users, posts) {
  const highReach = new Set(sampleMany(posts, Math.floor(posts.length * 0.25)).map((p) => p.id));

  for (const post of posts) {
    const shuffled = [...users].sort(() => Math.random() - 0.5);
    const likeCount = highReach.has(post.id) ? 28 + rand(24) : 8 + rand(14);
    const shareCount = highReach.has(post.id) ? 10 + rand(10) : 3 + rand(6);
    const viewCount = highReach.has(post.id) ? 65 + rand(45) : 18 + rand(30);

    for (const user of shuffled.slice(0, likeCount)) {
      await prisma.like.create({ data: { userId: user.id, postId: post.id } });
    }
    for (const user of shuffled.slice(likeCount, likeCount + shareCount)) {
      await prisma.share.create({ data: { userId: user.id, postId: post.id } });
    }
    for (const user of shuffled.slice(0, viewCount)) {
      await prisma.postView.create({
        data: {
          userId: user.id,
          postId: post.id,
          viewedAt: new Date(Date.now() - rand(1000 * 60 * 60 * 24 * 6))
        }
      });
    }

    await prisma.post.update({
      where: { id: post.id },
      data: {
        featured: highReach.has(post.id),
        engagement: likeCount + shareCount + viewCount
      }
    });
  }
}

async function seedArticleEngagement(users) {
  const articles = await prisma.article.findMany({ where: { author: { description: { contains: DEMO_BIO_TAG } } } });
  for (const article of articles) {
    const shuffled = [...users].sort(() => Math.random() - 0.5);
    const likeCount = 14 + rand(18);
    const saveCount = 6 + rand(9);

    for (const user of shuffled.slice(0, likeCount)) {
      await prisma.like.create({ data: { userId: user.id, articleId: article.id } });
    }

    for (const user of shuffled.slice(0, saveCount)) {
      await prisma.save.create({ data: { userId: user.id, articleId: article.id } });
    }

    for (const user of shuffled.slice(0, 20 + rand(18))) {
      await prisma.postView.create({
        data: {
          userId: user.id,
          articleId: article.id,
          viewedAt: new Date(Date.now() - rand(1000 * 60 * 60 * 24 * 6))
        }
      });
    }
  }
}

async function seedSocialDemoData() {
  await cleanupDemoData();

  const users = await createUsers();
  const communities = await ensureCommunities(users);
  await seedFollows(users);
  const posts = await createPosts(users, communities);
  await createArticles(users);
  await seedComments(users, posts);
  await seedPostEngagement(users, posts);
  await seedArticleEngagement(users);

  const [accounts, postsCount, comments, polls, articles, follows, communityMembers] = await Promise.all([
    prisma.user.count({ where: { description: { contains: DEMO_BIO_TAG } } }),
    prisma.post.count({ where: { author: { description: { contains: DEMO_BIO_TAG } } } }),
    prisma.comment.count({ where: { author: { description: { contains: DEMO_BIO_TAG } } } }),
    prisma.post.count({ where: { type: 'poll', author: { description: { contains: DEMO_BIO_TAG } } } }),
    prisma.article.count({ where: { author: { description: { contains: DEMO_BIO_TAG } } } }),
    prisma.follows.count({ where: { follower: { description: { contains: DEMO_BIO_TAG } } } }),
    prisma.communityMember.count({ where: { user: { description: { contains: DEMO_BIO_TAG } } } })
  ]);

  console.log(`Accounts: ${accounts} | Posts: ${postsCount} | Comments: ${comments} | Polls: ${polls} | Articles: ${articles} | Follows: ${follows} | Community memberships: ${communityMembers}`);
}

if (require.main === module) {
  seedSocialDemoData()
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = { cleanupDemoData, seedSocialDemoData };
