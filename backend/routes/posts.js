const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();
const dataService = require("../services/dataService");
const { memoryUpload, uploadFilesToSupabase } = require("../lib/supabaseStorage");
const { queueDigestForAuthorFollowers } = require("../services/notificationDigestService");
const { moderateCreatedPost } = require("../services/sourceModerationService");
const prisma = require("../prisma");

const FORUM_DIGEST_TYPES = new Set(["opinion", "analysis", "critique", "poll"]);
const JWT_SECRET = process.env.JWT_SECRET || "shine-super-secret-key";
const localOnly =
  process.env.DATABASE_MODE === "local" ||
  process.env.LOCAL_ONLY_DB === "true" ||
  !process.env.DATABASE_URL;

const getUserIdFromToken = (req) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const decoded = jwt.verify(authHeader.split(" ")[1], JWT_SECRET);
      return decoded.userId || decoded.id;
    } catch {
      return null;
    }
  }
  return null;
};

function parseJsonBodyValue(value, fallback = []) {
  if (value === undefined || value === null || value === "") return fallback;
  if (Array.isArray(value)) return value;
  try {
    return JSON.parse(value);
  } catch {
    return typeof value === "string" ? value.split(",").filter(Boolean) : fallback;
  }
}

async function updatePostScore(post, redisClient) {
  if (!redisClient || !redisClient.isReady || !post) return;
  try {
    const ageHours = (Date.now() - new Date(post.createdAt).getTime()) / 1000 / 3600;
    const score =
      (post.likesCount || post._count?.likes || 0) * 2 +
      (post.commentsCount || post._count?.comments || 0) * 3 +
      (post.sharesCount || post._count?.shares || 0) * 4 -
      ageHours * 0.5;

    await redisClient.zAdd("feedRanking", {
      score,
      value: String(post.id),
    });
  } catch (err) {
    console.error("Redis score error:", err);
  }
}

// ================== GET POSTS (LOCAL FIRST) ==================
router.get("/", async (req, res) => {
  const userId = getUserIdFromToken(req) || req.query.userId || null;
  try {
    const posts = await dataService.getPosts({
      page: req.query.page,
      pageSize: req.query.pageSize,
      userId,
      excludeIds: String(req.query.exclude || "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)
        .slice(0, 500),
      sessionId: String(req.query.sessionId || "anonymous").slice(0, 120),
      resumePostId: req.query.resumePostId
        ? String(req.query.resumePostId).slice(0, 80)
        : null,
    });

    res.json(posts);
  } catch (err) {
    console.error("Fetch posts error:", err);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

// Feed signals stay in local SQLite and are never queued to Neon. This keeps
// personalization fast and prevents seeded engagement from training the feed.
router.post("/feed/events", async (req, res) => {
  const userId = getUserIdFromToken(req);
  if (!userId) return res.status(204).end();
  try {
    dataService.recordFeedEvents(userId, Array.isArray(req.body.events) ? req.body.events : []);
  } catch (error) {
    console.error("Feed event tracking error:", error.message);
  }
  return res.status(204).end();
});

// ================== TRENDS (LOCAL FIRST) ==================
router.get("/trends", async (req, res) => {
  const redisClient = req.app.get("redisClient");
  const parsedLimit = Number.parseInt(req.query.limit, 10);
  const trendLimit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 10;
  const cacheKey = `weekly_global_trends_hybrid:${trendLimit}`;

  try {
    if (!localOnly && redisClient?.isReady) {
      const cached = await redisClient.get(cacheKey);
      if (cached) return res.json(JSON.parse(cached));
    }

    const result = await dataService.getTrends(trendLimit);

    if (!localOnly && redisClient?.isReady) {
      await redisClient.setEx(cacheKey, 60, JSON.stringify(result));
    }

    res.json(result);
  } catch (err) {
    console.error("Trends error:", err);
    res.status(500).json({ error: "Could not load trends" });
  }
});

// ================== CREATE POST (WRITE LOCAL, QUEUE NEON) ==================
router.post("/", memoryUpload.array("files"), async (req, res) => {
  const redisClient = req.app.get("redisClient");
  try {
    const { text, type, authorId, communityId, parentId } = req.body;

    if (!authorId || !type) {
      return res.status(400).json({ error: "Required fields missing" });
    }

    const keywords = parseJsonBodyValue(req.body.keywords);
    const sources = parseJsonBodyValue(req.body.sources);
    const pollOptions = parseJsonBodyValue(req.body.pollOptions);
    const uploadedMedia = await uploadFilesToSupabase(req.files || [], "post");

    const post = await dataService.createPost({
      text,
      type,
      authorId,
      communityId,
      parentId,
      keywords,
      sources,
      pollOptions,
      uploadedMedia,
      files: req.files || [],
    });

    const moderation = await moderateCreatedPost({
      post,
      authorId,
      dataService,
      prisma: localOnly ? null : prisma,
    });
    if (!moderation.valid) {
      return res.status(422).json({
        error: "Post removed because its sources did not pass verification.",
        reasons: moderation.reasons,
      });
    }

    await updatePostScore(post, redisClient);
    req.app.get("io")?.emit("newPost", post);

    if (!localOnly && FORUM_DIGEST_TYPES.has(String(type || "").toLowerCase())) {
      queueDigestForAuthorFollowers(authorId).catch((error) => {
        console.error("Failed to queue follower digest for post:", error.message);
      });
    }

    res.status(201).json(post);
  } catch (err) {
    console.error("Create post error:", err);
    res.status(500).json({ error: "Failed to create post" });
  }
});

// ================== EDIT POST ==================
router.put("/:id", async (req, res) => {
  try {
    const userId = getUserIdFromToken(req) || req.body.userId || null;
    const updatedPost = await dataService.updatePost(
      req.params.id,
      req.body.text,
      userId
    );

    if (!updatedPost) return res.status(404).json({ error: "Post not found" });
    const moderation = await moderateCreatedPost({
      post: updatedPost,
      authorId: updatedPost.authorId || userId,
      dataService,
      prisma: localOnly ? null : prisma,
    });
    if (!moderation.valid) {
      return res.status(422).json({ error: "Post removed because its sources no longer match its content.", reasons: moderation.reasons });
    }
    res.json(updatedPost);
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ error: "Failed to update post" });
  }
});

// ================== DELETE POST ==================
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await dataService.deletePost(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Post not found" });
    res.json({ message: "Post deleted successfully" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ error: "Failed to delete post" });
  }
});

// ================== STATUS LOOKUPS ==================
router.get("/:id/like-status", async (req, res) => {
  const userId = getUserIdFromToken(req) || req.query.userId;
  try {
    res.json(await dataService.getLikeStatus(req.params.id, userId));
  } catch {
    res.json({ liked: false });
  }
});

router.get("/:id/save-status", async (req, res) => {
  const userId = getUserIdFromToken(req) || req.query.userId;
  try {
    res.json(await dataService.getSaveStatus(req.params.id, userId));
  } catch {
    res.json({ saved: false });
  }
});

// ================== ACTIONS ==================
router.post("/:id/like", async (req, res) => {
  const userId = getUserIdFromToken(req) || req.body.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    res.json(await dataService.toggleLike(req.params.id, userId));
  } catch (err) {
    console.error("Like error:", err);
    res.status(500).json({ error: "Like failed" });
  }
});

router.post("/:id/save", async (req, res) => {
  const userId = getUserIdFromToken(req) || req.body.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    res.json(await dataService.toggleSave(req.params.id, userId));
  } catch (err) {
    console.error("Save error:", err);
    res.status(500).json({ error: "Save failed" });
  }
});

router.post("/:id/share", async (req, res) => {
  const userId = getUserIdFromToken(req) || req.body.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    res.json(await dataService.sharePost(req.params.id, userId));
  } catch (err) {
    console.error("Share error:", err);
    res.status(500).json({ error: "Share failed" });
  }
});

router.get("/:id/comments", async (req, res) => {
  const userId = getUserIdFromToken(req) || req.query.userId || null;
  try {
    res.json(await dataService.getComments(req.params.id, userId));
  } catch (err) {
    console.error("Fetch comments error:", err);
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

router.post("/:id/comments", async (req, res) => {
  const userId = getUserIdFromToken(req) || req.body.userId;
  const { text, parentId } = req.body;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  if (!text) return res.status(400).json({ error: "Comment text is required" });

  try {
    res.status(201).json(await dataService.createComment(req.params.id, userId, text, parentId));
  } catch (err) {
    console.error("Comment error:", err);
    res.status(500).json({ error: "Comment failed" });
  }
});

router.post("/:id/view", async (req, res) => {
  const userId = getUserIdFromToken(req) || req.body.userId || `guest:${req.ip}`;

  try {
    res.json(await dataService.recordView(req.params.id, userId));
  } catch (err) {
    console.error("View error:", err);
    res.json({ viewsCount: 0 });
  }
});

router.post("/:id/vote", async (req, res) => {
  try {
    const userId = getUserIdFromToken(req) || req.body.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!req.body.optionId) return res.status(400).json({ error: "optionId is required" });

    res.json(await dataService.votePoll(req.params.id, req.body.optionId, userId));
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    console.error("Vote error:", err);
    res.status(500).json({ error: "Vote failed" });
  }
});

// ================== GET SINGLE POST ==================
router.get("/:id", async (req, res) => {
  const userId = getUserIdFromToken(req) || req.query.userId || null;
  try {
    const post = await dataService.getSinglePost(req.params.id, userId);
    if (!post) return res.status(404).json({ error: "Post not found" });
    res.json(post);
  } catch (err) {
    console.error("Single post error:", err);
    res.status(500).json({ error: "Internal error" });
  }
});

module.exports = router;
