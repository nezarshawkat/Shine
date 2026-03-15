const express = require("express");
const prisma = require("../prisma");
const auth = require("../middleware/auth");

const router = express.Router();

async function getGuestSupportUser() {
  const email = "guest-support@shine.local";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;

  return prisma.user.create({
    data: {
      email,
      username: "guest_support",
      name: "Guest Support",
      isAuthorized: true,
    },
  });
}

router.post("/", auth, async (req, res) => {
  try {
    const { subject, message } = req.body;
    if (!subject || !message) return res.status(400).json({ error: "subject and message are required" });

    const data = await prisma.supportMessage.create({
      data: {
        userId: req.user.id,
        subject,
        message,
      },
    });

    res.status(201).json({ data });
  } catch (error) {
    res.status(500).json({ error: "Failed to submit support message" });
  }
});

router.post("/public", async (req, res) => {
  try {
    const { subject, message } = req.body;
    if (!subject || !message) return res.status(400).json({ error: "subject and message are required" });

    const guestUser = await getGuestSupportUser();

    const data = await prisma.supportMessage.create({
      data: {
        userId: guestUser.id,
        subject,
        message,
      },
    });

    res.status(201).json({ data });
  } catch (error) {
    res.status(500).json({ error: "Failed to submit support message" });
  }
});

module.exports = router;
