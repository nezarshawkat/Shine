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

    const normalizedReply = typeof reply === "string" ? reply.trim() : "";
    const nextStatus = status.toUpperCase();

    const data = await prisma.supportMessage.update({
      where: { id },
      data: {
        adminReply: normalizedReply || null,
        status: nextStatus,
        resolvedAt: nextStatus === "RESOLVED" ? new Date() : null,
      },
    });

    if (normalizedReply) {
      await prisma.notification.create({
        data: {
          userId: data.userId,
          type: "SYSTEM",
          content: `Support reply\n${normalizedReply}`,
          link: "/messenger",
        },
      });
    }

    res.json({ data });
  } catch (error) {
    res.status(500).json({ error: "Failed to update support message" });
  }
}

module.exports = { listSupportMessages, replySupportMessage };
