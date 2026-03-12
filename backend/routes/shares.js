// routes/shares.js
const express = require("express");
const prisma = require("../prisma");
const { updatePostRanking } = require("../utils/feedRanking");
const router = express.Router();

router.post("/", async (req, res) => {
  const { postId, userId } = req.body;

  try {
    const post = await prisma.post.update({
      where: { id: postId },
      data: { shares: { connect: { id: userId } } },
      include: { likes: true, comments: true, shares: true },
    });

    await updatePostRanking(postId);

    req.app.get("io")?.emit("postUpdated", { postId, shares: post.shares.length });

    res.json({ success: true, shares: post.shares.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to share post" });
  }
});

module.exports = router;
