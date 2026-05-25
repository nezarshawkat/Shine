const prisma = require('../prisma');
const { enabled, intervalMs, articleIntervalMs } = require('./config');
const { fetchHotNews } = require('./newsClient');
const { generateJson } = require('./aiClient');
const { buildPostPrompt, buildArticlePrompt } = require('./promptBuilder');
const { simulatePostEngagement } = require('./engagementEngine');
const { partitionUsers, pickPostType } = require('./userBehavior');

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
  const entry = {
    scope,
    at: new Date().toISOString(),
    message: error?.message || String(error),
  };
  state.lastErrorAt = entry.at;
  state.errors.unshift(entry);
  if (state.errors.length > MAX_ERRORS) state.errors.pop();
  console.error(`[auto-activity:${scope}]`, entry.message);
}

async function createOnePost() {
  try {
    const users = await prisma.user.findMany({ where: { provider: 'seed' }, take: 50 });
    if (!users.length) throw new Error('No seeded AI users found (provider=seed)');
    const { active, working } = partitionUsers(users);
    if (!active.length) throw new Error('No active AI users available for posting');
    const author = active[Math.floor(Math.random() * active.length)];
    const news = await fetchHotNews();
    const postType = pickPostType();

    let targetText = '';
    let parentId = null;
    if (postType === 'critique') {
      const target = await prisma.post.findFirst({ orderBy: { createdAt: 'desc' }, select: { id: true, text: true } });
      targetText = target?.text || '';
      parentId = target?.id || null;
    }

    const ai = await generateJson(buildPostPrompt({ user: author, postType, news, targetText }));
    const text = String(ai.text || '').slice(0, 2000).trim();
    const keywords = Array.isArray(ai.keywords) ? ai.keywords.slice(0, 8) : [];
    if (!text) throw new Error('AI returned empty post text');

    const post = await prisma.post.create({
      data: {
        text,
        type: postType,
        authorId: author.id,
        parentId,
        keywords,
        pollOptions: postType === 'poll' ? { create: (ai.pollOptions || []).slice(0, 4).map((p) => ({ text: String(p) })) } : undefined,
      },
    });

    await simulatePostEngagement(prisma, post.id, [...active, ...working]);
    state.postRuns += 1;
    state.lastPostAt = new Date().toISOString();
    return post;
  } catch (error) {
    state.postFailures += 1;
    pushError('post', error);
    throw error;
  }
}

async function createOneArticle() {
  try {
    const users = await prisma.user.findMany({ where: { provider: 'seed', isAuthorized: true }, take: 20 });
    if (!users.length) throw new Error('No authorized seeded AI users found');
    const author = users[Math.floor(Math.random() * users.length)];
    const news = await fetchHotNews();
    const ai = await generateJson(buildArticlePrompt({ user: author, news }));
    const title = String(ai.title || '').slice(0, 160).trim();
    const content = String(ai.content || '').slice(0, 12000).trim();
    if (!title || !content) throw new Error('AI returned empty article output');
    const article = await prisma.article.create({ data: { title, content, authorId: author.id } });
    state.articleRuns += 1;
    state.lastArticleAt = new Date().toISOString();
    return article;
  } catch (error) {
    state.articleFailures += 1;
    pushError('article', error);
    throw error;
  }
}

function startAutoActivitySystem() {
  if (!enabled || postTimer || articleTimer) return;
  state.startedAt = new Date().toISOString();
  postTimer = setInterval(() => createOnePost().catch(() => {}), intervalMs);
  articleTimer = setInterval(() => createOneArticle().catch(() => {}), articleIntervalMs);
  createOnePost().catch(() => {});
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
    config: { enabled, intervalMs, articleIntervalMs },
    running: !!postTimer,
    state,
  };
}

module.exports = {
  startAutoActivitySystem,
  stopAutoActivitySystem,
  getAutoActivityStatus,
  createOnePost,
  createOneArticle,
  clearAutoActivityErrors,
};
