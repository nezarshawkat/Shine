const prisma = require("../../prisma");
const { parsePagination, writeAuditLog } = require("./common");

async function listUsers(req, res) {
  try {
    const { q, status, sortBy = "createdAt", sortOrder = "desc" } = req.query;
    const { page, pageSize } = parsePagination(req);

    const where = {
      ...(q
        ? {
            OR: [
              { email: { contains: q, mode: "insensitive" } },
              { username: { contains: q, mode: "insensitive" } },
              { name: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(status === "blocked" ? { isAuthorized: false } : {}),
      ...(status === "active" ? { isAuthorized: true } : {}),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          isAuthorized: true,
          createdAt: true,
          roleLevel: true,
        },
        orderBy: { [sortBy]: sortOrder.toLowerCase() === "asc" ? "asc" : "desc" },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ data: users, pagination: { page, pageSize, total } });
  } catch (error) {
    res.status(500).json({ error: "Failed to list users" });
  }
}

async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { name, roleLevel } = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: { ...(name ? { name } : {}), ...(roleLevel ? { roleLevel } : {}) },
      select: { id: true, name: true, roleLevel: true, email: true },
    });

    await writeAuditLog({
      adminId: req.admin.id,
      action: "UPDATE_USER",
      entityType: "USER",
      entityId: id,
      metadata: { name, roleLevel },
      ipAddress: req.ip,
    });

    res.json({ data: user });
  } catch (error) {
    res.status(500).json({ error: "Failed to update user" });
  }
}

async function toggleUserBlock(req, res) {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id }, select: { isAuthorized: true } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const updated = await prisma.user.update({
      where: { id },
      data: { isAuthorized: !user.isAuthorized },
      select: { id: true, isAuthorized: true },
    });

    await writeAuditLog({
      adminId: req.admin.id,
      action: updated.isAuthorized ? "UNBLOCK_USER" : "BLOCK_USER",
      entityType: "USER",
      entityId: id,
      ipAddress: req.ip,
    });

    res.json({ data: updated });
  } catch (error) {
    res.status(500).json({ error: "Failed to toggle user status" });
  }
}

async function deleteUser(req, res) {
  try {
    const { id } = req.params;
    await prisma.user.delete({ where: { id } });

    await writeAuditLog({
      adminId: req.admin.id,
      action: "DELETE_USER",
      entityType: "USER",
      entityId: id,
      ipAddress: req.ip,
    });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete user" });
  }
}

module.exports = {
  listUsers,
  updateUser,
  toggleUserBlock,
  deleteUser,
};
