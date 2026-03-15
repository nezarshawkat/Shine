const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const auth = require('../middleware/auth');

/**
 * 1. GET INBOX SUMMARY (For Sidebar)
 * Retrieves the last 3 unique conversations for a quick preview
 */
router.get('/inbox', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get messages relevant to the user, excluding those they deleted
    const messages = await prisma.message.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
        NOT: { deletedBy: { has: userId } }
      },
      orderBy: { createdAt: 'desc' },
      include: {
        sender: { select: { id: true, username: true, name: true } },
        receiver: { select: { id: true, username: true, name: true } }
      }
    });

    const chatPartners = new Map();
    messages.forEach(msg => {
      const partner = msg.senderId === userId ? msg.receiver : msg.sender;
      if (partner && !chatPartners.has(partner.id)) {
        chatPartners.set(partner.id, {
          _id: partner.id,
          participantName: partner.name || partner.username,
          lastMessage: msg.text || "📷 Image",
          isRead: msg.receiverId === userId ? msg.isRead : true,
          unread: msg.receiverId === userId && !msg.isRead
        });
      }
    });

    // Return only the top 3 most recent unique conversations
    res.json(Array.from(chatPartners.values()).slice(0, 3));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 2. SEND MESSAGE
 * Logic includes friendship checks and a safety wrapper for notifications
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

    // Check Friendship (Mutual Follow) status for restriction logic
    const followsSender = await prisma.follows.findFirst({
      where: { followerId: receiverId, followingId: senderId }
    });
    const followsReceiver = await prisma.follows.findFirst({
      where: { followerId: senderId, followingId: receiverId }
    });

    const isFriends = !!(followsSender && followsReceiver);

    // If not mutual friends, limit to one message until they follow back
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

    // Notify safely - failure here should not block the response
    try {
      await prisma.notification.create({
        data: {
          userId: receiverId,
          type: "MESSAGE",
          content: `${message.sender.username} sent you a message.`,
          link: `/messenger`
        }
      });
    } catch (e) { 
      console.error("Notification log only:", e.message); 
    }

    res.status(201).json(message);
  } catch (err) {
    console.error("Messenger Send Error:", err);
    res.status(500).json({ error: "Server error while sending message" });
  }
});

/**
 * 3. GET CONVERSATIONS
 * Retrieves all unique chat conversations for the main Messenger view
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
 * 4. GET CHAT HISTORY
 * Fetches individual messages between two users and marks unread ones as read
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

    // Update incoming messages as 'read'
    await prisma.message.updateMany({
      where: { 
        senderId: partnerId, 
        receiverId: userId, 
        isRead: false 
      },
      data: { isRead: true }
    });

    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



router.get('/system', auth, async (req, res) => {
  try {
    const data = await prisma.notification.findMany({
      where: { userId: req.user.id, type: 'SYSTEM' },
      orderBy: { createdAt: 'desc' }
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/system/:id/read', auth, async (req, res) => {
  try {
    const data = await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true }
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;