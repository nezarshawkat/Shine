const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const auth = require('../middleware/auth');

/**
 * 1. SEND MESSAGE
 * Updated with better error handling and safety checks
 */
router.post('/send', auth, async (req, res) => {
  try {
    const { receiverId, text, imageUrl } = req.body;
    const senderId = req.user.id;

    if (!receiverId) return res.status(400).json({ error: "Receiver ID is required" });
    if (!text && !imageUrl) return res.status(400).json({ error: "Message content cannot be empty" });

    if (receiverId === senderId) {
      return res.status(400).json({ error: "You cannot message yourself." });
    }

    // Check Friendship (Mutual Follow)
    const followsSender = await prisma.follows.findFirst({
      where: { followerId: receiverId, followingId: senderId }
    });
    const followsReceiver = await prisma.follows.findFirst({
      where: { followerId: senderId, followingId: receiverId }
    });

    const isFriends = !!(followsSender && followsReceiver);

    // Restriction Logic
    if (!isFriends) {
      const existingChat = await prisma.message.findFirst({
        where: { senderId, receiverId }
      });

      if (existingChat) {
        return res.status(403).json({ 
          error: "Message pending. You can send more once they follow you back." 
        });
      }
    }

    const message = await prisma.message.create({
      data: { senderId, receiverId, text, imageUrl },
      include: { sender: { select: { username: true, image: true } } }
    });

    // Notify safely - don't let notification failure crash the message send
    try {
      await prisma.notification.create({
        data: {
          userId: receiverId,
          type: "MESSAGE",
          content: `${message.sender.username} sent you a message.`,
          link: `/messenger`
        }
      });
    } catch (e) { console.error("Notification log only:", e.message); }

    res.status(201).json(message);
  } catch (err) {
    console.error("Messenger Send Error:", err);
    res.status(500).json({ error: "Server error while sending message" });
  }
});

/**
 * 2. GET CONVERSATIONS
 */
router.get('/conversations', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const messages = await prisma.message.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
        NOT: { deletedBy: { has: userId } }
      },
      orderBy: { createdAt: 'desc' },
      include: {
        sender: { select: { id: true, name: true, username: true, image: true } },
        receiver: { select: { id: true, name: true, username: true, image: true } }
      }
    });

    const chatPartners = new Map();
    messages.forEach(msg => {
      const partner = msg.senderId === userId ? msg.receiver : msg.sender;
      if (partner && !chatPartners.has(partner.id)) {
        chatPartners.set(partner.id, {
          user: partner,
          lastMessage: msg.text || "Image",
          lastMessageDate: msg.createdAt,
          isRead: msg.receiverId === userId ? msg.isRead : true
        });
      }
    });

    res.json(Array.from(chatPartners.values()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 3. GET CHAT HISTORY
 */
router.get('/history/:partnerId', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { partnerId } = req.params;

    const history = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: partnerId },
          { senderId: partnerId, receiverId: userId }
        ],
        NOT: { deletedBy: { has: userId } }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Mark as read
    await prisma.message.updateMany({
      where: { senderId: partnerId, receiverId: userId, isRead: false },
      data: { isRead: true }
    });

    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;