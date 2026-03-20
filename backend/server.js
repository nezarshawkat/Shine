require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const redis = require("redis");
const prisma = require("./prisma.js");
const { OAuth2Client } = require("google-auth-library");

const app = express();
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ================= 1. CORS CONFIGURATION =================
// Added your Vercel production URL to the allowed list
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://shine-red.vercel.app", 
  "https://shine-a77g.onrender.com"
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);
      
      const isAllowed = allowedOrigins.some((url) => origin.startsWith(url)) || 
                        origin.includes("app.github.dev");

      if (isAllowed) {
        callback(null, true);
      } else {
        console.error(`❌ CORS blocked for origin: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ================= 2. STRIPE WEBHOOK (CRITICAL ORDER) =================
// This must come BEFORE express.json() so the webhook can receive raw bodies
const paymentRoutes = require('./routes/payment');
app.use('/api', paymentRoutes);

// ================= 3. GLOBAL MIDDLEWARE =================
app.use(express.json());

// ================= 4. STATIC FILES =================
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/uploads", express.static(path.join(__dirname, "public", "uploads")));

// ================= 5. REDIS SETUP =================
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

// ================= 6. SOCKET.IO =================
let io = null;
if (process.env.ENABLE_SOCKET_IO === "true") {
  // Updated socket cors to use the same logic or allow all for simplicity in testing
  io = new Server(server, { 
    cors: { 
      origin: allowedOrigins, 
      methods: ["GET", "POST"],
      credentials: true
    } 
  });
  app.set("io", io);
  io.on("connection", (socket) => {
    socket.on("join", (userId) => socket.join(userId));
  });
}

// ================= 7. ROUTES =================
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
app.use("/api/reports", require("./routes/reports"));
app.use("/api/support", require("./routes/support"));

// Health Check
app.get("/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", environment: process.env.NODE_ENV });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Google Auth Route
app.post("/api/auth/google", async (req, res) => {
  try {
    const { token } = req.body;
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { email, name, sub: googleId } = payload;

    const user = await prisma.user.upsert({
      where: { email },
      update: { name, googleId },
      create: {
        email,
        name,
        googleId,
        provider: "google"
      }
    });

    res.json({ success: true, user });
  } catch (err) {
    console.error("Google Auth Error:", err);
    res.status(401).json({ success: false, message: "Invalid Google Token" });
  }
});

server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));