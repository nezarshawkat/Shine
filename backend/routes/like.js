const express = require("express");
const router = express.Router();
const prisma = require("../prisma");

router.post("/:postId", async (req, res) => {
  const { postId } = req.params;
  const { userId } = req.body;

  if (!userId) return res.status(401).json({ error: "User ID required" });

  try {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { likes: true },
    });

    if (!post) return res.status(404).json({ error: "Post not found" });

    const existingLike = post.likes.find(l => l.userId === userId);

    let liked;
    if (existingLike) {
      await prisma.like.delete({ where: { id: existingLike.id } });
      liked = false;
    } else {
      await prisma.like.create({ data: { userId, postId } });
      liked = true;
    }

    const likesCount = await prisma.like.count({ where: { postId } });

    res.json({ liked, likesCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to toggle like" });
  }
});

module.exports = router;
