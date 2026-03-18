const express = require("express");
const router = express.Router();
const prisma = require("../prisma");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const auth = require("../middleware/auth");

// ================== UPLOAD SETUP ==================
// Using 'public/uploads/' to match your community settings and allow static serving
const uploadDir = "public/uploads/";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Adding a small random suffix to prevent name collisions
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e4);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

const upload = multer({ storage });

/* =====================================================
    GET ALL ARTICLES (PAGINATED FEED)
===================================================== */
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";

    const where = search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { content: { contains: search, mode: "insensitive" } },
          ],
        }
      : {};

    const [articles, totalArticles] = await Promise.all([
      prisma.article.findMany({
        where: where,
        skip: skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          author: {
            select: { id: true, username: true, name: true, image: true },
          },
          media: {
            take: 1,
            select: { url: true, type: true },
          },
          _count: {
            select: { likes: true, saves: true, views: true },
          },
        },
      }),
      prisma.article.count({ where: where }),
    ]);

    const totalPages = Math.ceil(totalArticles / limit);

    res.json({
      metadata: {
        totalArticles,
        totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      articles,
    });
  } catch (err) {
    console.error("FEED FETCH ERROR:", err);
    res.status(500).json({ error: "Internal server error fetching feed" });
  }
});

/* =====================================================
    APPLY FOR ARTICLE POSTING ACCESS
===================================================== */
router.post("/apply", auth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const introduction = String(req.body?.introduction || "").trim();
    const workSample = String(req.body?.workSample || "").trim();
    const socialLink = String(req.body?.socialLink || "").trim();

    if (!introduction || !workSample || !socialLink) {
      return res.status(400).json({ error: "introduction, workSample, and socialLink are required" });
    }

    const application = await prisma.articleApplication.upsert({
      where: { userId },
      update: {
        introduction,
        workSample,
        socialLink,
        status: "PENDING",
        reviewedBy: null,
        reviewedAt: null,
      },
      create: {
        userId,
        introduction,
        workSample,
        socialLink,
      },
      include: {
        user: {
          select: { id: true, name: true, username: true, email: true },
        },
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { isAuthorized: false },
    });

    return res.status(201).json({ data: application });
  } catch (error) {
    console.error("ARTICLE APPLY ERROR:", error);
    return res.status(500).json({ error: "Failed to submit application" });
  }
});

/* =====================================================
    CREATE ARTICLE (With Multer & JSON Parsing)
===================================================== */
router.post("/", upload.array("media"), async (req, res) => {
  try {
    const { title, content, authorId, sources } = req.body;

    if (!title || !content || !authorId) {
      return res.status(400).json({ error: "Required fields missing" });
    }

    const parsedSources = sources ? JSON.parse(sources) : [];

    const author = await prisma.user.findUnique({ where: { id: authorId }, select: { id: true, isAuthorized: true } });
    if (!author) return res.status(404).json({ error: "Author not found" });
    if (!author.isAuthorized) {
      return res.status(403).json({ error: "Author is not authorized to post articles yet" });
    }

    const newArticle = await prisma.article.create({
      data: {
        title,
        content,
        authorId,
        media: {
          create: req.files?.map((f) => ({
            url: `/uploads/${f.filename}`,
            type: f.mimetype.startsWith("image") ? "image" : "video",
            size: f.size,
            uploaderId: authorId,
          })) || [],
        },
        sources: {
          create: parsedSources.map((s) => ({ name: s.name, link: s.link })),
        },
      },
      include: {
        media: true,
        sources: true,
        author: {
          select: { id: true, username: true, name: true, image: true },
        },
      },
    });

    res.status(201).json(newArticle);
  } catch (err) {
    console.error("CREATE ARTICLE ERROR:", err);
    res.status(500).json({ error: "Failed to create article" });
  }
});

/* =====================================================
    EDIT ARTICLE (PUT /api/articles/:id)
===================================================== */
router.put("/:id", upload.array("media"), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, sources, removeMediaIds } = req.body;

    let parsedSources = [];
    if (sources) parsedSources = JSON.parse(sources);

    const updatedArticle = await prisma.$transaction(async (tx) => {
      if (sources) {
        await tx.source.deleteMany({ where: { articleId: id } });
      }

      if (removeMediaIds) {
        const idsArray = JSON.parse(removeMediaIds);
        // Physical file cleanup for removed media could be added here if needed
        await tx.media.deleteMany({ where: { id: { in: idsArray } } });
      }

      return await tx.article.update({
        where: { id },
        data: {
          title,
          content,
          sources: sources ? {
            create: parsedSources.map((s) => ({ name: s.name, link: s.link })),
          } : undefined,
          media: req.files?.length > 0 ? {
            create: req.files.map((f) => ({
              url: `/uploads/${f.filename}`,
              type: f.mimetype.startsWith("image") ? "image" : "video",
              size: f.size,
              uploaderId: req.body.authorId, 
            })),
          } : undefined,
        },
        include: { media: true, sources: true },
      });
    });

    res.json(updatedArticle);
  } catch (err) {
    console.error("EDIT ARTICLE ERROR:", err);
    res.status(500).json({ error: "Failed to update article" });
  }
});

/* =====================================================
    LIKE TOGGLE
===================================================== */
router.post("/:id/like", async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "User ID required" });

    const existingLike = await prisma.like.findFirst({
      where: { articleId: id, userId },
    });

    let status = !existingLike;
    if (existingLike) {
      await prisma.like.delete({ where: { id: existingLike.id } });
    } else {
      await prisma.like.create({ data: { articleId: id, userId } });
    }

    const likesCount = await prisma.like.count({ where: { articleId: id } });
    res.json({ status, likesCount });
  } catch (err) {
    res.status(500).json({ error: "Like failed" });
  }
});

/* =====================================================
    SAVE TOGGLE
===================================================== */
router.post("/:id/save", async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "User ID required" });

    const existingSave = await prisma.save.findFirst({
      where: { articleId: id, userId },
    });

    let status = !existingSave;
    if (existingSave) {
      await prisma.save.delete({ where: { id: existingSave.id } });
    } else {
      await prisma.save.create({ data: { articleId: id, userId } });
    }

    const savesCount = await prisma.save.count({ where: { articleId: id } });
    res.json({ status, savesCount });
  } catch (err) {
    res.status(500).json({ error: "Save failed" });
  }
});

/* =====================================================
    GET SINGLE ARTICLE
===================================================== */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const article = await prisma.article.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, username: true, name: true, image: true, description: true } },
        media: true,
        sources: true,
        _count: { select: { likes: true, saves: true, views: true } },
      },
    });

    if (!article) return res.status(404).json({ error: "Not found" });
    res.json(article);
  } catch (err) {
    res.status(500).json({ error: "Retrieve failed" });
  }
});

/* =====================================================
    VIEW TRACKING (POST /api/articles/:id/view)
===================================================== */
router.post("/:id/view", async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.query;

        // Only track if it's a real user and they haven't viewed this in the last hour
        if (userId && userId !== "anonymous" && userId !== "undefined") {
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            const recentView = await prisma.postView.findFirst({
                where: { 
                    articleId: id, 
                    userId: userId,
                    viewedAt: { gte: oneHourAgo }
                }
            });

            if (!recentView) {
                await prisma.postView.create({ data: { articleId: id, userId } });
            }
        }

        const viewsCount = await prisma.postView.count({ where: { articleId: id } });
        res.json({ viewsCount });
    } catch (err) {
        console.error("VIEW TRACKING ERROR:", err);
        res.status(500).json({ error: "Tracking failed" });
    }
});

/* =====================================================
    STATUS CHECKS
===================================================== */
router.get("/:id/like-status", async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.json({ liked: false });
  const like = await prisma.like.findFirst({ where: { articleId: req.params.id, userId } });
  res.json({ liked: !!like });
});

router.get("/:id/save-status", async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.json({ saved: false });
  const save = await prisma.save.findFirst({ where: { articleId: req.params.id, userId } });
  res.json({ saved: !!save });
});

/* =====================================================
    GET ARTICLES BY USER
===================================================== */
router.get("/user/:userId", async (req, res) => {
  try {
    const articles = await prisma.article.findMany({
      where: { authorId: req.params.userId },
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { id: true, username: true, name: true, image: true } },
        media: { take: 1 },
        _count: { select: { likes: true, saves: true, views: true } },
      },
    });
    res.json(articles);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user articles" });
  }
});

/* =====================================================
    DELETE ARTICLE (With File Cleanup)
===================================================== */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Find article and its media first
    const article = await prisma.article.findUnique({ 
      where: { id },
      include: { media: true }
    });

    if (!article) return res.status(404).json({ error: "Article not found" });

    // 2. Physical File Cleanup
    if (article.media && article.media.length > 0) {
      article.media.forEach(m => {
        // Build the path to the file in the public folder
        const filePath = path.join(__dirname, "..", "public", m.url.replace(/^\//, ""));
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath); 
        }
      });
    }

    // 3. Database Cleanup (Transaction ensures all relations are wiped)
    await prisma.$transaction([
      prisma.source.deleteMany({ where: { articleId: id } }),
      prisma.media.deleteMany({ where: { articleId: id } }),
      prisma.like.deleteMany({ where: { articleId: id } }),
      prisma.save.deleteMany({ where: { articleId: id } }),
      prisma.postView.deleteMany({ where: { articleId: id } }),
      prisma.article.delete({ where: { id } }),
    ]);

    res.json({ message: "Article and associated files deleted successfully" });
  } catch (err) {
    console.error("DELETE ARTICLE ERROR:", err);
    res.status(500).json({ error: "Failed to delete article" });
  }
});

module.exports = router;