module.exports = {
  enabled: process.env.AUTO_ACTIVITY_ENABLED === "true",
  postsPerDay: Math.max(1, Number(process.env.AUTO_ACTIVITY_POSTS_PER_DAY || 20)),
  articlesPerDay: Math.max(1, Number(process.env.AUTO_ACTIVITY_ARTICLES_PER_DAY || 2)),
  intervalMs: Number(process.env.AUTO_ACTIVITY_INTERVAL_MS || 4320000),
  articleIntervalMs: Number(process.env.AUTO_ACTIVITY_ARTICLE_INTERVAL_MS || 43200000),
  communityPostRate: Math.max(0, Math.min(0.4, Number(process.env.AUTO_ACTIVITY_COMMUNITY_POST_RATE || 0.25))),
  anonymousEngagementUsers: Number(process.env.ANONYMOUS_ENGAGEMENT_USERS || 5000),
  openAiApiKey: process.env.OPENAI_API_KEY || "",
  openAiModel: process.env.OPENAI_MODEL || "gpt-4.1-mini",
  openAiSearchModel: process.env.OPENAI_SEARCH_MODEL || "gpt-5-search-api",
};
