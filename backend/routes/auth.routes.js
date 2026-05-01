const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const prisma = require("../prisma");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const DEFAULT_PROFILE_IMAGE = null;
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;

// Helper to include common user relations
const userIncludeOptions = {
  memberships: { include: { community: true } },
  followers: true,
  following: true
};

// =========================
// SIGNUP (EMAIL + PASSWORD)
// =========================
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, username } = req.body;

    if (!name || !email || !password || !username) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (!USERNAME_REGEX.test(username)) {
      return res.status(400).json({ error: "Username must be 3-30 characters and use only letters, numbers, or underscores." });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }]
      }
    });

    if (existingUser) {
      return res.status(400).json({ error: "Email or username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        username,
        password: hashedPassword,
        provider: "local",
        description: "",
        image: DEFAULT_PROFILE_IMAGE
      },
      include: userIncludeOptions
    });

    const token = jwt.sign(
      { userId: user.id }, 
      process.env.JWT_SECRET, 
      { expiresIn: "7d" }
    );

    const { password: _, ...userWithoutPassword } = user;

    res.status(201).json({
      user: userWithoutPassword,
      token
    });
  } catch (err) {
    console.error("Signup Error:", err);
    res.status(500).json({ error: "Signup failed" });
  }
});

// =========================
// LOGIN (EMAIL OR USERNAME)
// =========================
router.post("/login", async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body;

    if (!emailOrUsername || !password) {
      return res.status(400).json({ error: "Credentials are required" });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: emailOrUsername },
          { username: emailOrUsername }
        ]
      },
      include: userIncludeOptions
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    // Check if user registered via Google and has no password
    if (!user.password) {
      return res.status(400).json({
        error: "This account uses Google login. Please sign in with Google."
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { userId: user.id }, 
      process.env.JWT_SECRET, 
      { expiresIn: "7d" }
    );

    const { password: _, ...userWithoutPassword } = user;

    res.json({
      user: userWithoutPassword,
      token
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// =========================
// GOOGLE AUTH
// =========================
router.post("/google", async (req, res) => {
  try {
    const { token } = req.body;

    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { email, name, sub: googleId, picture: image } = payload;

    let user = await prisma.user.findUnique({
      where: { email },
      include: userIncludeOptions
    });

    if (!user) {
      const generatedUsername = "user_" + googleId.slice(0, 8);

      user = await prisma.user.create({
        data: {
          email,
          name,
          googleId,
          username: generatedUsername,
          image,
          provider: "google",
          description: ""
        },
        include: userIncludeOptions
      });
    }

    const jwtToken = jwt.sign(
      { userId: user.id }, 
      process.env.JWT_SECRET, 
      { expiresIn: "7d" }
    );

    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      user: userWithoutPassword,
      token: jwtToken
    });
  } catch (err) {
    console.error("Google Auth Error:", err);
    res.status(401).json({ success: false, error: "Google authentication failed" });
  }
});

module.exports = router;