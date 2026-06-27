const express = require("express");
const { memoryUpload, uploadFilesToSupabase } = require("../lib/supabaseStorage");
const content = require("../services/localContentService");
const { validateSources } = require("../services/sourceModerationService");

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

router.post("/apply", (_req, res) => res.status(501).json({ error: "Article applications are managed by the local administrator." }));

router.get("/user/:userId", (req, res) => {
  try { res.json(content.listArticles({ authorId: req.params.userId, limit: 100 }).articles); }
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
