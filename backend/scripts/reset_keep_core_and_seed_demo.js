require('dotenv').config();

const prisma = require('../prisma');
const { seedSocialDemoData } = require('./seed-social-demo');

const KEEP_USERNAMES = ['nezarismail', 'guest_support'];

function maskedDbUrl(url) {
  if (!url) return 'MISSING_DATABASE_URL';
  try {
    const u = new URL(url);
    const dbName = u.pathname?.replace(/^\//, '') || '(no-db)';
    return `${u.protocol}//${u.hostname}:${u.port || 'default'}/${dbName}`;
  } catch (_) {
    return 'INVALID_DATABASE_URL';
  }
}

async function truncateAllPublicTables(tx) {
  const tables = await tx.$queryRawUnsafe(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> '_prisma_migrations'
  `);

  if (!tables.length) return;

  const joined = tables
    .map((t) => `"public"."${t.tablename.replace(/"/g, '""')}"`)
    .join(', ');

  await tx.$executeRawUnsafe(`TRUNCATE TABLE ${joined} RESTART IDENTITY CASCADE`);
}

async function run() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set. Put it in backend/.env first.');
  }

  console.log(`Target database: ${maskedDbUrl(process.env.DATABASE_URL)}`);
  console.log(`Keeping users: ${KEEP_USERNAMES.join(', ')}`);

  const keepUsers = await prisma.user.findMany({
    where: { username: { in: KEEP_USERNAMES } },
    select: {
      id: true,
      email: true,
      username: true,
      name: true,
      password: true,
      googleId: true,
      provider: true,
      image: true,
      description: true,
      isAuthorized: true,
      isSupporter: true,
      createdAt: true,
      updatedAt: true,
      roleLevel: true,
    },
  });

  const missing = KEEP_USERNAMES.filter((username) => !keepUsers.some((u) => u.username === username));
  if (missing.length) {
    throw new Error(`Missing required users in DB: ${missing.join(', ')}`);
  }

  await prisma.$transaction(async (tx) => {
    console.log('Deleting all data (except _prisma_migrations)...');
    await truncateAllPublicTables(tx);

    console.log('Restoring kept users...');
    for (const user of keepUsers) {
      await tx.user.create({ data: user });
    }
  });

  console.log('Seeding new social demo data...');
  await seedSocialDemoData();

  const [userCount, postCount, commentCount, articleCount] = await Promise.all([
    prisma.user.count(),
    prisma.post.count(),
    prisma.comment.count(),
    prisma.article.count(),
  ]);

  console.log('Done.');
  console.log({ userCount, postCount, commentCount, articleCount });
}

run()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
