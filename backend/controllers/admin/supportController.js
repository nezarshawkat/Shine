const prisma = require("../../prisma");

async function listSupportMessages(req, res) {
  try {
    const data = await prisma.supportMessage.findMany({
      include: { user: { select: { id: true, username: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ data });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch support messages" });
  }
}

async function replySupportMessage(req, res) {
  try {
    const { id } = req.params;
    const { reply, status = "RESOLVED" } = req.body;

    const data = await prisma.supportMessage.update({
      where: { id },
      data: { adminReply: reply || null, status: status.toUpperCase(), resolvedAt: status.toUpperCase() === "RESOLVED" ? new Date() : null },
    });

    res.json({ data });
  } catch (error) {
    res.status(500).json({ error: "Failed to update support message" });
  }
}

module.exports = { listSupportMessages, replySupportMessage };
