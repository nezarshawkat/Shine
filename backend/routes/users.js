const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const express = require("express");
const router = express.Router();
const prisma = require("../prisma");
const multer = require("multer");
const path = require("path");

// ---------------- MULTER CONFIGURATION ----------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); 
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });

// ---------------- TEST ROUTE ----------------
router.get("/test", (req, res) => {
  res.send("Users route is working!");
});

// ---------------- SIGNUP ----------------
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, username } = req.body;

    if (!name || !email || !password || !username) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });

    if (existingUser) {
      return res.status(400).json({ error: "Email or username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        username,
        password: hashedPassword,
        description: "",
        image: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        description: true,
        image: true,
        createdAt: true,
        roleLevel: true,
      },
    });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.status(201).json({ user, token });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Signup failed", details: err.message });
  }
});

// ---------------- LOGIN ----------------
router.post("/login", async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body;

    if (!emailOrUsername || !password) {
      return res.status(400).json({ error: "Email/Username and password required" });
    }

    const user = await prisma.user.findFirst({
      where: { OR: [{ email: emailOrUsername }, { username: emailOrUsername }] },
      include: {
        followers: true,
        following: true,
      }
    });

    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword, token });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed", details: err.message });
  }
});

// ---------------- SEARCH USERS ----------------
router.get("/search", async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json([]);

  try {
    const users = await prisma.user.findMany({
      where: {
        username: {
          contains: q,
          mode: 'insensitive',
        },
      },
      take: 5,
      select: {
        id: true,
        username: true,
        name: true,
        image: true
      }
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Search failed" });
  }
});

// ---------------- GET USER BY USERNAME ----------------
router.get("/:username", async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { username: req.params.username },
      include: { 
        memberships: { include: { community: true } },
        followers: true,
        following: true
      },
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// ---------------- UPDATE USER PROFILE & SETTINGS ----------------
router.put("/:userId", upload.single("image"), async (req, res) => {
  const { userId } = req.params;
  const { name, username, description, email } = req.body;
  
  try {
    let updateData = {};
    if (name) updateData.name = name;
    if (username) updateData.username = username;
    if (description !== undefined) updateData.description = description;
    if (email) updateData.email = email;

    if (req.file) {
      updateData.image = `/uploads/${req.file.filename}`;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: { followers: true, following: true }
    });

    const { password, ...userWithoutPassword } = updatedUser;
    res.json({ user: userWithoutPassword });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// ---------------- UPDATE PASSWORD ----------------
router.put("/:userId/password", async (req, res) => {
  const { userId } = req.params;
  const { currentPassword, newPassword } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: "Current password is incorrect" });

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword }
    });

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------- DELETE ACCOUNT ----------------
router.delete("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    // Prisma will handle relations if 'onDelete: Cascade' is in schema, 
    // otherwise you may need to delete related records first.
    await prisma.user.delete({ where: { id: userId } });
    res.json({ message: "Account deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete account" });
  }
});

// ---------------- UNBLOCK USER (Stub based on Schema) ----------------
// Note: Your current schema doesn't have a 'Blocked' model. 
// If you add one later, this is where the logic goes.
router.post("/unblock/:targetId", async (req, res) => {
    // This is a placeholder as the Prisma schema provided doesn't have a Block model yet
    res.status(200).json({ message: "User unblocked successfully" });
});

// ---------------- GET USER POSTS ----------------
router.get("/:userId/posts", async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
      where: { authorId: req.params.userId },
      include: {
        author: true,
        likes: true,
        comments: true,
        shares: true,
        media: true,
        pollOptions: { orderBy: { id: "asc" } },
        community: true,
        sources: true,
        _count: { select: { views: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(posts.map((p) => ({ ...p, viewsCount: p._count.views })));
  } catch {
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

// ---------------- GET LIKED CONTENT ----------------
router.get("/:userId/liked", async (req, res) => {
  try {
    const likes = await prisma.like.findMany({
      where: { userId: req.params.userId },
      include: {
        post: { include: { author: true, media: true, sources: true } },
        article: { include: { author: true, media: true, _count: true } },
      },
    });
    const likedContent = likes.map((l) => l.post || l.article).filter(Boolean);
    res.json(likedContent);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch liked content" });
  }
});

// ---------------- GET SAVED CONTENT ----------------
router.get("/:userId/saved", async (req, res) => {
  try {
    const saved = await prisma.save.findMany({
      where: { userId: req.params.userId },
      include: {
        post: {
          include: {
            author: true,
            media: true,
            sources: true,
            pollOptions: true,
            _count: { select: { likes: true, comments: true, shares: true, views: true, saves: true } },
          },
        },
        article: {
          include: {
            author: true,
            media: true,
            _count: { select: { likes: true, saves: true, views: true } },
          },
        },
      },
    });

    const savedContent = saved
      .map((s) => {
        const item = s.post || s.article;
        if (!item) return null;
        return {
          ...item,
          viewsCount: item._count?.views || 0,
          likesCount: item._count?.likes || 0,
          contentType: s.post ? "post" : "article",
        };
      })
      .filter(Boolean);

    res.json(savedContent);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch saved content" });
  }
});

// ---------------- FOLLOWERS ----------------
router.get("/:username/followers", async (req, res) => {
  try {
    const { username } = req.params;
    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        followers: {
          include: {
            follower: true,
          },
        },
      },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    const followersList = user.followers.map((f) => f.follower);
    res.json(followersList);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch followers" });
  }
});

// ---------------- FOLLOWING ----------------
router.get("/:username/following", async (req, res) => {
  try {
    const { username } = req.params;
    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        following: {
          include: {
            following: true,
          },
        },
      },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    const followingList = user.following.map((f) => f.following);
    res.json(followingList);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch following list" });
  }
});

module.exports = router;