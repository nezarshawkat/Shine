const express = require("express");
const jwt = require("jsonwebtoken");
const prisma = require("../prisma");
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "shine-super-secret-key";

// ================= INTERNAL AUTH MIDDLEWARE =================
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Map 'userId' from login token to 'req.user.id'
    req.user = { id: decoded.userId || decoded.id }; 
    next();
  } catch (err) {
    console.error("JWT Verification Error:", err.message);
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};

// ================= HELPER: FORMAT COMMENT =================
function formatComment(comment, userId) {
  if (!comment) return null;
  return {
    ...comment,
    _count: {
      likes: comment._count?.likes || 0,
      replies: comment._count?.replies || 0
    },
    // If the 'likes' array has items, it means THIS user liked it
    isLiked: !!(userId && comment.likes && comment.likes.length > 0)
  };
}

// ================= ROUTES =================

// 1. GET COMMENTS FOR A POST (Includes isLiked status check)
router.get("/posts/:postId/comments", async (req, res) => {
  const { postId } = req.params;
  
  let userId = null;
  const authHeader = req.headers.authorization;
  
  // Extract userId from token if user is logged in
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const decoded = jwt.verify(authHeader.split(" ")[1], JWT_SECRET);
      userId = decoded.userId || decoded.id;
    } catch (e) { 
      // Silently ignore if token is invalid, treat as guest
    }
  }

  try {
    const comments = await prisma.comment.findMany({
      where: { postId: postId, parentId: null },
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { id: true, name: true, image: true, username: true } },
        // This is the magic part: it only fetches a like if it belongs to the logged-in user
        likes: userId ? { where: { userId: userId }, select: { id: true } } : false,
        _count: { select: { likes: true, replies: true } }
      }
    });

    // We use the helper to turn the 'likes' array into the 'isLiked' boolean
    const formatted = comments.map(c => {
      const formattedC = formatComment(c, userId);
      // Clean up the likes array from the response to save bandwidth
      delete formattedC.likes;
      return formattedC;
    });

    res.json(formatted);
  } catch (err) {
    console.error("GET COMMENTS ERROR:", err);
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

// 2. CREATE A COMMENT
router.post("/posts/:postId/comments", authMiddleware, async (req, res) => {
  const { postId } = req.params;
  const { text } = req.body;
  const userId = req.user.id;

  if (!text) return res.status(400).json({ error: "Comment text is required" });

  try {
    const newComment = await prisma.comment.create({
      data: {
        text,
        postId,
        authorId: userId
      },
      include: {
        author: { select: { id: true, name: true, image: true, username: true } },
        likes: { where: { userId: userId }, select: { id: true } },
        _count: { select: { likes: true, replies: true } }
      }
    });
    const result = formatComment(newComment, userId);
    delete result.likes;
    res.status(201).json(result);
  } catch (err) {
    console.error("POST COMMENT ERROR:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
});

// 3. EDIT A COMMENT
router.put("/comments/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { text } = req.body;
  const userId = req.user.id;

  try {
    const comment = await prisma.comment.findUnique({ where: { id } });
    if (!comment || comment.authorId !== userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const updated = await prisma.comment.update({
      where: { id },
      data: { text },
      include: {
        author: { select: { id: true, name: true, image: true, username: true } },
        likes: { where: { userId: userId }, select: { id: true } },
        _count: { select: { likes: true, replies: true } }
      }
    });
    const result = formatComment(updated, userId);
    delete result.likes;
    res.json(result);
  } catch (err) {
    console.error("UPDATE COMMENT ERROR:", err);
    res.status(500).json({ error: "Update failed" });
  }
});

// 4. DELETE A COMMENT
router.delete("/comments/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const comment = await prisma.comment.findUnique({ where: { id } });
    if (!comment || comment.authorId !== userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await prisma.comment.delete({ where: { id } });
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error("DELETE COMMENT ERROR:", err);
    res.status(500).json({ error: "Delete failed" });
  }
});

// 5. LIKE/UNLIKE COMMENT
router.post("/comments/:id/like", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const existing = await prisma.like.findFirst({
      where: { userId, commentId: id }
    });

    if (existing) {
      await prisma.like.delete({ where: { id: existing.id } });
    } else {
      await prisma.like.create({
        data: { userId, commentId: id }
      });
    }

    const likeCount = await prisma.like.count({ where: { commentId: id } });
    res.json({ liked: !existing, likeCount });
  } catch (err) {
    console.error("LIKE TOGGLE ERROR:", err);
    res.status(500).json({ error: "Like operation failed" });
  }
});

module.exports = router;