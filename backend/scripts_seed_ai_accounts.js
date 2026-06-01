const prisma = require('./prisma');
const { SEEDED_PROFILES } = require('./seed_profile_images');
const { deleteUserWithRelations } = require('./controllers/admin/deletionHelpers');

const accounts = SEEDED_PROFILES.map(({ name, username, description, image }) => [name, username, description, image]);

async function deleteSeededAccounts() {
  const usernames = accounts.map(([, username]) => username);
  const users = await prisma.user.findMany({ where: { username: { in: usernames } }, select: { id: true, username: true } });

  for (const user of users) {
    await deleteUserWithRelations(user.id);
  }

  console.log(`Deleted ${users.length} seeded AI mock accounts.`);
}

async function main() {
  if (process.argv.includes('--delete')) {
    await deleteSeededAccounts();
    return;
  }

  let created = 0;
  for (const [name, username, description, image] of accounts) {
    const email = `${username}@mock.shine.local`;
    await prisma.user.upsert({
      where: { username },
      update: {
        name,
        description,
        email,
        isAuthorized: true,
        image,
      },
      create: {
        name,
        username,
        description,
        email,
        provider: 'seed',
        image,
        isAuthorized: true,
      },
    });
    created++;
  }
  console.log(`Seeded/updated ${created} AI mock accounts.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
