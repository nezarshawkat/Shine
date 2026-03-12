// routes/like.js
const express = require("express");
const prisma = require("../prisma");
const { updatePostRanking } = require("../utils/feedRanking");
const router = express.Router();

router.post("/", async (req, res) => {
  const { postId, userId } = req.body;

  try {
    const post = await prisma.post.update({
      where: { id: postId },
      data: { likes: { connect: { id: userId } } },
      include: { likes: true, comments: true, shares: true },
    });

    // Update ranking
    await updatePostRanking(postId);

    // Emit real-time update
    req.app.get("io")?.emit("postUpdated", { postId, likes: post.likes.length });

    res.json({ success: true, likes: post.likes.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to like post" });
  }
});

module.exports = router;
