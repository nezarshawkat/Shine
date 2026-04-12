require('dotenv').config();
const prisma = require('../prisma');
const { cleanupDemoData } = require('./seed-social-demo');

async function run() {
  console.log('Removing demo social seed data...');
  await cleanupDemoData();
  console.log('Demo social seed data removed.');
}

run()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
