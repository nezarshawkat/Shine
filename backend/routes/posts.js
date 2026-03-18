const express = require("express");
const router = express.Router();
const prisma = require("../prisma.js");
const multer = require("multer");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "shine-super-secret-key";

// ================== MULTER SETUP ==================
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

// ================== HELPERS ==================

const getUserIdFromToken = (req) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const decoded = jwt.verify(authHeader.split(" ")[1], JWT_SECRET);
      return decoded.userId || decoded.id;
    } catch (e) {
      return null;
    }
  }
  return null;
};

async function updatePostScore(post, redisClient) {
  if (!redisClient || !redisClient.isReady) return;
  try {
    const ageHours = (Date.now() - new Date(post.createdAt).getTime()) / 1000 / 3600;
    const score =
      (post._count?.likes || 0) * 2 +
      (post._count?.comments || 0) * 3 +
      (post._count?.shares || 0) * 4 -
      ageHours * 0.5;

    await redisClient.zAdd("feedRanking", {
      score,
      value: String(post.id),
    });
  } catch (err) {
    console.error("Redis score error:", err);
  }
}

// ================== GET POSTS (PAGINATION) ==================
router.get("/", async (req, res) => {
  const userId = getUserIdFromToken(req) || req.query.userId || null;
  try {
    let { page = 1, pageSize = 10 } = req.query;
    page = parseInt(page);
    pageSize = parseInt(pageSize);

    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(pageSize) || pageSize < 1) pageSize = 10;

    const visiblePostWhere = {
      OR: [
        { communityId: null },
        { community: { status: "PUBLIC" } },
        ...(userId ? [{ community: { communityMembers: { some: { userId } } } }] : []),
      ],
    };

    const posts = await prisma.post.findMany({
      where: visiblePostWhere,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        author: true,
        media: true,
        parentPost: {
          include: {
            author: true,
            media: true,
          },
        },
        likes: userId ? { where: { userId: userId } } : false,
        saves: userId ? { where: { userId: userId } } : false,
        _count: {
          select: {
            likes: true,
            comments: true,
            shares: true,
            views: true,
            saves: true,
          },
        },
      },
    });

    const formattedPosts = posts.map((p) => ({
      ...p,
      isLiked: !!(userId && p.likes && p.likes.length > 0),
      isSaved: !!(userId && p.saves && p.saves.length > 0),
      viewsCount: p._count?.views || 0,
      likesCount: p._count?.likes || 0,
      commentsCount: p._count?.comments || 0,
      sharesCount: p._count?.shares || 0,
      savesCount: p._count?.saves || 0,
    }));

    res.json(formattedPosts);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

// ================== TRENDS (KEYWORDS & HASHTAGS) - UPDATED ==================
router.get("/trends", async (req, res) => {
  const redisClient = req.app.get("redisClient");
  // Updated cache key to reflect the logic change
  const CACHE_KEY = "weekly_global_trends_v4"; 

  try {
    if (redisClient?.isReady) {
      const cached = await redisClient.get(CACHE_KEY);
      if (cached) return res.json(JSON.parse(cached));
    }

    const oneWeekAgo = new Date(Date.now() - 7 * 86400000);

    // 1. Get Viral Keywords via Raw Query
    const viralKeywordsRaw = await prisma.$queryRaw`
      SELECT unnest(keywords) as word, COUNT(*) as usage_count
      FROM "Post"
      WHERE "createdAt" > ${oneWeekAgo}
      GROUP BY word
      ORDER BY usage_count DESC
      LIMIT 12
    `;

    // 2. Get Trending Hashtags from Text Analysis
    const trendingPosts = await prisma.post.findMany({
      where: { createdAt: { gte: oneWeekAgo } },
      select: { text: true },
    });

    const hashtagMap = {};
    trendingPosts.forEach((p) => {
      const tags = p.text?.match(/#\w+/g);
      tags?.forEach((t) => {
        const k = t.slice(1).toLowerCase();
        hashtagMap[k] = (hashtagMap[k] || 0) + 1;
      });
    });

    const result = {
      viralKeywords: viralKeywordsRaw.map((k) => k.word).filter(w => w),
      trendingHashtags: Object.entries(hashtagMap)
        .map(([name, count]) => ({
          name,
          // ✅ PROFESSIONAL LOGIC: 
          // If 1000+, show "1.2K". If less, show the actual number.
          views: count >= 1000 
            ? `${(count / 1000).toFixed(1)}K` 
            : `${count}`, 
          rawCount: count,
        }))
        .sort((a, b) => b.rawCount - a.rawCount)
        .slice(0, 10),
    };

    if (redisClient?.isReady) {
      // ✅ Set cache to 1 hour (3600s) instead of 7 days to keep trends fresh
      await redisClient.setEx(CACHE_KEY, 3600, JSON.stringify(result));
    }

    res.json(result);
  } catch (err) {
    console.error("Trends error:", err);
    res.status(500).json({ error: "Could not load trends" });
  }
});

// ================== CREATE POST ==================
router.post("/", upload.array("files"), async (req, res) => {
  const redisClient = req.app.get("redisClient");
  try {
    const { text, type, authorId, communityId, pollOptions, keywords, sources, parentId } = req.body;

    if (!authorId || !type) return res.status(400).json({ error: "Required fields missing" });

    const parsedKeywords = typeof keywords === "string" ? JSON.parse(keywords) : keywords || [];
    const parsedSources = typeof sources === "string" ? JSON.parse(sources) : sources || [];
    const parsedPollOptions = typeof pollOptions === "string" ? JSON.parse(pollOptions) : pollOptions || [];

    const post = await prisma.post.create({
      data: {
        text: text || "",
        type,
        authorId,
        communityId: (communityId && communityId !== "") ? communityId : null,
        parentId: parentId || null,
        keywords: parsedKeywords,
        sources: { create: parsedSources },
        media: {
          create: req.files?.map((f) => ({
            url: `/uploads/${f.filename}`,
            type: f.mimetype.startsWith("image") ? "image" : "video",
            size: f.size,
            uploaderId: authorId,
          })) || [],
        },
        pollOptions: type === "poll" ? {
          create: parsedPollOptions.map((o) => ({ text: o.text || o })),
        } : undefined,
      },
      include: {
        author: true,
        media: true,
        _count: { select: { likes: true, comments: true, shares: true, views: true, saves: true } },
      },
    });

    await updatePostScore(post, redisClient);
    req.app.get("io")?.emit("newPost", post);
    res.status(201).json(post);
  } catch (err) {
    res.status(500).json({ error: "Failed to create post" });
  }
});

// ================== EDIT POST ==================
router.put("/:id", async (req, res) => {
  try {
    const { text } = req.body;
    const updatedPost = await prisma.post.update({
      where: { id: req.params.id },
      data: { text },
      include: {
        author: true,
        _count: { select: { likes: true, comments: true, shares: true, views: true, saves: true } }
      }
    });
    res.json(updatedPost);
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ error: "Failed to update post" });
  }
});

// ================== DELETE POST ==================
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Delete poll options associated with this post (if any)
    await prisma.pollOption.deleteMany({ where: { postId: id } });

    // 2. Delete the post itself
    await prisma.post.delete({ where: { id: id } });

    res.json({ message: "Post deleted successfully" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ error: "Failed to delete post" });
  }
});

// ================== STATUS LOOKUPS ==================
router.get("/:id/like-status", async (req, res) => {
  const userId = getUserIdFromToken(req) || req.query.userId;
  if (!userId || userId === "null") return res.json({ liked: false });
  try {
    const like = await prisma.like.findFirst({ where: { postId: req.params.id, userId } });
    res.json({ liked: !!like });
  } catch (err) { res.json({ liked: false }); }
});

router.get("/:id/save-status", async (req, res) => {
  const userId = getUserIdFromToken(req) || req.query.userId;
  if (!userId || userId === "null") return res.json({ saved: false });
  try {
    const save = await prisma.save.findFirst({ where: { postId: req.params.id, userId } });
    res.json({ saved: !!save });
  } catch (err) { res.json({ saved: false }); }
});

// ================== ACTIONS ==================
router.post("/:id/like", async (req, res) => {
  const userId = getUserIdFromToken(req) || req.body.userId;
  const postId = req.params.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const existing = await prisma.like.findFirst({ where: { postId, userId } });
    if (existing) {
      await prisma.like.delete({ where: { id: existing.id } });
    } else {
      await prisma.like.create({ data: { postId, userId } });
    }
    const likesCount = await prisma.like.count({ where: { postId } });
    res.json({ status: !existing, likesCount });
  } catch (err) { res.status(500).json({ error: "Like failed" }); }
});

router.post("/:id/save", async (req, res) => {
  const userId = getUserIdFromToken(req) || req.body.userId;
  const postId = req.params.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const existing = await prisma.save.findFirst({ where: { postId, userId } });
    if (existing) {
      await prisma.save.delete({ where: { id: existing.id } });
    } else {
      await prisma.save.create({ data: { postId, userId } });
    }
    const savesCount = await prisma.save.count({ where: { postId } });
    res.json({ status: !existing, savesCount });
  } catch (err) { res.status(500).json({ error: "Save failed" }); }
});

router.post("/:id/share", async (req, res) => {
  const userId = getUserIdFromToken(req) || req.body.userId;
  const postId = req.params.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    await prisma.share.create({ data: { postId, userId } });
    const sharesCount = await prisma.share.count({ where: { postId } });
    res.json({ status: true, sharesCount });
  } catch (err) { res.status(500).json({ error: "Share failed" }); }
});

router.get("/:id/comments", async (req, res) => {
  try {
    const comments = await prisma.comment.findMany({
      where: { postId: req.params.id },
      include: { author: true },
      orderBy: { createdAt: "desc" }
    });
    res.json(comments);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

router.post("/:id/comments", async (req, res) => {
  const userId = getUserIdFromToken(req) || req.body.userId;
  const { text } = req.body;
  const postId = req.params.id;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const newComment = await prisma.comment.create({
      data: { text, authorId: userId, postId },
      include: { author: true }
    });
    const commentsCount = await prisma.comment.count({ where: { postId } });
    res.json({ ...newComment, status: true, commentsCount });
  } catch (err) { res.status(500).json({ error: "Comment failed" }); }
});

router.post("/:id/view", async (req, res) => {
  const { id } = req.params;
  const userId = getUserIdFromToken(req) || req.body.userId || req.ip; // Fallback to IP for guests
  const redisClient = req.app.get("redisClient");
  
  // The key used to track this specific user viewing this specific post
  const VIEW_COOLDOWN_KEY = `view_cooldown:${id}:${userId}`;
  const COOLDOWN_TIME = 3600; // 1 hour cooldown (Professional standard)

  try {
    let alreadyCounted = false;

    // 1. Check Redis first (The "Professional" Filter)
    if (redisClient?.isReady) {
      const exists = await redisClient.get(VIEW_COOLDOWN_KEY);
      if (exists) {
        alreadyCounted = true;
      }
    }

    if (!alreadyCounted) {
      // 2. Record the view in Postgres
      await prisma.postView.create({
        data: { 
          postId: id, 
          userId: (userId && userId.length > 15) ? userId : null // Basic check if it's a UUID/CUID
        },
      });

      // 3. Set a cooldown in Redis so we ignore this user for the next hour
      if (redisClient?.isReady) {
        await redisClient.setEx(VIEW_COOLDOWN_KEY, COOLDOWN_TIME, "1");
      }
    }

    // 4. Return the total count
    const count = await prisma.postView.count({ where: { postId: id } });
    res.json({ viewsCount: count });

  } catch (err) {
    // If it fails (e.g. database unique constraint), just return the current count silently
    const count = await prisma.postView.count({ where: { postId: id } });
    res.json({ viewsCount: count }); 
  }
});

router.post("/:id/vote", async (req, res) => {
  try {
    const { optionId } = req.body;
    const userId = getUserIdFromToken(req) || req.body.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const existingVote = await prisma.pollOption.findFirst({
      where: { postId: req.params.id, votedUsers: { some: { id: userId } } }
    });

    if (existingVote) return res.status(400).json({ error: "Already voted" });

    await prisma.pollOption.update({
      where: { id: optionId },
      data: { votedUsers: { connect: { id: userId } } }
    });

    const updatedOptions = await prisma.pollOption.findMany({
      where: { postId: req.params.id },
      include: { votedUsers: { select: { id: true } }, _count: { select: { votedUsers: true } } }
    });
    res.json(updatedOptions);
  } catch (err) { res.status(500).json({ error: "Vote failed" }); }
});

// ================== GET SINGLE POST ==================
router.get("/:id", async (req, res) => {
  const userId = getUserIdFromToken(req);
  try {
    const post = await prisma.post.findUnique({
      where: { id: req.params.id },
      include: {
        author: true,
        media: true,
        pollOptions: { include: { votedUsers: { select: { id: true } }, _count: { select: { votedUsers: true } } } },
        likes: userId ? { where: { userId } } : false,
        saves: userId ? { where: { userId } } : false,
        sources: true,
        community: true,
        parentPost: {
          include: {
            author: true,
            media: true,
          },
        },
        _count: { select: { likes: true, comments: true, shares: true, views: true, saves: true } }
      }
    });

    if (!post) return res.status(404).json({ error: "Post not found" });

    res.json({
      ...post,
      isLiked: !!(userId && post.likes?.length > 0),
      isSaved: !!(userId && post.saves?.length > 0),
      viewsCount: post._count?.views || 0,
      likesCount: post._count?.likes || 0,
      commentsCount: post._count?.comments || 0,
      sharesCount: post._count?.shares || 0,
      savesCount: post._count?.saves || 0,
    });
  } catch (err) { res.status(500).json({ error: "Internal error" }); }
});


module.exports = router;
