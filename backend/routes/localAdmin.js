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
const {
  clearOrganicEngagementErrors,
  getOrganicEngagementStatus,
  runOrganicEngagementOnce,
  startOrganicEngagementService,
  stopOrganicEngagementService,
} = require("../services/organicEngagementService");

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
router.post("/auto-activity/start", async (_req, res) => {
  try {
    const started = await startAutoActivitySystem({ clearAdminStop: true });
    res.json({ success: true, started, data: getAutoActivityStatus() });
  } catch (error) {
    res.status(500).json({ success: false, error: `Failed to start auto activity: ${error.message}` });
  }
});
router.post("/auto-activity/stop", async (_req, res) => {
  try {
    await stopAutoActivitySystem({ persist: true });
    res.json({ success: true, data: getAutoActivityStatus() });
  } catch (error) {
    res.status(500).json({ success: false, error: `Failed to stop auto activity: ${error.message}` });
  }
});
router.post("/auto-activity/reset-errors", (_req, res) => { clearAutoActivityErrors(); res.json({ success: true, data: getAutoActivityStatus() }); });
router.post("/auto-activity/trigger-post", async (_req, res) => {
  try { const post = await createOnePost(); res.json({ success: true, data: { id: post.id, createdAt: post.createdAt } }); }
  catch (error) { res.status(500).json({ success: false, error: error.message }); }
});
router.post("/auto-activity/trigger-article", async (_req, res) => {
  try { const article = await createOneArticle(); res.json({ success: true, data: { id: article.id, createdAt: article.createdAt } }); }
  catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

router.get("/engagement", (_req, res) => res.json({ success: true, data: getOrganicEngagementStatus() }));
router.post("/engagement/start", async (_req, res) => {
  try {
    const started = await startOrganicEngagementService({ clearAdminStop: true });
    res.json({ success: true, started, data: getOrganicEngagementStatus() });
  } catch (error) {
    res.status(500).json({ success: false, error: `Failed to start engagement: ${error.message}` });
  }
});
router.post("/engagement/stop", async (_req, res) => {
  try {
    await stopOrganicEngagementService({ persist: true });
    res.json({ success: true, data: getOrganicEngagementStatus() });
  } catch (error) {
    res.status(500).json({ success: false, error: `Failed to stop engagement: ${error.message}` });
  }
});
router.post("/engagement/reset-errors", (_req, res) => { clearOrganicEngagementErrors(); res.json({ success: true, data: getOrganicEngagementStatus() }); });
router.post("/engagement/run-once", async (_req, res) => {
  try {
    const result = await runOrganicEngagementOnce();
    res.json({ success: true, data: { status: getOrganicEngagementStatus(), result } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/article-applications", (req, res) => {
  const status = String(req.query.status || "PENDING").toUpperCase();
  const database = local.getDb();
  const rows = database.prepare(`
    SELECT app.*, u.name AS userName, u.username AS username, u.email AS email, u.isAuthorized AS isAuthorized
    FROM ArticleApplication app
    LEFT JOIN User u ON u.id = app.userId
    WHERE app.status = ?
    ORDER BY datetime(app.createdAt) DESC
  `).all(status);
  const data = rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    introduction: row.introduction,
    workSample: row.workSample,
    socialLink: row.socialLink,
    status: row.status,
    reviewedBy: row.reviewedBy,
    reviewedAt: row.reviewedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    user: {
      id: row.userId,
      name: row.userName,
      username: row.username,
      email: row.email,
      isAuthorized: Boolean(row.isAuthorized),
    },
  }));
  res.json({ data, pagination: { page: 1, pageSize: data.length, total: data.length } });
});

router.patch("/article-applications/:id", (req, res) => {
  const action = String(req.body?.action || "").toLowerCase();
  if (!["accept", "decline"].includes(action)) {
    return res.status(400).json({ error: "action must be either accept or decline" });
  }
  const database = local.getDb();
  const application = database.prepare("SELECT * FROM ArticleApplication WHERE id = ?").get(req.params.id);
  if (!application) return res.status(404).json({ error: "Application not found" });
  const status = action === "accept" ? "ACCEPTED" : "DECLINED";
  const now = local.nowIso();
  database.transaction(() => {
    database.prepare(`
      UPDATE ArticleApplication
      SET status = ?, reviewedBy = ?, reviewedAt = ?, updatedAt = ?
      WHERE id = ?
    `).run(status, req.admin.adminId || req.admin.id || null, now, now, req.params.id);
    database.prepare("UPDATE User SET isAuthorized = ?, updatedAt = ? WHERE id = ?")
      .run(action === "accept" ? 1 : 0, now, application.userId);
  })();
  const updated = database.prepare(`
    SELECT app.*, u.name AS userName, u.username AS username, u.email AS email, u.isAuthorized AS isAuthorized
    FROM ArticleApplication app
    LEFT JOIN User u ON u.id = app.userId
    WHERE app.id = ?
  `).get(req.params.id);
  return res.json({
    data: {
      ...updated,
      user: {
        id: updated.userId,
        name: updated.userName,
        username: updated.username,
        email: updated.email,
        isAuthorized: Boolean(updated.isAuthorized),
      },
    },
  });
});

module.exports = router;
