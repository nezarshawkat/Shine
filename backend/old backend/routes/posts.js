// backend/routes/posts.js
import fs from "fs";
import path from "path";
import express from "express";

const router = express.Router();
const postsFile = path.join(__dirname, "../posts.js"); // path to posts.js

// Load posts
let posts = [];
try {
  posts = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../posts.json"), "utf-8")
  );
} catch (err) {
  posts = [];
}

// GET all posts
router.get("/", (req, res) => {
  res.json(posts);
});

// CREATE a new post
router.post("/create", (req, res) => {
  const post = req.body;
  post._id = Date.now().toString();
  post.createdAt = new Date().toISOString();

  posts.push(post);

  // Save to posts.json
  fs.writeFileSync(
    path.join(__dirname, "../posts.json"),
    JSON.stringify(posts, null, 2),
    "utf-8"
  );

  res.status(201).json({ message: "Post saved", post });
});

export default router;
