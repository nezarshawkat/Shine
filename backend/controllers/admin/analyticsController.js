const prisma = require("../../prisma");

function topKeywords(posts) {
  const map = new Map();
  posts.forEach((post) => {
    (post.keywords || []).forEach((keyword) => {
      map.set(keyword, (map.get(keyword) || 0) + 1);
    });
    const tags = post.text?.match(/#\w+/g) || [];
    tags.forEach((tag) => map.set(tag.toLowerCase(), (map.get(tag.toLowerCase()) || 0) + 1));
  });

  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([keyword, count]) => ({ keyword, count }));
}

async function getAnalytics(req, res) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsersToday,
      totalPosts,
      totalCommunities,
      totalEvents,
      totalArticles,
      totalReports,
      posts,
      reports,
      communities,
      trendingPosts,
      trendingEvents,
      trendingArticles,
      largestCommunities,
      fastestGrowingCommunities,
      mostActiveUsers,
      commentsCount,
      pollPosts,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.post.findMany({ where: { createdAt: { gte: today } }, select: { authorId: true }, distinct: ["authorId"] }).then((r) => r.length),
      prisma.post.count(),
      prisma.community.count(),
      prisma.event.count(),
      prisma.article.count(),
      prisma.adminReport.count(),
      prisma.post.findMany({ select: { id: true, text: true, engagement: true, keywords: true, createdAt: true, authorId: true, communityId: true }, orderBy: { createdAt: "desc" }, take: 400 }),
      prisma.adminReport.findMany({ select: { type: true, postId: true, profileId: true, communityId: true, createdAt: true } }),
      prisma.community.findMany({ select: { id: true, name: true, engagement: true, _count: { select: { communityMembers: true, posts: true } } } }),
      prisma.post.findMany({ orderBy: { engagement: "desc" }, take: 10, select: { id: true, text: true, engagement: true, createdAt: true } }),
      prisma.event.findMany({ orderBy: { engagement: "desc" }, take: 10, select: { id: true, title: true, engagement: true, date: true } }),
      prisma.article.findMany({ take: 10, orderBy: { createdAt: "desc" }, select: { id: true, title: true, createdAt: true } }),
      prisma.community.findMany({ take: 10, orderBy: { communityMembers: { _count: "desc" } }, select: { id: true, name: true, _count: { select: { communityMembers: true } } } }),
      prisma.community.findMany({ take: 10, orderBy: { posts: { _count: "desc" } }, select: { id: true, name: true, _count: { select: { posts: true } } } }),
      prisma.user.findMany({ take: 10, select: { id: true, username: true, _count: { select: { posts: true } } }, orderBy: { posts: { _count: "desc" } } }),
      prisma.comment.count(),
      prisma.post.findMany({ where: { type: "poll" }, select: { id: true, pollOptions: { select: { votes: true } } } }),
    ]);

    const weeklyActiveUsers = new Set(posts.filter((p) => p.createdAt >= weekAgo).map((p) => p.authorId)).size;
    const postsToday = posts.filter((p) => p.createdAt >= today).length;

    const postsPerDay = Array.from({ length: 7 }).map((_, idx) => {
      const date = new Date(Date.now() - (6 - idx) * 24 * 60 * 60 * 1000);
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      return {
        day: start.toISOString().slice(0, 10),
        posts: posts.filter((p) => p.createdAt >= start && p.createdAt < end).length,
        reports: reports.filter((r) => r.createdAt >= start && r.createdAt < end).length,
      };
    });

    const reportPostMap = {};
    const reportCommunityMap = {};
    const reportUserMap = {};
    reports.forEach((r) => {
      if (r.postId) reportPostMap[r.postId] = (reportPostMap[r.postId] || 0) + 1;
      if (r.communityId) reportCommunityMap[r.communityId] = (reportCommunityMap[r.communityId] || 0) + 1;
      if (r.profileId) reportUserMap[r.profileId] = (reportUserMap[r.profileId] || 0) + 1;
    });

    const pollVotes = pollPosts.reduce((acc, post) => acc + post.pollOptions.reduce((s, o) => s + o.votes, 0), 0);

    const analytics = {
      overview: {
        totalUsers,
        activeUsersToday,
        totalPosts,
        totalCommunities,
        totalEvents,
        totalArticles,
        totalReports,
      },
      growth: {
        dailyActiveUsers: activeUsersToday,
        weeklyActiveUsers,
      },
      contentMetrics: {
        postsToday,
        postsPerDay,
        mostActiveUsers,
        mostActiveCommunities: communities.sort((a, b) => b._count.posts - a._count.posts).slice(0, 10),
      },
      trending: {
        keywords: topKeywords(posts),
        hashtags: topKeywords(posts).filter((k) => k.keyword.startsWith("#")).map((k) => ({ hashtag: k.keyword, count: k.count })),
        posts: trendingPosts,
        articles: trendingArticles,
        events: trendingEvents,
      },
      communityAnalytics: {
        largestCommunities,
        fastestGrowingCommunities,
        mostActiveCommunities: communities.sort((a, b) => b.engagement - a.engagement).slice(0, 10),
      },
      engagement: {
        averagePostsPerUser: totalUsers ? Number((totalPosts / totalUsers).toFixed(2)) : 0,
        commentsPerPost: totalPosts ? Number((commentsCount / totalPosts).toFixed(2)) : 0,
        pollParticipation: pollPosts.length ? Number((pollVotes / pollPosts.length).toFixed(2)) : 0,
      },
      moderation: {
        reportsPerDay: postsPerDay.map((d) => ({ day: d.day, reports: d.reports })),
        mostReportedUsers: Object.entries(reportUserMap).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id, count]) => ({ id, count })),
        mostReportedCommunities: Object.entries(reportCommunityMap).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id, count]) => ({ id, count })),
        mostReportedPosts: Object.entries(reportPostMap).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id, count]) => ({ id, count })),
      },
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
    const [analyticsCache, recentReports, recentUsers, recentPosts, recentCommunities] = await Promise.all([
      prisma.analyticsCache.findUnique({ where: { cacheKey: "admin-dashboard" } }),
      prisma.adminReport.findMany({ include: { reporter: { select: { username: true } } }, orderBy: { createdAt: "desc" }, take: 8 }),
      prisma.user.findMany({ select: { id: true, username: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 8 }),
      prisma.post.findMany({ select: { id: true, text: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 8 }),
      prisma.community.findMany({ select: { id: true, name: true }, orderBy: { id: "desc" }, take: 8 }),
    ]);

    res.json({ data: { analytics: analyticsCache?.payload || null, recentReports, recentUsers, recentPosts, recentCommunities } });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch dashboard overview" });
  }
}

module.exports = {
  getAnalytics,
  getDashboardOverview,
};
