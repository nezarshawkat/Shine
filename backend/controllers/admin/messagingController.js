const prisma = require("../../prisma");

async function sendSystemMessage(req, res) {
  try {
    const { title, message, link, filter = "all", communityId, userId, userIds = [] } = req.body;
    if (!title || !message) return res.status(400).json({ error: "title and message are required" });

    let users = [];

    if (filter === "all") users = await prisma.user.findMany({ select: { id: true } });
    if (filter === "community" && communityId) {
      users = await prisma.communityMember.findMany({ where: { communityId }, select: { userId: true } });
      users = users.map((u) => ({ id: u.userId }));
    }
    if (filter === "following" && userId) {
      users = await prisma.follows.findMany({ where: { followingId: userId }, select: { followerId: true } });
      users = users.map((u) => ({ id: u.followerId }));
    }
    if (filter === "notFollowingAnyone") {
      const all = await prisma.user.findMany({ select: { id: true, following: { select: { id: true } } } });
      users = all.filter((u) => u.following.length === 0).map((u) => ({ id: u.id }));
    }
    if (filter === "notInCommunity") {
      const all = await prisma.user.findMany({ select: { id: true, memberships: { select: { id: true } } } });
      users = all.filter((u) => u.memberships.length === 0).map((u) => ({ id: u.id }));
    }
    if (filter === "newUsers") {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      users = await prisma.user.findMany({ where: { createdAt: { gte: since } }, select: { id: true } });
    }
    if (filter === "inactiveUsers") {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const activeIds = await prisma.post.findMany({ where: { createdAt: { gte: thirtyDaysAgo } }, select: { authorId: true }, distinct: ["authorId"] });
      users = await prisma.user.findMany({ where: { id: { notIn: activeIds.map((u) => u.authorId) } }, select: { id: true } });
    }
    if (filter === "selected" && userIds.length) users = userIds.map((id) => ({ id }));

    const uniqueUserIds = [...new Set(users.map((u) => u.id))];
    if (!uniqueUserIds.length) return res.status(400).json({ error: "No users matched this filter" });

    await prisma.notification.createMany({
      data: uniqueUserIds.map((id) => ({
        userId: id,
        type: "SYSTEM",
        content: `${title}\n${message}`,
        link: link || null,
      })),
    });

    res.status(201).json({ data: { recipients: uniqueUserIds.length } });
  } catch (error) {
    res.status(500).json({ error: "Failed to send system message" });
  }
}

module.exports = { sendSystemMessage };
