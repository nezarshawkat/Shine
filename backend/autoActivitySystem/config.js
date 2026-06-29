module.exports = {
  enabled: process.env.AUTO_ACTIVITY_ENABLED === "true",
  intervalMs: Number(process.env.AUTO_ACTIVITY_INTERVAL_MS || 180000),
  articleIntervalMs: Number(process.env.AUTO_ACTIVITY_ARTICLE_INTERVAL_MS || 3600000),
  anonymousEngagementUsers: Number(process.env.ANONYMOUS_ENGAGEMENT_USERS || 5000),
  openAiApiKey: process.env.OPENAI_API_KEY || "",
  openAiModel: process.env.OPENAI_MODEL || "gpt-4.1-mini",
  openAiSearchModel: process.env.OPENAI_SEARCH_MODEL || "gpt-5-search-api",
};
