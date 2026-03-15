require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const redis = require("redis");
const prisma = require("./prisma.js");

const app = express();
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// ================= STRIPE WEBHOOK =================
const paymentRoutes = require('./routes/payment');
app.use('/api', paymentRoutes);

// ================= GLOBAL MIDDLEWARE =================
app.use(express.json());

// FIXED CORS: Simplified for Codespaces environment
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);
      
      // Allow localhost or any github.dev preview URL
      if (
        origin.includes("localhost") || 
        origin.includes("app.github.dev") ||
        origin.includes("127.0.0.1")
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ================= STATIC FILES =================
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ================= REDIS SETUP =================
let redisClient = null;
if (process.env.ENABLE_REDIS_CACHE === "true") {
  (async () => {
    try {
      redisClient = redis.createClient({ url: process.env.REDIS_URL });
      await redisClient.connect();
      console.log("✅ Redis connected");
      app.set("redisClient", redisClient);
    } catch (err) {
      console.error("❌ Redis failed:", err);
    }
  })();
}

// ================= SOCKET.IO =================
let io = null;
if (process.env.ENABLE_SOCKET_IO === "true") {
  io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });
  app.set("io", io);
  io.on("connection", (socket) => {
    socket.on("join", (userId) => socket.join(userId));
  });
}

// ================= ROUTES =================
app.use("/api/users", require("./routes/auth.routes.js"));
app.use("/api/users", require("./routes/users.js"));
app.use("/api/follow", require("./routes/follow"));
app.use("/api/events", require("./routes/events"));
app.use("/api/upload", require("./routes/upload"));
app.use("/api/posts", require("./routes/posts"));
app.use("/api/communities", require("./routes/communities"));
app.use("/api/messenger", require("./routes/messenger.js"));
app.use("/api/articles", require("./routes/articles"));
app.use("/api", require("./routes/comments")); 
app.use("/api/admin", require("./routes/admin"));

app.get("/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));