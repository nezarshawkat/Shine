const express = require("express");
const prisma = require("../prisma");
const auth = require("../middleware/auth");

const router = express.Router();

router.post("/", auth, async (req, res) => {
  try {
    const { type, targetId, reason } = req.body;

    if (!type || !targetId || !reason) {
      return res.status(400).json({ error: "type, targetId and reason are required" });
    }

    const normalizedType = String(type).toUpperCase();
    if (!["POST", "COMMUNITY", "PROFILE"].includes(normalizedType)) {
      return res.status(400).json({ error: "Invalid report type" });
    }

    const payload = {
      type: normalizedType,
      reporterId: req.user.id,
      reason,
      ...(normalizedType === "POST" ? { postId: targetId } : {}),
      ...(normalizedType === "COMMUNITY" ? { communityId: targetId } : {}),
      ...(normalizedType === "PROFILE" ? { profileId: targetId } : {}),
    };

    const report = await prisma.adminReport.create({ data: payload });
    res.status(201).json({ data: report });
  } catch (error) {
    res.status(500).json({ error: "Failed to submit report" });
  }
});

module.exports = router;
