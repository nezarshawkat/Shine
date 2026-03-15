const prisma = require("../../prisma");

function topKeywords(posts) {
  const map = new Map();
  posts.forEach((post) => {
    (post.keywords || []).forEach((keyword) => {
      map.set(keyword, (map.get(keyword) || 0) + 1);
    });
  });

  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([keyword, count]) => ({ keyword, count }));
}

async function getAnalytics(req, res) {
  try {
    const [totalUsers, activeUsers, blockedUsers, totalPosts, posts, communities, topUsers] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isAuthorized: true } }),
      prisma.user.count({ where: { isAuthorized: false } }),
      prisma.post.count(),
      prisma.post.findMany({
        select: { id: true, text: true, engagement: true, keywords: true, createdAt: true, author: { select: { id: true, username: true } } },
        orderBy: { engagement: "desc" },
        take: 20,
      }),
      prisma.community.findMany({
        select: { id: true, name: true, engagement: true, status: true },
        orderBy: { engagement: "desc" },
        take: 10,
      }),
      prisma.user.findMany({
        select: {
          id: true,
          username: true,
          _count: { select: { posts: true, followers: true } },
        },
        take: 10,
      }),
    ]);

    const analytics = {
      cards: { totalUsers, activeUsers, blockedUsers, totalPosts, trendingPosts: posts.length },
      trendingPosts: posts,
      trendingCommunities: communities,
      trendingUsers: topUsers,
      keywords: topKeywords(posts),
      hashtags: topKeywords(posts).map((item) => ({ hashtag: `#${item.keyword.replace(/\s+/g, "")}`, count: item.count })),
      trendsOverTime: posts
        .slice()
        .reverse()
        .map((post, index) => ({
          bucket: index + 1,
          engagement: post.engagement,
          nestedTrend: Math.round(post.engagement * (1 + index / 20)),
        })),
      generatedAt: new Date().toISOString(),
    };

    await prisma.analyticsCache.upsert({
      where: { cacheKey: "admin-dashboard" },
      create: {
        cacheKey: "admin-dashboard",
        payload: analytics,
        expiresAt: new Date(Date.now() + 1000 * 60 * 5),
      },
      update: {
        payload: analytics,
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + 1000 * 60 * 5),
      },
    });

    res.json({ data: analytics });
  } catch (error) {
    res.status(500).json({ error: "Failed to load analytics" });
  }
}

async function getDashboardOverview(req, res) {
  try {
    const [analyticsCache, recentReports] = await Promise.all([
      prisma.analyticsCache.findUnique({ where: { cacheKey: "admin-dashboard" } }),
      prisma.adminReport.findMany({
        include: { reporter: { select: { username: true } } },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
    ]);

    res.json({ data: { analytics: analyticsCache?.payload || null, recentReports } });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch dashboard overview" });
  }
}

module.exports = {
  getAnalytics,
  getDashboardOverview,
};
