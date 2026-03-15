const jwt = require("jsonwebtoken");
const prisma = require("../prisma");

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || "change-me";

const parseBearerToken = (header = "") => {
  if (!header || !header.startsWith("Bearer ")) return null;
  return header.slice(7);
};

async function requireAdminAuth(req, res, next) {
  try {
    const token = parseBearerToken(req.headers.authorization);
    if (!token) {
      return res.status(401).json({ message: "Missing admin token" });
    }

    const payload = jwt.verify(token, ADMIN_JWT_SECRET);
    const admin = await prisma.admin.findUnique({ where: { id: payload.adminId } });

    if (!admin || admin.status !== "ACTIVE") {
      return res.status(403).json({ message: "Admin access denied" });
    }

    req.admin = {
      id: admin.id,
      email: admin.email,
      role: admin.role,
      permissions: admin.permissions || [],
    };

    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired admin token" });
  }
}

module.exports = {
  ADMIN_JWT_SECRET,
  requireAdminAuth,
};
