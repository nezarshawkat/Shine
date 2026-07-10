const express = require("express");
const jwt = require("jsonwebtoken");
const local = require("../db/local");
const content = require("../services/localContentService");
const users = require("../services/localUserService");
const localDeletion = require("../services/localDeletionService");
const { verifyLocalAdmin } = require("../services/defaultAdminService");
const {
  startAutoActivitySystem,
  stopAutoActivitySystem,
  getAutoActivityStatus,
  createOnePost,
  createOneArticle,
  clearAutoActivityErrors,
} = require("../autoActivitySystem");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "shine-super-secret-key";

router.post("/login", async (req, res) => {
  const admin = await verifyLocalAdmin(req.body.email, req.body.password);
  if (!admin) return res.status(401).json({ error: "Invalid credentials" });
  const token = jwt.sign({ adminId: admin.id, scope: "admin", role: admin.role }, JWT_SECRET, { expiresIn: "12h" });
  res.json({ token, admin });
});

router.use((req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Admin token required" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.scope !== "admin") return res.status(403).json({ error: "Admin scope required" });
    req.admin = decoded;
    next();
  } catch { return res.status(401).json({ error: "Invalid admin token" }); }
});

router.get("/dashboard", (_req, res) => {
  const database = local.getDb();
  res.json({
    data: {
      users: database.prepare("SELECT COUNT(*) AS count FROM User").get().count,
      posts: database.prepare("SELECT COUNT(*) AS count FROM Post WHERE deletedAt IS NULL").get().count,
      articles: database.prepare("SELECT COUNT(*) AS count FROM Article WHERE deletedAt IS NULL").get().count,
      events: database.prepare("SELECT COUNT(*) AS count FROM Event WHERE status = 'ACTIVE'").get().count,
    },
  });
});

router.get("/users", (req, res) => {
  const query = String(req.query.q || "").trim().toLowerCase();
  const data = users.listUsers(Number(req.query.pageSize || 100)).filter((user) => (
    !query || [user.name, user.username, user.email].some((value) => String(value || "").toLowerCase().includes(query))
  ));
  res.json({ data, pagination: { page: 1, pageSize: data.length, total: data.length } });
});

router.put("/users/:id", (req, res) => {
  const allowedRoles = new Set(["Starter", "Intermediate", "Proffesional"]);
  const updateData = {};
  if (req.body.name) updateData.name = req.body.name;
  if (req.body.roleLevel) {
    if (!allowedRoles.has(req.body.roleLevel)) return res.status(400).json({ error: "Invalid user stage" });
    updateData.roleLevel = req.body.roleLevel;
  }
  const updated = users.updateUser(req.params.id, updateData);
  if (!updated) return res.status(404).json({ error: "User not found" });
  res.json({ data: updated });
});

router.patch("/users/:id/block", (req, res) => {
  const user = users.findById(req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  const updated = users.updateUser(req.params.id, { isAuthorized: !user.isAuthorized });
  res.json({ data: updated });
});

router.delete("/users/:id", (req, res) => {
  if (!users.deleteUser(req.params.id)) return res.status(404).json({ error: "User not found" });
  res.status(204).send();
});

router.get("/posts", (req, res) => {
  const database = local.getDb();
  const data = database.prepare(`
    SELECT p.*, u.username AS authorUsername FROM Post p LEFT JOIN User u ON u.id = p.authorId
    WHERE p.deletedAt IS NULL ORDER BY datetime(p.createdAt) DESC LIMIT ?
  `).all(Number(req.query.pageSize || 100)).map((row) => ({ ...row, author: { id: row.authorId, username: row.authorUsername } }));
  res.json({ data, pagination: { page: 1, pageSize: data.length, total: data.length } });
});

router.delete("/posts/:id", (req, res) => {
  if (!localDeletion.deletePost(local.getDb(), req.params.id)) {
    return res.status(404).json({ error: "Post not found" });
  }
  return res.json({ success: true });
});

router.get("/events", (_req, res) => res.json({ data: content.listEvents() }));
router.post("/events", (req, res) => {
  const { title, description, image, actionType = "MESSAGE", detailsMessage, externalLink } = req.body;
  if (!title || !description || !image) return res.status(400).json({ error: "title, description and image are required" });
  if (actionType === "MESSAGE" && !detailsMessage) return res.status(400).json({ error: "Details message is required" });
  if (actionType === "LINK" && !/^https?:\/\//i.test(externalLink || "")) return res.status(400).json({ error: "A valid external link is required" });
  res.status(201).json({ data: content.createEvent(req.body) });
});
router.put("/events/:id", (req, res) => {
  const event = content.updateEvent(req.params.id, req.body);
  if (!event) return res.status(404).json({ error: "Event not found" });
  res.json({ data: event });
});
router.delete("/events/:id", (req, res) => {
  if (!content.deleteEvent(req.params.id)) return res.status(404).json({ error: "Event not found" });
  res.json({ success: true });
});

router.get("/auto-activity", (_req, res) => res.json({ success: true, data: getAutoActivityStatus() }));
router.post("/auto-activity/start", async (_req, res) => { await startAutoActivitySystem({ clearAdminStop: true }); res.json({ success: true, data: getAutoActivityStatus() }); });
router.post("/auto-activity/stop", async (_req, res) => { await stopAutoActivitySystem({ persist: true }); res.json({ success: true, data: getAutoActivityStatus() }); });
router.post("/auto-activity/reset-errors", (_req, res) => { clearAutoActivityErrors(); res.json({ success: true, data: getAutoActivityStatus() }); });
router.post("/auto-activity/trigger-post", async (_req, res) => {
  try { const post = await createOnePost(); res.json({ success: true, data: { id: post.id, createdAt: post.createdAt } }); }
  catch (error) { res.status(500).json({ success: false, error: error.message }); }
});
router.post("/auto-activity/trigger-article", async (_req, res) => {
  try { const article = await createOneArticle(); res.json({ success: true, data: { id: article.id, createdAt: article.createdAt } }); }
  catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

module.exports = router;
