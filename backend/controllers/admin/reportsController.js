const prisma = require("../../prisma");
const { writeAuditLog } = require("./common");

async function listReports(req, res) {
  try {
    const { type, status = "OPEN" } = req.query;

    const reports = await prisma.adminReport.findMany({
      where: {
        ...(type ? { type: type.toUpperCase() } : {}),
        ...(status ? { status: status.toUpperCase() } : {}),
      },
      include: {
        reporter: { select: { id: true, username: true, email: true } },
        post: { select: { id: true, text: true } },
        community: { select: { id: true, name: true } },
        profile: { select: { id: true, username: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ data: reports });
  } catch (error) {
    res.status(500).json({ error: "Failed to load reports" });
  }
}

async function resolveReport(req, res) {
  try {
    const { id } = req.params;
    const { resolution = "RESOLVED", action, blockUserId, deleteType, deleteId } = req.body;

    if (blockUserId) {
      await prisma.user.update({ where: { id: blockUserId }, data: { isAuthorized: false } });
    }

    if (deleteType && deleteId) {
      if (["POST", "COMMUNITY", "PROFILE"].includes(deleteType.toUpperCase())) {
        if (deleteType.toUpperCase() === "POST") await prisma.post.delete({ where: { id: deleteId } });
        if (deleteType.toUpperCase() === "COMMUNITY") await prisma.community.delete({ where: { id: deleteId } });
        if (deleteType.toUpperCase() === "PROFILE") await prisma.user.delete({ where: { id: deleteId } });
      }
    }

    const report = await prisma.adminReport.update({
      where: { id },
      data: {
        status: resolution.toUpperCase(),
        resolvedAt: new Date(),
        resolvedBy: req.admin.id,
      },
    });

    await writeAuditLog({
      adminId: req.admin.id,
      action: "RESOLVE_REPORT",
      entityType: "REPORT",
      entityId: id,
      metadata: { action, blockUserId, deleteType, deleteId, resolution },
      ipAddress: req.ip,
    });

    res.json({ data: report });
  } catch (error) {
    res.status(500).json({ error: "Failed to resolve report" });
  }
}

module.exports = {
  listReports,
  resolveReport,
};
