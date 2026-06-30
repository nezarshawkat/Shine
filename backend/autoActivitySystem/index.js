const prisma = require("../prisma");
const local = require("../db/local");
const dataService = require("../services/dataService");
const localContent = require("../services/localContentService");
const { ensureSeededAccounts, getLocalSeededAccounts } = require("../services/seededAccountService");
const { getAnonymousEngagementAccounts, targetCount } = require("../services/anonymousEngagementService");
const { moderateCreatedPost } = require("../services/sourceModerationService");
const { enabled, intervalMs, articleIntervalMs, communityPostRate, openAiApiKey } = require("./config");
const { generateJson, generateSourcedJson } = require("./aiClient");
const { buildPostPrompt, buildArticlePrompt } = require("./promptBuilder");
const { stripSourceCitations } = require("./contentSanitizer");
const { findArticleImage } = require("./articleImageService");
const { simulatePostEngagement, simulateArticleEngagement } = require("./engagementEngine");
const { partitionUsers, pickPostLength, pickPostType } = require("./userBehavior");

const localOnly =
  process.env.DATABASE_MODE === "local" ||
  process.env.LOCAL_ONLY_DB === "true" ||
  !process.env.DATABASE_URL;

let postTimer = null;
let articleTimer = null;
let scheduledGenerationRunning = false;
const MAX_ERRORS = 100;
const state = {
  startedAt: null,
  lastPostAt: null,
  lastArticleAt: null,
  postRuns: 0,
  articleRuns: 0,
  postFailures: 0,
  articleFailures: 0,
  lastErrorAt: null,
  errors: [],
};

const POLITICAL_TOPIC_PATTERN = /\b(politics?|political|government|governance|policy|elections?|parliament|congress|senate|president|prime minister|minister|legislature|constitution|democracy|diplomacy|diplomatic|geopolitics?|international relations|foreign policy|sanctions?|treaty|alliance|nato|united nations|border|conflict|war|peace|ceasefire|military|sovereignty|regime|opposition|bilateral|multilateral)\b/i;
const KEYWORD_STOP_WORDS = new Set([
  "about", "after", "again", "against", "because", "before", "being", "could", "from",
  "have", "into", "more", "most", "other", "over", "should", "their", "there", "these",
  "they", "this", "those", "through", "under", "very", "what", "when", "where", "which",
  "while", "with", "would",
]);
const RELATION_STOP_WORDS = new Set([
  ...KEYWORD_STOP_WORDS,
  "believe", "current", "government", "international", "issue", "opinion", "people",
  "policy", "political", "politics", "really", "think", "world",
]);

function pushError(scope, error) {
  const entry = { scope, at: new Date().toISOString(), message: error?.message || String(error) };
  state.lastErrorAt = entry.at;
  state.errors.unshift(entry);
  if (state.errors.length > MAX_ERRORS) state.errors.pop();
  console.error(`[auto-activity:${scope}]`, entry.message);
}

async function runScheduledGeneration(scope, task) {
  if (scheduledGenerationRunning) return false;
  scheduledGenerationRunning = true;
  try {
    await task();
    return true;
  } catch {
    return false;
  } finally {
    scheduledGenerationRunning = false;
  }
}

function uniqueUsers(users) {
  return [...new Map(users.map((user) => [user.id, user])).values()];
}

async function seededUsers() {
  await ensureSeededAccounts(localOnly ? null : prisma);
  if (localOnly) return getLocalSeededAccounts();
  return prisma.user.findMany({ where: { provider: "seed" }, take: 50 });
}

async function anonymousEngagementUsers() {
  return getAnonymousEngagementAccounts(localOnly ? null : prisma);
}

function sourceKeywords(sources) {
  return sources
    .flatMap((source) => String(source.name || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/))
    .filter((word) => word.length >= 4 && !KEYWORD_STOP_WORDS.has(word));
}

function textKeywords(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 4 && !KEYWORD_STOP_WORDS.has(word));
}

function keywordTargetCount() {
  const roll = Math.random();
  if (roll < 0.35) return 3;
  if (roll < 0.7) return 4;
  if (roll < 0.92) return 5;
  return 6;
}

function buildPostKeywords(aiKeywords, sources, text) {
  const candidates = [
    ...(Array.isArray(aiKeywords) ? aiKeywords : []),
    ...sourceKeywords(sources),
    ...textKeywords(text),
    "politics",
    "geopolitics",
    "public policy",
  ]
    .map((keyword) => String(keyword || "").trim().replace(/^#+/, "").slice(0, 48))
    .filter((keyword) => keyword.length >= 3);
  const unique = [...new Map(candidates.map((keyword) => [keyword.toLowerCase(), keyword])).values()];
  return unique.slice(0, keywordTargetCount());
}

function normalizePollOptions(values) {
  const options = (Array.isArray(values) ? values : [])
    .map((option) => String(option?.text || option || "").trim().slice(0, 120))
    .filter(Boolean);
  const uniqueOptions = [...new Set(options)].slice(0, 4);
  return uniqueOptions.length >= 2 ? uniqueOptions : ["Agree", "Disagree", "Not sure"];
}

function isPoliticsOrGeopolitics(...values) {
  return POLITICAL_TOPIC_PATTERN.test(values.filter(Boolean).join(" "));
}

function relationTokens(...values) {
  return new Set(
    values
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .replace(/https?:\/\/\S+/g, " ")
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length >= 4 && !RELATION_STOP_WORDS.has(word))
  );
}

function isCritiqueRelated(target, critiqueText, critiqueKeywords = []) {
  if (!target?.text || !critiqueText) return false;
  const targetTokens = relationTokens(target.text, ...(target.keywords || []));
  const critiqueTokens = relationTokens(critiqueText, ...critiqueKeywords);
  if (!targetTokens.size || !critiqueTokens.size) return false;
  const overlap = [...targetTokens].filter((word) => critiqueTokens.has(word));
  return overlap.length >= Math.min(2, targetTokens.size);
}

function limitWords(value, maxWords) {
  const text = String(value || "").trim();
  const words = [...text.matchAll(/\S+/g)];
  if (words.length <= maxWords) return text;

  const lastWord = words[maxWords - 1];
  let limited = text.slice(0, lastWord.index + lastWord[0].length).trimEnd();
  if (!/[.!?]$/.test(limited) && !/(^|\s)#[^\s#]+$/.test(limited)) {
    limited = `${limited.replace(/[,;:]$/, "")}.`;
  }
  return limited;
}

async function latestCritiqueTarget() {
  if (localOnly) {
    const rows = local.getDb().prepare("SELECT id, text, keywordsJson FROM Post WHERE deletedAt IS NULL ORDER BY datetime(createdAt) DESC LIMIT 50").all();
    for (const row of rows) {
      let keywords = [];
      try { keywords = JSON.parse(row.keywordsJson || "[]"); } catch { keywords = []; }
      if (isPoliticsOrGeopolitics(row.text, keywords.join(" "))) return { id: row.id, text: row.text, keywords };
    }
    return null;
  }
  const rows = await prisma.post.findMany({ orderBy: { createdAt: "desc" }, take: 50, select: { id: true, text: true, keywords: true } });
  return rows.find((row) => isPoliticsOrGeopolitics(row.text, (row.keywords || []).join(" "))) || null;
}

async function optionalShineCommunityId() {
  if (Math.random() >= communityPostRate) return null;
  if (localOnly) {
    return local.getDb().prepare("SELECT id FROM Community WHERE lower(name) = 'shine' LIMIT 1").get()?.id || null;
  }
  const community = await prisma.community.findFirst({
    where: { name: { equals: "Shine", mode: "insensitive" } },
    select: { id: true },
  });
  return community?.id || null;
}

async function createOnePost() {
  try {
    if (!openAiApiKey) throw new Error("OPENAI_API_KEY is missing");
    const users = await seededUsers();
    const engagementUsers = await anonymousEngagementUsers();
    if (!users.length) throw new Error("No seeded AI users found");
    const { active, working } = partitionUsers(users);
    const actors = uniqueUsers([...active, ...working, ...users]);
    const author = active[Math.floor(Math.random() * active.length)];
    let postType = pickPostType();

    let targetText = "";
    let parentId = null;
    let critiqueTarget = null;
    if (postType === "critique") {
      critiqueTarget = await latestCritiqueTarget();
      if (critiqueTarget) {
        targetText = critiqueTarget.text;
        parentId = critiqueTarget.id;
      } else {
        postType = "opinion";
      }
    }

    const includeHashtags = Math.random() < 0.4;
    const lengthProfile = pickPostLength(postType);
    const prompt = buildPostPrompt({ user: author, postType, targetText, includeHashtags, lengthProfile });
    const generated = postType === "poll"
      ? { json: await generateJson(prompt), sources: [] }
      : await generateSourcedJson(prompt);
    const ai = generated.json;
    const rawText = limitWords(stripSourceCitations(String(ai.text || ""), generated.sources), lengthProfile.maxWords);
    const text = includeHashtags
      ? rawText
      : rawText.replace(/(^|\s)#[^\s#]+/g, "$1").replace(/\s{2,}/g, " ").trim();
    const sources = generated.sources;
    const keywords = postType === "poll"
      ? []
      : buildPostKeywords(ai.keywords, sources, text);
    const pollOptions = postType === "poll" ? normalizePollOptions(ai.pollOptions) : [];
    if (!text) throw new Error("AI returned empty post text");
    if (!isPoliticsOrGeopolitics(text, keywords.join(" "), pollOptions.join(" "), sources.map((source) => source.name).join(" "))) {
      throw new Error("AI output was rejected because it was not about politics or geopolitics");
    }
    if (postType === "critique" && !isCritiqueRelated(critiqueTarget, text, keywords)) {
      throw new Error("AI critique was rejected because it did not address the reply post topic");
    }
    if (postType !== "poll" && !sources.length) throw new Error("AI web search did not return a cited source");
    const communityId = await optionalShineCommunityId();

    let post;
    if (localOnly) {
      post = await dataService.createPost({
        text,
        type: postType,
        authorId: author.id,
        communityId,
        parentId,
        keywords,
        sources,
        pollOptions,
        uploadedMedia: [],
        files: [],
      });
    } else {
      post = await prisma.post.create({
        data: {
          text,
          type: postType,
          authorId: author.id,
          communityId,
          parentId,
          keywords,
          sources: { create: sources },
          pollOptions: postType === "poll" ? { create: pollOptions.map((text) => ({ text })) } : undefined,
        },
        include: { sources: true, pollOptions: true },
      });
    }

    const moderation = await moderateCreatedPost({ post, authorId: author.id, dataService, prisma: localOnly ? null : prisma });
    if (!moderation.valid) throw new Error(moderation.reasons.join(" "));
    await simulatePostEngagement(prisma, post, actors, engagementUsers);
    state.postRuns += 1;
    state.lastPostAt = new Date().toISOString();
    return post;
  } catch (error) {
    state.postFailures += 1;
    pushError("post", error);
    throw error;
  }
}

async function createOneArticle() {
  try {
    if (!openAiApiKey) throw new Error("OPENAI_API_KEY is missing");
    const users = await seededUsers();
    const engagementUsers = await anonymousEngagementUsers();
    const authors = users.filter((user) => Boolean(user.isAuthorized));
    if (!authors.length) throw new Error("No authorized seeded AI users found");
    const author = authors[Math.floor(Math.random() * authors.length)];
    const generated = await generateSourcedJson(buildArticlePrompt({ user: author }));
    const ai = generated.json;
    const sources = generated.sources;
    const title = stripSourceCitations(String(ai.title || ""), sources).slice(0, 160).trim();
    const content = stripSourceCitations(String(ai.content || ""), sources).slice(0, 12000).trim();
    if (!title || !content) throw new Error("AI returned empty article output");
    if (!isPoliticsOrGeopolitics(title, content, sources.map((source) => source.name).join(" "))) {
      throw new Error("AI article was rejected because it was not about politics or geopolitics");
    }
    if (!sources.length) throw new Error("AI web search did not return a cited source for the article");
    const articleImage = await findArticleImage({
      title,
      imageQuery: String(ai.imageQuery || "").trim(),
      sources,
    });
    if (!articleImage) throw new Error("No relevant article image was available from its sources or Wikimedia");

    const article = localOnly
      ? localContent.createArticle({
          title,
          content,
          authorId: author.id,
          sources,
          uploadedMedia: [articleImage],
          files: [{ mimetype: articleImage.mimeType, size: 0 }],
        })
      : await prisma.article.create({
          data: {
            title,
            content,
            authorId: author.id,
            sources: { create: sources },
            media: {
              create: [{
                url: articleImage.url,
                type: "image",
                size: 0,
                uploaderId: author.id,
              }],
            },
          },
          include: { sources: true, media: true },
        });
    await simulateArticleEngagement(prisma, article, engagementUsers);
    state.articleRuns += 1;
    state.lastArticleAt = new Date().toISOString();
    return article;
  } catch (error) {
    state.articleFailures += 1;
    pushError("article", error);
    throw error;
  }
}

function startAutoActivitySystem({ respectEnv = false } = {}) {
  if ((respectEnv && !enabled) || postTimer || articleTimer) return false;
  if (!openAiApiKey) {
    pushError("start", new Error("OPENAI_API_KEY is missing"));
    return false;
  }
  state.startedAt = new Date().toISOString();
  postTimer = setInterval(() => runScheduledGeneration("post", createOnePost), intervalMs);
  articleTimer = setInterval(() => runScheduledGeneration("article", createOneArticle), articleIntervalMs);
  runScheduledGeneration("post", createOnePost);
  return true;
}

function stopAutoActivitySystem() {
  if (postTimer) clearInterval(postTimer);
  if (articleTimer) clearInterval(articleTimer);
  postTimer = null;
  articleTimer = null;
}

function clearAutoActivityErrors() {
  state.errors = [];
  state.lastErrorAt = null;
}

function getAutoActivityStatus() {
  return {
    config: { enabled, intervalMs, articleIntervalMs, ready: Boolean(openAiApiKey), sourceProvider: "OpenAI web search", anonymousEngagementUsers: targetCount },
    running: Boolean(postTimer || articleTimer),
    state,
  };
}

module.exports = {
  buildPostKeywords,
  clearAutoActivityErrors,
  createOneArticle,
  createOnePost,
  getAutoActivityStatus,
  isCritiqueRelated,
  startAutoActivitySystem,
  stopAutoActivitySystem,
};
