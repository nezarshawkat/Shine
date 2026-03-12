import express from "express";
import CommunityBanner from "../models/CommunityBanner.js";

const router = express.Router();

// Get all banners
router.get("/", async (req, res) => {
  try {
    const banners = await CommunityBanner.find({});
    res.json(banners);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add banner
router.post("/", async (req, res) => {
  try {
    const banner = new CommunityBanner(req.body);
    await banner.save();
    res.json(banner);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;