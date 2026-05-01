async function simulatePostEngagement(prisma, postId, actors) {
  const shuffled = [...actors].sort(() => Math.random() - 0.5);
  const likes = shuffled.slice(0, Math.floor(Math.random() * 10) + 3);
  const comments = shuffled.slice(0, Math.floor(Math.random() * 4));
  const shares = shuffled.slice(0, Math.floor(Math.random() * 3));
  const saves = shuffled.slice(0, Math.floor(Math.random() * 5));
  const views = shuffled.slice(0, Math.floor(Math.random() * 25) + 10);

  await Promise.allSettled([
    ...likes.map((u) => prisma.like.create({ data: { userId: u.id, postId } })),
    ...comments.map((u, i) => prisma.comment.create({ data: { authorId: u.id, postId, text: `Interesting point ${i + 1}` } })),
    ...shares.map((u) => prisma.share.create({ data: { userId: u.id, postId } })),
    ...saves.map((u) => prisma.save.create({ data: { userId: u.id, postId } })),
    ...views.map((u) => prisma.postView.create({ data: { userId: u.id, postId } })),
  ]);
}

module.exports = { simulatePostEngagement };
