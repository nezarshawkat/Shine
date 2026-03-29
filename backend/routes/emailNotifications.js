const express = require("express");
const auth = require("../middleware/auth");
const prisma = require("../prisma");
const { getOrCreatePreference, runDigestCycle } = require("../services/notificationDigestService");

const router = express.Router();

router.get("/preferences", auth, async (req, res) => {
  try {
    const preference = await getOrCreatePreference(req.user.id);
    res.json(preference);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch email notification preferences" });
  }
});

router.put("/preferences", auth, async (req, res) => {
  try {
    const existing = await getOrCreatePreference(req.user.id);
    const {
      enabled,
      enableMessages,
      enableFollowingPosts,
      enableCommunityPosts,
      enableArticles,
      enablePolls,
      digestFrequencyMinutes,
    } = req.body;

    const updated = await prisma.emailNotificationPreference.update({
      where: { userId: req.user.id },
      data: {
        enabled: typeof enabled === "boolean" ? enabled : existing.enabled,
        enableMessages: typeof enableMessages === "boolean" ? enableMessages : existing.enableMessages,
        enableFollowingPosts:
          typeof enableFollowingPosts === "boolean" ? enableFollowingPosts : existing.enableFollowingPosts,
        enableCommunityPosts:
          typeof enableCommunityPosts === "boolean" ? enableCommunityPosts : existing.enableCommunityPosts,
        enableArticles: typeof enableArticles === "boolean" ? enableArticles : existing.enableArticles,
        enablePolls: typeof enablePolls === "boolean" ? enablePolls : existing.enablePolls,
        digestFrequencyMinutes:
          Number.isFinite(Number(digestFrequencyMinutes)) && Number(digestFrequencyMinutes) >= 5
            ? Number(digestFrequencyMinutes)
            : existing.digestFrequencyMinutes,
      },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Failed to update email notification preferences" });
  }
});

router.post("/messages/viewed", auth, async (req, res) => {
  try {
    await getOrCreatePreference(req.user.id);
    await prisma.emailNotificationPreference.update({
      where: { userId: req.user.id },
      data: { lastMessengerViewedAt: new Date() },
    });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to update messenger view state" });
  }
});

router.post("/run-now", async (req, res) => {
  // Optional protected trigger; use NOTIFICATION_DIGEST_SECRET in env for ad-hoc runs.
  const secret = process.env.NOTIFICATION_DIGEST_SECRET;
  if (secret && req.headers["x-digest-secret"] !== secret) {
    return res.status(401).json({ error: "Unauthorized digest trigger" });
  }

  try {
    await runDigestCycle();
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to run digest" });
  }
});

module.exports = router;
