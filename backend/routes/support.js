const express = require("express");
const prisma = require("../prisma");
const jwt = require("jsonwebtoken");

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

function resolveUserIdFromToken(req) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded?.userId || null;
  } catch {
    return null;
  }
}

async function createSupportMessage(req, res, { forceGuest = false } = {}) {
  try {
    const { subject, message } = req.body;
    if (!subject || !message) {
      return res.status(400).json({ error: "subject and message are required" });
    }

    let userId = forceGuest ? null : resolveUserIdFromToken(req);

    if (!userId) {
      const guestUser = await getGuestSupportUser();
      userId = guestUser.id;
    }

    const data = await prisma.supportMessage.create({
      data: {
        userId,
        subject,
        message,
      },
    });

    return res.status(201).json({ data });
  } catch (error) {
    console.error("Support message error:", error);
    return res.status(500).json({ error: "Failed to submit support message" });
  }
}

router.post("/", async (req, res) => createSupportMessage(req, res));
router.post("/public", async (req, res) => createSupportMessage(req, res, { forceGuest: true }));

module.exports = router;
