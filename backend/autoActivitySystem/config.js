module.exports = {
  enabled: process.env.AUTO_ACTIVITY_ENABLED === "true",
  intervalMs: Number(process.env.AUTO_ACTIVITY_INTERVAL_MS || 120000),
  articleIntervalMs: Number(process.env.AUTO_ACTIVITY_ARTICLE_INTERVAL_MS || 3600000),
  newsApiKey: process.env.NEWS_API_KEY || "",
  openAiApiKey: process.env.OPENAI_API_KEY || "",
  openAiModel: process.env.OPENAI_MODEL || "gpt-4.1-mini",
};
