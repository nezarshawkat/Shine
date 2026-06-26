const express = require("express");
const jwt = require("jsonwebtoken");
const dataService = require("../services/dataService");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "shine-super-secret-key";

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(authHeader.split(" ")[1], JWT_SECRET);
    req.user = { id: decoded.userId || decoded.id };
    next();
  } catch (err) {
    console.error("JWT Verification Error:", err.message);
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};

function getOptionalUserId(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

  try {
    const decoded = jwt.verify(authHeader.split(" ")[1], JWT_SECRET);
    return decoded.userId || decoded.id;
  } catch {
    return null;
  }
}

router.get("/posts/:postId/comments", async (req, res) => {
  try {
    res.json(await dataService.getComments(req.params.postId, getOptionalUserId(req)));
  } catch (err) {
    console.error("GET COMMENTS ERROR:", err);
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

router.post("/posts/:postId/comments", authMiddleware, async (req, res) => {
  const { text, parentId } = req.body;
  if (!text) return res.status(400).json({ error: "Comment text is required" });

  try {
    res.status(201).json(await dataService.createComment(req.params.postId, req.user.id, text, parentId));
  } catch (err) {
    console.error("POST COMMENT ERROR:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
});

router.put("/comments/:id", authMiddleware, async (req, res) => {
  try {
    const updated = await dataService.updateComment(req.params.id, req.user.id, req.body.text);
    if (!updated) return res.status(403).json({ error: "Unauthorized" });
    res.json(updated);
  } catch (err) {
    console.error("UPDATE COMMENT ERROR:", err);
    res.status(500).json({ error: "Update failed" });
  }
});

router.delete("/comments/:id", authMiddleware, async (req, res) => {
  try {
    const deleted = await dataService.deleteComment(req.params.id, req.user.id);
    if (!deleted) return res.status(403).json({ error: "Unauthorized" });
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error("DELETE COMMENT ERROR:", err);
    res.status(500).json({ error: "Delete failed" });
  }
});

router.post("/comments/:id/like", authMiddleware, async (req, res) => {
  try {
    res.json(await dataService.toggleCommentLike(req.params.id, req.user.id));
  } catch (err) {
    console.error("LIKE TOGGLE ERROR:", err);
    res.status(500).json({ error: "Like operation failed" });
  }
});

module.exports = router;
