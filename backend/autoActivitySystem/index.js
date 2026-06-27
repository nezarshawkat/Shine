const prisma = require("../prisma");
const local = require("../db/local");
const dataService = require("../services/dataService");
const localContent = require("../services/localContentService");
const { ensureSeededAccounts, getLocalSeededAccounts } = require("../services/seededAccountService");
const { moderateCreatedPost } = require("../services/sourceModerationService");
const { enabled, intervalMs, articleIntervalMs, openAiApiKey } = require("./config");
const { generateJson, generateSourcedJson } = require("./aiClient");
const { buildPostPrompt, buildArticlePrompt } = require("./promptBuilder");
const { simulatePostEngagement, simulateArticleEngagement } = require("./engagementEngine");
const { partitionUsers, pickPostType } = require("./userBehavior");

const localOnly =
  process.env.DATABASE_MODE === "local" ||
  process.env.LOCAL_ONLY_DB === "true" ||
  !process.env.DATABASE_URL;

let postTimer = null;
let articleTimer = null;
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

function pushError(scope, error) {
  const entry = { scope, at: new Date().toISOString(), message: error?.message || String(error) };
  state.lastErrorAt = entry.at;
  state.errors.unshift(entry);
  if (state.errors.length > MAX_ERRORS) state.errors.pop();
  console.error(`[auto-activity:${scope}]`, entry.message);
}

function uniqueUsers(users) {
  return [...new Map(users.map((user) => [user.id, user])).values()];
}

async function seededUsers() {
  await ensureSeededAccounts(localOnly ? null : prisma);
  if (localOnly) return getLocalSeededAccounts();
  return prisma.user.findMany({ where: { provider: "seed" }, take: 50 });
}

function sourceKeywords(sources) {
  return sources
    .flatMap((source) => String(source.name || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/))
    .filter((word) => word.length >= 4)
    .slice(0, 8);
}

async function latestCritiqueTarget() {
  if (localOnly) {
    return local.getDb().prepare("SELECT id, text FROM Post WHERE deletedAt IS NULL ORDER BY datetime(createdAt) DESC LIMIT 1").get() || null;
  }
  return prisma.post.findFirst({ orderBy: { createdAt: "desc" }, select: { id: true, text: true } });
}

async function createOnePost() {
  try {
    if (!openAiApiKey) throw new Error("OPENAI_API_KEY is missing");
    const users = await seededUsers();
    if (!users.length) throw new Error("No seeded AI users found");
    const { active, working } = partitionUsers(users);
    const actors = uniqueUsers([...active, ...working, ...users]);
    const author = active[Math.floor(Math.random() * active.length)];
    const postType = pickPostType();

    let targetText = "";
    let parentId = null;
    if (postType === "critique") {
      const target = await latestCritiqueTarget();
      targetText = target?.text || "";
      parentId = target?.id || null;
    }

    const prompt = buildPostPrompt({ user: author, postType, targetText });
    const generated = postType === "poll"
      ? { json: await generateJson(prompt), sources: [] }
      : await generateSourcedJson(prompt);
    const ai = generated.json;
    const text = String(ai.text || "").slice(0, 2000).trim();
    const sources = generated.sources;
    const keywords = [...new Set([...(Array.isArray(ai.keywords) ? ai.keywords : []), ...sourceKeywords(sources)])].slice(0, 12);
    if (!text) throw new Error("AI returned empty post text");
    if (postType !== "poll" && !sources.length) throw new Error("AI web search did not return a cited source");

    let post;
    if (localOnly) {
      post = await dataService.createPost({
        text,
        type: postType,
        authorId: author.id,
        parentId,
        keywords,
        sources,
        pollOptions: postType === "poll" ? (ai.pollOptions || []).slice(0, 4) : [],
        uploadedMedia: [],
        files: [],
      });
    } else {
      post = await prisma.post.create({
        data: {
          text,
          type: postType,
          authorId: author.id,
          parentId,
          keywords,
          sources: { create: sources },
          pollOptions: postType === "poll" ? { create: (ai.pollOptions || []).slice(0, 4).map((value) => ({ text: String(value) })) } : undefined,
        },
        include: { sources: true },
      });
    }

    const moderation = await moderateCreatedPost({ post, authorId: author.id, dataService, prisma: localOnly ? null : prisma });
    if (!moderation.valid) throw new Error(moderation.reasons.join(" "));
    await simulatePostEngagement(prisma, post, actors);
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
    const authors = users.filter((user) => Boolean(user.isAuthorized));
    if (!authors.length) throw new Error("No authorized seeded AI users found");
    const author = authors[Math.floor(Math.random() * authors.length)];
    const generated = await generateSourcedJson(buildArticlePrompt({ user: author }));
    const ai = generated.json;
    const title = String(ai.title || "").slice(0, 160).trim();
    const content = String(ai.content || "").slice(0, 12000).trim();
    const sources = generated.sources;
    if (!title || !content) throw new Error("AI returned empty article output");
    if (!sources.length) throw new Error("AI web search did not return a cited source for the article");

    const article = localOnly
      ? localContent.createArticle({ title, content, authorId: author.id, sources })
      : await prisma.article.create({ data: { title, content, authorId: author.id, sources: { create: sources } }, include: { sources: true } });
    await simulateArticleEngagement(prisma, article, users);
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
  postTimer = setInterval(() => createOnePost().catch(() => {}), intervalMs);
  articleTimer = setInterval(() => createOneArticle().catch(() => {}), articleIntervalMs);
  createOnePost().catch(() => {});
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
    config: { enabled, intervalMs, articleIntervalMs, ready: Boolean(openAiApiKey), sourceProvider: "OpenAI web search" },
    running: Boolean(postTimer || articleTimer),
    state,
  };
}

module.exports = {
  clearAutoActivityErrors,
  createOneArticle,
  createOnePost,
  getAutoActivityStatus,
  startAutoActivitySystem,
  stopAutoActivitySystem,
};
