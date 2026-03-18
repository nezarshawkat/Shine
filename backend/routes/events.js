const express = require("express");
const router = express.Router();
const prisma = require("../prisma"); // ✅ use shared prisma instance
const auth = require("../middleware/auth");

async function getGuestSupportUser() {
  const email = "guest-support@shine.local";
  const username = "guest_support";
  const existingByEmail = await prisma.user.findUnique({ where: { email } });
  if (existingByEmail) return existingByEmail;

  const existingByUsername = await prisma.user.findUnique({ where: { username } });
  if (existingByUsername) return existingByUsername;

  return prisma.user.create({
    data: {
      email,
      username,
      name: "Guest Support",
    },
  });
}

/**
 * ==========================================
 * GET ALL EVENTS
 * ==========================================
 */
router.get("/", async (req, res) => {
  try {
    const events = await prisma.event.findMany({
      orderBy: { date: "asc" },
    });

    res.json({ data: events });
  } catch (err) {
    console.error("Fetch Events Error:", err);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

/**
 * ==========================================
 * GET EVENT BY ID
 * ==========================================
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const event = await prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.json(event);
  } catch (err) {
    console.error("Fetch Event Error:", err);
    res.status(500).json({ error: "Failed to fetch event" });
  }
});

/**
 * ==========================================
 * PARTICIPATE IN EVENT
 * ==========================================
 * Secure flow:
 * - Authenticated users only
 * - One participation per user/event
 * - Admin signal via support inbox message
 * - Auto system notification to the participant with event details
 */
router.post("/:id/participate", auth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const event = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!event) return res.status(404).json({ error: "Event not found" });

    const existing = await prisma.eventParticipation.findUnique({
      where: { eventId_userId: { eventId: event.id, userId } },
    });

    if (existing) {
      return res.status(200).json({
        data: existing,
        alreadyParticipating: true,
        message: "You already requested participation details.",
      });
    }

    const participation = await prisma.eventParticipation.create({
      data: { eventId: event.id, userId },
    });

    const participant = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, username: true, email: true },
    });

    // Admin-facing signal using existing support queue workflow.
    const guestUser = await getGuestSupportUser();
    await prisma.supportMessage.create({
      data: {
        userId: guestUser.id,
        subject: `Event Participation: ${event.title}`,
        message: `User ${participant?.name || participant?.username || userId} (${participant?.email || "no-email"}) requested participation for event "${event.title}" (${event.id}).`,
      },
    });

    // User-facing system message via existing system messaging infrastructure.
    await prisma.notification.create({
      data: {
        userId,
        type: "SYSTEM",
        content:
          event.detailsMessage ||
          `Thanks for participating in "${event.title}". We will contact you with the next steps.`,
        link: "/events",
      },
    });

    return res.status(201).json({ data: participation, alreadyParticipating: false });
  } catch (err) {
    console.error("Event participation error:", err);
    return res.status(500).json({ error: "Failed to submit participation request" });
  }
});

module.exports = router;
