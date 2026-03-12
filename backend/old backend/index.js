// backend/index.js
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import postRoutes from "./routes/posts.js";
import communityRoutes from "./routes/community.js";

dotenv.config();

const app = express();

// CORS: allow frontend origin(s) during development.
// For maximum simplicity in dev, allow all origins; restrict to your domain in production.
app.use(cors({ origin: "*" }));
app.use(express.json());

// Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("❌ MONGO_URI not set in .env");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected:", mongoose.connection.name))
  .catch((err) => {
    console.error("❌ MongoDB Connection Error:", err.message || err);
    process.exit(1);
  });

// Routes
app.use("/api/posts", postRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/community-banners", communityRoutes); 

// Simple root route to avoid "Cannot GET /"
app.get("/", (req, res) => res.send("🚀 Backend running"));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
