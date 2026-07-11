const express = require("express");
const adminAuth = require("../../middleware/adminAuth");
const { adminLogin, seedAdmin } = require("../../controllers/admin/authController");
const { listUsers, updateUser, toggleUserBlock, deleteUser } = require("../../controllers/admin/usersController");
const { listContent, createContent, updateContent, deleteContent } = require("../../controllers/admin/contentController");
const { listReports, resolveReport } = require("../../controllers/admin/reportsController");
const { getAnalytics, getDashboardOverview } = require("../../controllers/admin/analyticsController");
const { listSupportMessages, replySupportMessage } = require("../../controllers/admin/supportController");
const { sendSystemMessage } = require("../../controllers/admin/messagingController");
const { listArticleApplications, reviewArticleApplication } = require("../../controllers/admin/articleApplicationsController");
const {
  getEmailSystemOverview,
  sendAdminEmail,
  triggerDigestNow,
  updateDigestSchedulerState,
  getAdminEmailPreview,
} = require("../../controllers/admin/emailSystemController");

const {
  getAutoActivityOverview,
  startAutoActivity,
  stopAutoActivity,
  triggerAutoPost,
  triggerAutoArticle,
  resetAutoActivityErrors,
} = require('../../controllers/admin/autoActivityController');
const {
  getEngagementOverview,
  resetEngagementErrors,
  startEngagement,
  stopEngagement,
  triggerEngagementRun,
} = require('../../controllers/admin/engagementController');

const router = express.Router();

/* ---------- helper to inject content type ---------- */
const wrapType = (type, handler) => (req, res, next) => {
  req.params.type = type;
  handler(req, res, next);
};

/* ---------- auth routes ---------- */
router.post("/login", adminLogin);
router.post("/seed", seedAdmin);

router.use(adminAuth);

/* ---------- dashboard ---------- */
router.get("/dashboard", getDashboardOverview);
router.get("/analytics", getAnalytics);

/* ---------- users ---------- */
router.get("/users", listUsers);
router.put("/users/:id", updateUser);
router.patch("/users/:id/block", toggleUserBlock);
router.delete("/users/:id", deleteUser);

/* ---------- content moderation ---------- */

// POSTS
router.get("/posts", wrapType("posts", listContent));
router.put("/posts/:id", wrapType("posts", updateContent));
router.delete("/posts/:id", wrapType("posts", deleteContent));

// EVENTS
router.get("/events", wrapType("events", listContent));
router.post("/events", wrapType("events", createContent));
router.put("/events/:id", wrapType("events", updateContent));
router.delete("/events/:id", wrapType("events", deleteContent));

// COMMUNITIES
router.get("/communities", wrapType("communities", listContent));
router.put("/communities/:id", wrapType("communities", updateContent));
router.delete("/communities/:id", wrapType("communities", deleteContent));

/* ---------- reports ---------- */
router.get("/reports", listReports);
router.patch("/reports/:id/resolve", resolveReport);

/* ---------- support ---------- */
router.get("/support", listSupportMessages);
router.patch("/support/:id", replySupportMessage);


/* ---------- article applications ---------- */
router.get("/article-applications", listArticleApplications);
router.patch("/article-applications/:id", reviewArticleApplication);

/* ---------- system messaging ---------- */
router.post("/messages/system", sendSystemMessage);
router.get("/email-system", getEmailSystemOverview);
router.post("/email-system/send", sendAdminEmail);
router.post("/email-system/trigger-digest", triggerDigestNow);
router.post("/email-system/scheduler", updateDigestSchedulerState);
router.post("/email-system/preview", getAdminEmailPreview);

router.get('/auto-activity', getAutoActivityOverview);
router.post('/auto-activity/start', startAutoActivity);
router.post('/auto-activity/stop', stopAutoActivity);
router.post('/auto-activity/trigger-post', triggerAutoPost);
router.post('/auto-activity/trigger-article', triggerAutoArticle);
router.post('/auto-activity/reset-errors', resetAutoActivityErrors);

router.get('/engagement', getEngagementOverview);
router.post('/engagement/start', startEngagement);
router.post('/engagement/stop', stopEngagement);
router.post('/engagement/run-once', triggerEngagementRun);
router.post('/engagement/reset-errors', resetEngagementErrors);

module.exports = router;
