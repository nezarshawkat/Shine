require('dotenv').config();

const fs = require('fs');
const path = require('path');
const prisma = require('../prisma');

const DATA_PATH = path.join(__dirname, '..', 'prisma', 'seed_data.json');

function toDate(value, fallback = new Date()) {
  const d = value ? new Date(value) : fallback;
  return Number.isNaN(d.getTime()) ? fallback : d;
}

async function truncateAllPublicTables() {
  const tables = await prisma.$queryRawUnsafe(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> '_prisma_migrations'
  `);

  if (!tables.length) return;

  const joined = tables
    .map((t) => `"public"."${t.tablename.replace(/"/g, '""')}"`)
    .join(', ');

  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${joined} RESTART IDENTITY CASCADE`);
}

async function main() {
  if (!fs.existsSync(DATA_PATH)) {
    throw new Error(`Missing seed file: ${DATA_PATH}`);
  }

  const raw = fs.readFileSync(DATA_PATH, 'utf8');
  const data = JSON.parse(raw);

  const users = Array.isArray(data.users) ? data.users : [];
  const communities = Array.isArray(data.communities) ? data.communities : [];
  const memberships = Array.isArray(data.memberships) ? data.memberships : [];
  const posts = Array.isArray(data.posts) ? data.posts : [];
  const comments = Array.isArray(data.comments) ? data.comments : [];

  console.log('Resetting database (truncate all public tables)...');
  await truncateAllPublicTables();

  const userIdByUsername = new Map();
  const communityIdByName = new Map();

  console.log(`Creating ${users.length} users...`);
  for (const u of users) {
    const username = String(u.username || '').trim();
    if (!username) continue;

    const created = await prisma.user.create({
      data: {
        username,
        name: u.fullName || username,
        email: `${username}@seed.local`,
        description: u.bio || null,
        image: null,
        password: null,
        provider: 'seed',
      },
    });

    userIdByUsername.set(username, created.id);
  }

  console.log(`Creating ${communities.length} communities...`);
  for (const c of communities) {
    const creatorId = userIdByUsername.get(c.creatorUsername);
    if (!creatorId) continue;

    const created = await prisma.community.create({
      data: {
        name: c.communityName,
        slogan: c.slogan || null,
        discription: c.description || null,
        interests: Array.isArray(c.keywords) ? c.keywords : [],
        creatorId,
      },
    });

    communityIdByName.set(c.communityName, created.id);
  }

  const membershipSet = new Set();

  // Ensure creators are members (MAIN_ADMIN)
  for (const c of communities) {
    const uid = userIdByUsername.get(c.creatorUsername);
    const cid = communityIdByName.get(c.communityName);
    if (!uid || !cid) continue;
    const key = `${uid}:${cid}`;
    membershipSet.add(key);

    await prisma.communityMember.create({
      data: {
        userId: uid,
        communityId: cid,
        role: 'MAIN_ADMIN',
      },
    });
  }

  console.log(`Creating memberships from JSON (${memberships.length} records)...`);
  for (const m of memberships) {
    const uid = userIdByUsername.get(m.username);
    const cid = communityIdByName.get(m.communityName);
    if (!uid || !cid) continue;

    const key = `${uid}:${cid}`;
    if (membershipSet.has(key)) continue;
    membershipSet.add(key);

    const role = m.role === 'creator' ? 'ADMIN' : 'MEMBER';

    await prisma.communityMember.create({
      data: {
        userId: uid,
        communityId: cid,
        role,
        joinedAt: toDate(m.joinedAt),
      },
    });
  }

  console.log(`Creating ${posts.length} posts...`);
  const postIdBySeedId = new Map();
  for (const p of posts) {
    const authorId = userIdByUsername.get(p.authorUsername);
    if (!authorId) continue;

    const communityId = p.community ? communityIdByName.get(p.community) || null : null;

    const created = await prisma.post.create({
      data: {
        type: p.postType,
        text: p.body || '',
        keywords: Array.isArray(p.keywords) ? p.keywords : [],
        createdAt: toDate(p.timestamp),
        authorId,
        communityId,
      },
    });

    postIdBySeedId.set(p.id, created.id);

    if (Array.isArray(p.pollOptions) && p.postType === 'poll') {
      for (const opt of p.pollOptions) {
        await prisma.pollOption.create({
          data: {
            text: String(opt),
            postId: created.id,
          },
        });
      }
    }

    if (p.source && p.source.name && p.source.url) {
      await prisma.source.create({
        data: {
          name: String(p.source.name),
          link: String(p.source.url),
          postId: created.id,
        },
      });
    }
  }

  console.log(`Creating ${comments.length} comments...`);
  for (const c of comments) {
    const authorId = userIdByUsername.get(c.authorUsername);
    const postId = postIdBySeedId.get(c.postId);
    if (!authorId || !postId) continue;

    await prisma.comment.create({
      data: {
        authorId,
        postId,
        text: c.commentText || '',
        createdAt: toDate(c.timestamp),
      },
    });
  }

  // Keep exactly one article by nezarismail after reset.
  const nezarId = userIdByUsername.get('nezarismail');
  if (nezarId) {
    await prisma.article.create({
      data: {
        title: 'Welcome to Shine: how we debate without dehumanizing',
        content:
          'This platform starts from a simple rule: bring evidence, keep dignity. We can disagree sharply without turning people into enemies. Our moderation approach favors context, transparent standards, and consistent enforcement. If you are new here, start by reading opposing views before posting your own.',
        authorId: nezarId,
      },
    });
  }

  console.log('Done. Database replaced with seed_data.json content.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
