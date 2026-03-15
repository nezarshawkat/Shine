const express = require("express");
const prisma = require("../prisma");
const auth = require("../middleware/auth");

const router = express.Router();

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

module.exports = router;
