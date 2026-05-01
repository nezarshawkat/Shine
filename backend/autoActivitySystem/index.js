const prisma = require('../prisma');
const { enabled, intervalMs, articleIntervalMs } = require('./config');
const { fetchHotNews } = require('./newsClient');
const { generateJson } = require('./aiClient');
const { buildPostPrompt, buildArticlePrompt } = require('./promptBuilder');
const { simulatePostEngagement } = require('./engagementEngine');
const { partitionUsers, pickPostType } = require('./userBehavior');

let postTimer = null;
let articleTimer = null;
let recentTopics = [];

async function createOnePost() {
  const users = await prisma.user.findMany({ where: { isSuspended: false }, take: 40 });
  if (!users.length) return;
  const { active, working } = partitionUsers(users);
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
  const text = String(ai.text || '').slice(0, 2000);
  const keywords = Array.isArray(ai.keywords) ? ai.keywords.slice(0, 8) : [];
  if (!text) return;

  const post = await prisma.post.create({
    data: {
      text,
      type: postType,
      authorId: author.id,
      parentId,
      keywords,
      pollOptions: postType === 'poll' ? { create: (ai.pollOptions || []).slice(0,4).map((p) => ({ text: String(p) })) } : undefined,
    },
  });

  recentTopics.push(text.slice(0, 80));
  if (recentTopics.length > 80) recentTopics.shift();
  await simulatePostEngagement(prisma, post.id, [...active, ...working]);
}

async function createOneArticle() {
  const users = await prisma.user.findMany({ where: { isAuthorized: true }, take: 10 });
  if (!users.length) return;
  const author = users[Math.floor(Math.random() * users.length)];
  const news = await fetchHotNews();
  const ai = await generateJson(buildArticlePrompt({ user: author, news }));
  const title = String(ai.title || '').slice(0, 160);
  const content = String(ai.content || '').slice(0, 12000);
  if (!title || !content) return;
  await prisma.article.create({ data: { title, content, authorId: author.id } });
}

function startAutoActivitySystem() {
  if (!enabled || postTimer || articleTimer) return;
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

function getAutoActivityStatus() {
  return { enabled, running: !!postTimer, intervalMs, articleIntervalMs };
}

module.exports = { startAutoActivitySystem, stopAutoActivitySystem, getAutoActivityStatus };
