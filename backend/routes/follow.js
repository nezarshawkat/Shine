const express = require("express");
const prisma = require("../prisma");
const router = express.Router();

router.post("/:userId/follow", async (req, res) => {
  const { userId } = req.params; 
  const { followerId } = req.body;

  if (!followerId) return res.status(400).json({ error: "Missing followerId" });
  if (followerId === userId) return res.status(400).json({ error: "Cannot follow yourself" });

  try {
    await prisma.follows.create({
      data: { followerId, followingId: userId },
    });
    res.json({ message: "Followed successfully" });
  } catch (err) {
    if (err.code === "P2002") return res.status(400).json({ error: "Already following" });
    res.status(500).json({ error: "Failed to follow" });
  }
});

router.post("/:userId/unfollow", async (req, res) => {
  const { userId } = req.params;
  const { followerId } = req.body;
  try {
    await prisma.follows.deleteMany({
      where: { followerId, followingId: userId },
    });
    res.json({ message: "Unfollowed successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to unfollow" });
  }
});

module.exports = router;