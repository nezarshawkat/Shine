require('dotenv').config();
const prisma = require('./prisma');
const { SEEDED_PROFILES } = require('./seed_profile_images');
const { deleteUserWithRelations } = require('./controllers/admin/deletionHelpers');
const { ensureSeededAccounts } = require('./services/seededAccountService');

const accounts = SEEDED_PROFILES.map(({ name, username, description, image }) => [name, username, description, image]);

async function deleteSeededAccounts() {
  const localOnly = process.env.DATABASE_MODE === 'local' || process.env.LOCAL_ONLY_DB === 'true' || !process.env.DATABASE_URL;
  if (localOnly) {
    const local = require('./db/local');
    const db = local.getDb();
    const ids = db.prepare("SELECT id FROM User WHERE provider = 'seed'").all().map((row) => row.id);
    db.transaction(() => {
      for (const id of ids) {
        db.prepare("DELETE FROM LikeRecord WHERE userId = ?").run(id);
        db.prepare("DELETE FROM PostView WHERE userId = ?").run(id);
        db.prepare("DELETE FROM Comment WHERE authorId = ?").run(id);
        db.prepare("DELETE FROM User WHERE id = ?").run(id);
      }
    })();
    console.log(`Deleted ${ids.length} seeded AI mock accounts.`);
    return;
  }
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

  const localOnly = process.env.DATABASE_MODE === 'local' || process.env.LOCAL_ONLY_DB === 'true' || !process.env.DATABASE_URL;
  const created = await ensureSeededAccounts(localOnly ? null : prisma);
  console.log(`Seeded/updated ${created} AI mock accounts.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
