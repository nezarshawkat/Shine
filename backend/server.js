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

// ================= ✅ CORS FIRST =================
const allowedOrigins = [
  "http://localhost:5173",
  "https://shine-red.vercel.app"
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// ================= ✅ BODY PARSER =================
app.use(express.json());

// ================= ✅ ROUTES =================

// 🔥 payment AFTER CORS + JSON
const paymentRoutes = require('./routes/payment');
app.use('/api', paymentRoutes);

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

// ================= HEALTH =================
app.get("/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ================= GOOGLE AUTH =================
app.post("/api/auth/google", async (req, res) => {
  try {
    const { token } = req.body;

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();

    const user = await prisma.user.upsert({
      where: { email: payload.email },
      update: {},
      create: {
        email: payload.email,
        name: payload.name,
        googleId: payload.sub,
        provider: "google"
      }
    });

    res.json({ success: true, user });
  } catch (err) {
    console.error(err);
    res.status(401).json({ success: false });
  }
});

// ================= START =================
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});