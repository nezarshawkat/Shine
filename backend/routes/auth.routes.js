const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const express = require("express");
const router = express.Router();
const prisma = require("../prisma");

// SIGNUP
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, username } = req.body;
    if (!name || !email || !password || !username) return res.status(400).json({ error: "All fields are required" });

    const existingUser = await prisma.user.findFirst({ where: { OR: [{ email }, { username }] } });
    if (existingUser) return res.status(400).json({ error: "Email or username already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, username, password: hashedPassword, description: "", image: null },
      include: { 
        memberships: { include: { community: true } },
        followers: true,
        following: true
      },
    });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    const { password: _, ...userWithoutPassword } = user;
    res.status(201).json({ user: userWithoutPassword, token });
  } catch (err) {
    res.status(500).json({ error: "Signup failed" });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body;
    const user = await prisma.user.findFirst({
      where: { OR: [{ email: emailOrUsername }, { username: emailOrUsername }] },
      include: { 
        memberships: { include: { community: true } },
        followers: true,
        following: true
      },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword, token });
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});

module.exports = router;