const express = require("express");
const { memoryUpload, uploadFilesToSupabase } = require("../lib/supabaseStorage");
const content = require("../services/localContentService");
const { validateSources } = require("../services/sourceModerationService");
const auth = require("../middleware/auth");
const local = require("../db/local");

const router = express.Router();

function parseJson(value, fallback = []) {
  if (value === undefined || value === null || value === "") return fallback;
  if (Array.isArray(value)) return value;
  try { return JSON.parse(value); } catch { return fallback; }
}

router.get("/", (req, res) => {
  try {
    res.json(content.listArticles(req.query));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", memoryUpload.array("media"), async (req, res) => {
  try {
    const { title, content: articleContent, authorId } = req.body;
    if (!title || !articleContent || !authorId) return res.status(400).json({ error: "Required fields missing" });
    const sources = parseJson(req.body.sources);
    const validation = validateSources({ type: "article", text: `${title} ${articleContent}`, sources });
    if (!validation.valid) return res.status(422).json({ error: "Article sources did not pass verification", reasons: validation.reasons });
    const uploadedMedia = await uploadFilesToSupabase(req.files || [], "article");
    const article = content.createArticle({
      title,
      content: articleContent,
      authorId,
      sources,
      uploadedMedia,
      files: req.files || [],
    });
    res.status(201).json(article);
  } catch (error) {
    const status = /not authorized/i.test(error.message) ? 403 : /not found/i.test(error.message) ? 404 : 500;
    res.status(status).json({ error: error.message });
  }
});

router.post("/apply", auth, (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const introduction = String(req.body?.introduction || "").trim();
    const workSample = String(req.body?.workSample || "").trim();
    const socialLink = String(req.body?.socialLink || "").trim();
    if (!introduction || !workSample || !socialLink) {
      return res.status(400).json({ error: "introduction, workSample, and socialLink are required" });
    }

    const db = local.getDb();
    const now = local.nowIso();
    const existing = db.prepare("SELECT id, createdAt FROM ArticleApplication WHERE userId = ?").get(userId);
    const application = {
      id: existing?.id || local.newId(),
      userId,
      introduction,
      workSample,
      socialLink,
      status: "PENDING",
      reviewedBy: null,
      reviewedAt: null,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      data: JSON.stringify({ introduction, workSample, socialLink }),
    };
    db.transaction(() => {
      db.prepare(`
        INSERT INTO ArticleApplication (
          id, userId, introduction, workSample, socialLink, status,
          reviewedBy, reviewedAt, createdAt, updatedAt, data
        ) VALUES (
          @id, @userId, @introduction, @workSample, @socialLink, @status,
          @reviewedBy, @reviewedAt, @createdAt, @updatedAt, @data
        )
        ON CONFLICT(userId) DO UPDATE SET
          introduction = excluded.introduction,
          workSample = excluded.workSample,
          socialLink = excluded.socialLink,
          status = 'PENDING',
          reviewedBy = NULL,
          reviewedAt = NULL,
          updatedAt = excluded.updatedAt,
          data = excluded.data
      `).run(application);
      db.prepare("UPDATE User SET isAuthorized = 0, updatedAt = ? WHERE id = ?").run(now, userId);
    })();

    res.status(201).json({ data: application });
  } catch (error) {
    console.error("LOCAL ARTICLE APPLY ERROR:", error);
    res.status(500).json({ error: "Failed to submit application" });
  }
});

router.get("/user/:identifier", (req, res) => {
  try {
    const db = local.getDb();
    const { identifier } = req.params;
    const author = db.prepare(`
      SELECT id
      FROM User
      WHERE id = ? OR lower(username) = lower(?)
      LIMIT 1
    `).get(identifier, identifier);
    if (!author) return res.json([]);
    res.json(content.listArticles({ authorId: author.id, limit: 100 }).articles);
  }
  catch (error) { res.status(500).json({ error: error.message }); }
});

router.put("/:id", memoryUpload.array("media"), async (req, res) => {
  try {
    const uploadedMedia = await uploadFilesToSupabase(req.files || [], "article");
    const article = content.updateArticle(req.params.id, {
      title: req.body.title,
      content: req.body.content,
      sources: req.body.sources === undefined ? undefined : parseJson(req.body.sources),
      removeMediaIds: parseJson(req.body.removeMediaIds),
      uploadedMedia,
      files: req.files || [],
    });
    if (!article) return res.status(404).json({ error: "Article not found" });
    res.json(article);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post("/:id/like", (req, res) => {
  if (!req.body.userId) return res.status(400).json({ error: "User ID required" });
  try { res.json(content.toggleArticleLike(req.params.id, req.body.userId)); }
  catch (error) { res.status(500).json({ error: error.message }); }
});

router.post("/:id/save", (req, res) => {
  if (!req.body.userId) return res.status(400).json({ error: "User ID required" });
  try { res.json(content.toggleArticleSave(req.params.id, req.body.userId)); }
  catch (error) { res.status(500).json({ error: error.message }); }
});

router.post("/:id/view", (req, res) => {
  try { res.json(content.recordArticleView(req.params.id, req.query.userId)); }
  catch (error) { res.status(500).json({ error: error.message }); }
});

router.get("/:id/like-status", (req, res) => res.json({ liked: content.articleStatus("LikeRecord", req.params.id, req.query.userId) }));
router.get("/:id/save-status", (req, res) => res.json({ saved: content.articleStatus("SaveRecord", req.params.id, req.query.userId) }));

router.get("/:id", (req, res) => {
  try {
    const article = content.getArticle(req.params.id);
    if (!article) return res.status(404).json({ error: "Not found" });
    res.json(article);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.delete("/:id", (req, res) => {
  try {
    if (!content.deleteArticle(req.params.id)) return res.status(404).json({ error: "Article not found" });
    res.json({ message: "Article deleted" });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

module.exports = router;
