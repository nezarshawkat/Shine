const prisma = require("../../prisma");

async function writeAuditLog({ adminId, action, entityType, entityId, metadata, ipAddress }) {
  try {
    await prisma.adminAuditLog.create({
      data: {
        adminId,
        action,
        entityType,
        entityId,
        metadata,
        ipAddress,
      },
    });
  } catch (error) {
    console.error("Failed to write admin audit log", error.message);
  }
}

function parsePagination(req) {
  const page = Number.parseInt(req.query.page || "1", 10);
  const pageSize = Math.min(Number.parseInt(req.query.pageSize || "20", 10), 100);
  return {
    page: Number.isNaN(page) || page < 1 ? 1 : page,
    pageSize: Number.isNaN(pageSize) || pageSize < 1 ? 20 : pageSize,
  };
}

module.exports = {
  writeAuditLog,
  parsePagination,
};
