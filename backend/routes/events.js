const express = require("express");
const router = express.Router();
const prisma = require("../prisma"); // ✅ use shared prisma instance

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

    res.json(events); // same style as communities
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

module.exports = router;