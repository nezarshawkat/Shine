const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../../prisma");

async function adminLogin(req, res) {
  try {
    const { email, password, otp } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const admin = await prisma.admin.findUnique({ where: { email } });
    if (!admin || !admin.isActive) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const passwordMatch = await bcrypt.compare(password, admin.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (process.env.ADMIN_OTP_SECRET && !otp) {
      return res.status(401).json({ error: "OTP required" });
    }

    const token = jwt.sign(
      { adminId: admin.id, scope: "admin", role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: "12h" }
    );

    return res.json({
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: "Admin login failed" });
  }
}

async function seedAdmin(req, res) {
  try {
    const { email, password, role = "SUPER_ADMIN" } = req.body;
    const setupKey = req.headers["x-admin-setup-key"];

    if (!process.env.ADMIN_SETUP_KEY || setupKey !== process.env.ADMIN_SETUP_KEY) {
      return res.status(403).json({ error: "Unauthorized setup" });
    }

    const existing = await prisma.admin.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: "Admin email already exists" });
    }

    const hashed = await bcrypt.hash(password, 12);
    const admin = await prisma.admin.create({
      data: {
        email,
        password: hashed,
        role,
        permissions: { canManageUsers: true, canManageContent: true, canViewAnalytics: true },
      },
      select: { id: true, email: true, role: true, createdAt: true },
    });

    return res.status(201).json({ admin });
  } catch (error) {
    return res.status(500).json({ error: "Failed to create admin" });
  }
}

module.exports = {
  adminLogin,
  seedAdmin,
};
