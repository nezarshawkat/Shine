const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../../prisma");
const { requireAdminAuth, ADMIN_JWT_SECRET } = require("../../middleware/adminAuth");

const router = express.Router();

const safeParseJSON = (value, fallback) => {
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return fallback;
  }
};

const buildToken = (admin) =>
  jwt.sign(
    {
      adminId: admin.id,
      email: admin.email,
      role: admin.role,
      permissions: admin.permissions || [],
    },
    ADMIN_JWT_SECRET,
    { expiresIn: "12h" }
  );

const recordAudit = async (adminId, action, targetType, targetId, metadata = {}) => {
  await prisma.adminAuditLog.create({
    data: { adminId, action, targetType, targetId, metadata },
  });
};

router.post("/login", async (req, res) => {
  try {
    const { email, password, otp } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const admin = await prisma.admin.findUnique({ where: { email: email.toLowerCase() } });
    if (!admin) return res.status(401).json({ message: "Invalid admin credentials" });

    const passwordValid = await bcrypt.compare(password, admin.password);
    if (!passwordValid) return res.status(401).json({ message: "Invalid admin credentials" });

    if (admin.twoFactorEnabled && (!otp || otp !== admin.twoFactorSecret)) {
      return res.status(401).json({ message: "Invalid one-time passcode" });
    }

    const token = buildToken(admin);
    await prisma.admin.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });

    return res.json({
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions || [],
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to login as admin", error: error.message });
  }
});

router.get("/session", requireAdminAuth, async (req, res) => {
  return res.json({ admin: req.admin });
});

router.use(requireAdminAuth);

router.get("/dashboard", async (req, res) => {
  try {
    const [
      totalUsers,
      blockedUsers,
      totalPosts,
      totalEvents,
      totalCommunities,
      openReports,
      recentReports,
      trendingPosts,
      trendingCommunities,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isAuthorized: false } }),
      prisma.post.count(),
      prisma.event.count(),
      prisma.community.count(),
      prisma.report.count({ where: { status: "OPEN" } }),
      prisma.report.findMany({
        where: { status: "OPEN" },
        orderBy: { createdAt: "desc" },
        take: 6,
        include: { reporter: { select: { id: true, username: true, email: true } } },
      }),
      prisma.analyticsCache.findMany({ where: { metricGroup: "trending_posts" }, orderBy: { metricValue: "desc" }, take: 5 }),
      prisma.analyticsCache.findMany({ where: { metricGroup: "trending_communities" }, orderBy: { metricValue: "desc" }, take: 5 }),
    ]);

    return res.json({
      summary: {
        totalUsers,
        blockedUsers,
        activeUsers: Math.max(totalUsers - blockedUsers, 0),
        totalPosts,
        totalEvents,
        totalCommunities,
        openReports,
      },
      recentReports,
      trendingPosts,
      trendingCommunities,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load dashboard data", error: error.message });
  }
});

router.get("/users", async (req, res) => {
  try {
    const { query = "", sortBy = "createdAt", direction = "desc", page = "1", limit = "20" } = req.query;
    const pageNumber = Math.max(parseInt(page, 10), 1);
    const pageLimit = Math.min(Math.max(parseInt(limit, 10), 1), 100);

    const where = query
      ? {
          OR: [
            { name: { contains: String(query), mode: "insensitive" } },
            { username: { contains: String(query), mode: "insensitive" } },
            { email: { contains: String(query), mode: "insensitive" } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { [sortBy]: direction === "asc" ? "asc" : "desc" },
        skip: (pageNumber - 1) * pageLimit,
        take: pageLimit,
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          roleLevel: true,
          isAuthorized: true,
          createdAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return res.json({ users, total, page: pageNumber, limit: pageLimit });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load users", error: error.message });
  }
});

router.patch("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, roleLevel, isAuthorized } = req.body;

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(roleLevel !== undefined ? { roleLevel } : {}),
        ...(isAuthorized !== undefined ? { isAuthorized: Boolean(isAuthorized) } : {}),
      },
    });

    await recordAudit(req.admin.id, "USER_UPDATED", "USER", id, req.body);
    return res.json({ user: updated });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update user", error: error.message });
  }
});

router.patch("/users/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { blocked } = req.body;
    const user = await prisma.user.update({ where: { id }, data: { isAuthorized: !blocked } });
    await recordAudit(req.admin.id, blocked ? "USER_BLOCKED" : "USER_UNBLOCKED", "USER", id, { blocked });
    return res.json({ user });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update user status", error: error.message });
  }
});

router.delete("/users/:id", async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    await recordAudit(req.admin.id, "USER_DELETED", "USER", req.params.id);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete user", error: error.message });
  }
});

const updateFeatureFlag = async (model, id, isFeatured) => {
  switch (model) {
    case "posts":
      return prisma.post.update({ where: { id }, data: { isFeatured } });
    case "events":
      return prisma.event.update({ where: { id }, data: { isFeatured } });
    case "communities":
      return prisma.community.update({ where: { id }, data: { isFeatured } });
    default:
      throw new Error("Unsupported model");
  }
};

const getModelClient = (model) => {
  if (model === "posts") return prisma.post;
  if (model === "events") return prisma.event;
  if (model === "communities") return prisma.community;
  return null;
};

["posts", "events", "communities"].forEach((resource) => {
  router.get(`/${resource}`, async (req, res) => {
    try {
      const client = getModelClient(resource);
      const items = await client.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
      return res.json({ items });
    } catch (error) {
      return res.status(500).json({ message: `Failed to fetch ${resource}`, error: error.message });
    }
  });

  router.patch(`/${resource}/:id`, async (req, res) => {
    try {
      const client = getModelClient(resource);
      const payload = { ...req.body };
      if (resource === "communities" && payload.status && !["PUBLIC", "PRIVATE"].includes(payload.status)) {
        return res.status(400).json({ message: "Invalid community status" });
      }
      const updated = await client.update({ where: { id: req.params.id }, data: payload });
      await recordAudit(req.admin.id, `${resource.toUpperCase()}_UPDATED`, resource.toUpperCase(), req.params.id, payload);
      return res.json({ item: updated });
    } catch (error) {
      return res.status(500).json({ message: `Failed to update ${resource}`, error: error.message });
    }
  });

  router.patch(`/${resource}/:id/feature`, async (req, res) => {
    try {
      const item = await updateFeatureFlag(resource, req.params.id, Boolean(req.body.isFeatured));
      await recordAudit(req.admin.id, `${resource.toUpperCase()}_FEATURED`, resource.toUpperCase(), req.params.id, req.body);
      return res.json({ item });
    } catch (error) {
      return res.status(500).json({ message: `Failed to feature ${resource}`, error: error.message });
    }
  });

  router.delete(`/${resource}/:id`, async (req, res) => {
    try {
      const client = getModelClient(resource);
      await client.delete({ where: { id: req.params.id } });
      await recordAudit(req.admin.id, `${resource.toUpperCase()}_DELETED`, resource.toUpperCase(), req.params.id);
      return res.json({ success: true });
    } catch (error) {
      return res.status(500).json({ message: `Failed to delete ${resource}`, error: error.message });
    }
  });
});

router.get("/reports", async (req, res) => {
  try {
    const { type } = req.query;
    const reports = await prisma.report.findMany({
      where: type ? { type: String(type).toUpperCase() } : {},
      orderBy: { createdAt: "desc" },
      include: {
        reporter: { select: { id: true, username: true, email: true } },
      },
    });

    return res.json({ reports });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load reports", error: error.message });
  }
});

router.patch("/reports/:id/resolve", async (req, res) => {
  try {
    const report = await prisma.report.update({
      where: { id: req.params.id },
      data: {
        status: "RESOLVED",
        actionTaken: req.body.actionTaken || "resolved",
        resolvedAt: new Date(),
        resolvedByAdminId: req.admin.id,
      },
    });

    await recordAudit(req.admin.id, "REPORT_RESOLVED", "REPORT", req.params.id, req.body);
    return res.json({ report });
  } catch (error) {
    return res.status(500).json({ message: "Failed to resolve report", error: error.message });
  }
});

router.post("/reports/:id/action", async (req, res) => {
  try {
    const { action, targetUserId, targetContentType, targetContentId } = req.body;

    if (action === "block_user" && targetUserId) {
      await prisma.user.update({ where: { id: targetUserId }, data: { isAuthorized: false } });
    }

    if (action === "delete_content" && targetContentType && targetContentId) {
      const client = getModelClient(`${targetContentType}s`);
      if (client) await client.delete({ where: { id: targetContentId } });
    }

    const report = await prisma.report.update({
      where: { id: req.params.id },
      data: {
        status: "ACTIONED",
        actionTaken: action,
        resolvedAt: new Date(),
        resolvedByAdminId: req.admin.id,
      },
    });

    await recordAudit(req.admin.id, "REPORT_ACTIONED", "REPORT", req.params.id, req.body);
    return res.json({ report });
  } catch (error) {
    return res.status(500).json({ message: "Failed to process report action", error: error.message });
  }
});

router.get("/analytics", async (req, res) => {
  try {
    const [trending, growth, summaries] = await Promise.all([
      prisma.analyticsCache.findMany({ orderBy: [{ metricGroup: "asc" }, { metricValue: "desc" }] }),
      prisma.analyticsCache.findMany({ where: { metricGroup: "engagement_growth" }, orderBy: { timestamp: "asc" } }),
      prisma.analyticsCache.findMany({ where: { metricGroup: "summary_cards" }, orderBy: { metricKey: "asc" } }),
    ]);

    const grouped = trending.reduce((acc, row) => {
      if (!acc[row.metricGroup]) acc[row.metricGroup] = [];
      acc[row.metricGroup].push({
        key: row.metricKey,
        label: row.metricLabel,
        value: row.metricValue,
        trend: safeParseJSON(row.trendData, []),
        metadata: safeParseJSON(row.metadata, {}),
        timestamp: row.timestamp,
      });
      return acc;
    }, {});

    return res.json({ grouped, growth, summaries });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load analytics", error: error.message });
  }
});

module.exports = router;
