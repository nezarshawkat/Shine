// backend/routes/community.js
import express from "express";
import Community from "/workspaces/Shine/backend/models/commConfig.js";

const router = express.Router();

// GET all banners (communities)
router.get("/", async (req, res) => {
  try {
    const banners = await Community.find().sort({ createdAt: -1 });
    res.json(banners);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET by id
router.get("/:id", async (req, res) => {
  try {
    const banner = await Community.findById(req.params.id);
    if (!banner) return res.status(404).json({ message: "Not found" });
    res.json(banner);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create new banner
router.post("/", async (req, res) => {
  try {
    const newBanner = new Community(req.body);
    await newBanner.save();
    res.status(201).json(newBanner);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE (optional)
router.delete("/:id", async (req, res) => {
  try {
    const removed = await Community.findByIdAndDelete(req.params.id);
    if (!removed) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;