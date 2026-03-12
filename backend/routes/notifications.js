const express = require('express');
const router = express.Router();
const prisma = require("../prisma");

// Fetch all notifications for the user
router.get('/', async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: "Failed to load notifications." });
  }
});

// Mark all as read
router.put('/read-all', async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true }
    });
    res.sendStatus(200);
  } catch (err) {
    res.status(500).json({ error: "Update failed." });
  }
});

// Utility to create a notification (Call this when someone follows, likes, etc.)
const createNotification = async (userId, type, content, link = null) => {
  return await prisma.notification.create({
    data: { userId, type, content, link }
  });
};

module.exports = router;
module.exports.createNotification = createNotification;