const prisma = require("../../prisma");
const { writeAuditLog } = require("./common");
const { deleteCommunityWithRelations, deletePostWithRelations, deleteUserWithRelations } = require("./deletionHelpers");

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
        post: { select: { id: true, text: true, type: true, authorId: true, author: { select: { id: true, username: true } } } },
        community: { select: { id: true, name: true, creatorId: true, creator: { select: { id: true, username: true } } } },
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
    const {
      resolution = "RESOLVED",
      action,
      blockUserId,
      suspendUserId,
      deleteType,
      deleteId,
      warnOwnerId,
    } = req.body;

    if (blockUserId || suspendUserId) {
      await prisma.user.update({ where: { id: blockUserId || suspendUserId }, data: { isAuthorized: false } });
    }

    if (warnOwnerId) {
      await prisma.notification.create({
        data: {
          userId: warnOwnerId,
          type: "ADMIN_WARNING",
          content: "Your community has been reported. Please review the community rules and content.",
        },
      });
    }

    if (deleteType && deleteId) {
      if (["POST", "COMMUNITY", "PROFILE"].includes(deleteType.toUpperCase())) {
        if (deleteType.toUpperCase() === "POST") {
          await prisma.$transaction(async (tx) => {
            await deletePostWithRelations(tx, deleteId);
          });
        }
        if (deleteType.toUpperCase() === "COMMUNITY") {
          await prisma.$transaction(async (tx) => {
            await deleteCommunityWithRelations(tx, deleteId);
          });
        }
        if (deleteType.toUpperCase() === "PROFILE") {
          await deleteUserWithRelations(deleteId);
        }
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
      metadata: { action, blockUserId, suspendUserId, deleteType, deleteId, warnOwnerId, resolution },
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
