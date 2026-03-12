// backend/utils/feedRanking.js
const redis = require("redis");
const prisma = require("../prisma");

let redisClient = null;
if (process.env.ENABLE_REDIS_CACHE === "true") {
  redisClient = redis.createClient({ url: process.env.REDIS_URL });
  redisClient.connect().catch(console.error);
}

// Ranking algorithm (adjust weights as needed)
async function calculateScore(post) {
  const now = Date.now();
  const ageHours = (now - new Date(post.createdAt).getTime()) / 1000 / 3600;

  const score =
    (post.likes?.length || 0) * 2 +
    (post.comments?.length || 0) * 3 +
    (post.shares?.length || 0) * 4 -
    ageHours * 0.5;

  return score;
}

// Update Redis score for a post
async function updatePostRanking(postId) {
  try {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { likes: true, comments: true, shares: true },
    });

    if (!post) return;

    const score = await calculateScore(post);
    if (redisClient) {
      await redisClient.zAdd("feedRanking", { score, value: postId });
    }
  } catch (err) {
    console.error("Failed to update post ranking:", err);
  }
}

module.exports = { updatePostRanking, redisClient };
