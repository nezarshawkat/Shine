const express = require("express");
const prisma = require("../prisma");
const router = express.Router();
const auth = require("../middleware/auth");

router.post("/:userId/follow", async (req, res) => {
  const { userId } = req.params; 
  const { followerId } = req.body;

  if (!followerId) return res.status(400).json({ error: "Missing followerId" });
  if (followerId === userId) return res.status(400).json({ error: "Cannot follow yourself" });

  try {
    const blockedRelation = await prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: followerId, blockedId: userId },
          { blockerId: userId, blockedId: followerId },
        ],
      },
    });
    if (blockedRelation) {
      return res.status(403).json({ error: "Cannot follow this user" });
    }

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

router.post("/block/:targetId", auth, async (req, res) => {
  const blockerId = req.user.id;
  const { targetId } = req.params;

  if (!targetId) return res.status(400).json({ error: "Missing targetId" });
  if (targetId === blockerId) return res.status(400).json({ error: "Cannot block yourself" });

  try {
    await prisma.block.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId: targetId } },
      update: {},
      create: { blockerId, blockedId: targetId },
    });

    // Clean follow state both directions once blocked.
    await prisma.follows.deleteMany({
      where: {
        OR: [
          { followerId: blockerId, followingId: targetId },
          { followerId: targetId, followingId: blockerId },
        ],
      },
    });

    res.json({ message: "User blocked successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to block user" });
  }
});

router.delete("/block/:targetId", auth, async (req, res) => {
  const blockerId = req.user.id;
  const { targetId } = req.params;

  try {
    await prisma.block.deleteMany({
      where: { blockerId, blockedId: targetId },
    });
    res.json({ message: "User unblocked successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to unblock user" });
  }
});

router.get("/blocked", auth, async (req, res) => {
  try {
    const blocked = await prisma.block.findMany({
      where: { blockerId: req.user.id },
      include: {
        blocked: {
          select: { id: true, username: true, name: true, image: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(blocked.map((entry) => entry.blocked).filter(Boolean));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch blocked users" });
  }
});

module.exports = router;
