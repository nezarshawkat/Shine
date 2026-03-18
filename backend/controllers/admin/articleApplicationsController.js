const prisma = require("../../prisma");
const { parsePagination, writeAuditLog } = require("./common");

async function listArticleApplications(req, res) {
  try {
    const { status = "PENDING" } = req.query;
    const { page, pageSize } = parsePagination(req);

    const where = status ? { status: String(status).toUpperCase() } : {};

    const [applications, total] = await Promise.all([
      prisma.articleApplication.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { id: true, name: true, username: true, email: true, isAuthorized: true },
          },
        },
      }),
      prisma.articleApplication.count({ where }),
    ]);

    return res.json({ data: applications, pagination: { page, pageSize, total } });
  } catch (error) {
    console.error("List article applications error:", error);
    return res.status(500).json({ error: "Failed to list article applications" });
  }
}

async function reviewArticleApplication(req, res) {
  try {
    const { id } = req.params;
    const action = String(req.body?.action || "").toLowerCase();

    if (!["accept", "decline"].includes(action)) {
      return res.status(400).json({ error: "action must be either accept or decline" });
    }

    const status = action === "accept" ? "ACCEPTED" : "DECLINED";

    const result = await prisma.$transaction(async (tx) => {
      const application = await tx.articleApplication.findUnique({ where: { id } });
      if (!application) return null;

      const updatedApplication = await tx.articleApplication.update({
        where: { id },
        data: {
          status,
          reviewedBy: req.admin.id,
          reviewedAt: new Date(),
        },
        include: {
          user: {
            select: { id: true, name: true, username: true, email: true, isAuthorized: true },
          },
        },
      });

      const updatedUser = await tx.user.update({
        where: { id: updatedApplication.userId },
        data: { isAuthorized: action === "accept" },
        select: { id: true, isAuthorized: true },
      });

      return { updatedApplication, updatedUser };
    });

    if (!result) return res.status(404).json({ error: "Application not found" });

    await writeAuditLog({
      adminId: req.admin.id,
      action: action === "accept" ? "ACCEPT_ARTICLE_APPLICATION" : "DECLINE_ARTICLE_APPLICATION",
      entityType: "ARTICLE_APPLICATION",
      entityId: id,
      metadata: { userId: result.updatedApplication.userId },
      ipAddress: req.ip,
    });

    return res.json({ data: result.updatedApplication, user: result.updatedUser });
  } catch (error) {
    console.error("Review article application error:", error);
    return res.status(500).json({ error: "Failed to review article application" });
  }
}

module.exports = {
  listArticleApplications,
  reviewArticleApplication,
};
