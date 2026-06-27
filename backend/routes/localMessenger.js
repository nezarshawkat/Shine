const express = require("express");
const auth = require("../middleware/auth");
const local = require("../db/local");

const router = express.Router();

router.get("/inbox", auth, (_req, res) => res.json([]));
router.get("/conversations", auth, (_req, res) => res.json([]));
router.get("/system", auth, (req, res) => {
  const rows = local.getDb().prepare("SELECT * FROM Notification WHERE userId = ? AND type = 'SYSTEM' ORDER BY datetime(createdAt) DESC").all(req.user.id);
  res.json(rows.map((row) => ({ ...row, isRead: Boolean(row.isRead) })));
});
router.patch("/system/read-all", auth, (req, res) => {
  local.getDb().prepare("UPDATE Notification SET isRead = 1 WHERE userId = ? AND type = 'SYSTEM'").run(req.user.id);
  res.json({ success: true });
});
router.patch("/system/:id/read", auth, (req, res) => {
  local.getDb().prepare("UPDATE Notification SET isRead = 1 WHERE id = ? AND userId = ?").run(req.params.id, req.user.id);
  res.json({ success: true });
});

module.exports = router;
