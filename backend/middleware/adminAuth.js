const jwt = require("jsonwebtoken");
const prisma = require("../prisma");

async function adminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Admin token required" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Malformed authorization header" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.scope !== "admin") {
      return res.status(403).json({ error: "Admin scope required" });
    }

    const admin = await prisma.admin.findUnique({
      where: { id: decoded.adminId },
      select: { id: true, email: true, role: true, permissions: true, isActive: true },
    });

    if (!admin || !admin.isActive) {
      return res.status(403).json({ error: "Admin account not active" });
    }

    req.admin = admin;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid admin token" });
  }
}

module.exports = adminAuth;
