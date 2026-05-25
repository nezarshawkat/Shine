require('dotenv').config();

const prisma = require('../prisma');

async function main() {
  const [users, communities, posts, comments, articles] = await Promise.all([
    prisma.user.count(),
    prisma.community.count(),
    prisma.post.count(),
    prisma.comment.count(),
    prisma.article.count(),
  ]);

  console.log({ users, communities, posts, comments, articles });
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
