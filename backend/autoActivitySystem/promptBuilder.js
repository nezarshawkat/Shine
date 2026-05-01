function buildPostPrompt({ user, postType, news, targetText }) {
  return `You simulate one realistic social media user.
User: ${user.name} (@${user.username}), bio: ${user.description || 'n/a'}
Post type: ${postType}
Hot news: ${news.map((n, i) => `${i + 1}. ${n.title}`).join('\n') || 'none'}
Reply target (for critique only): ${targetText || 'none'}
Write human text, no template, varied tone. Output JSON: {"text":"...", "keywords":["..."], "pollOptions":["...optional..."]}`;
}

function buildArticlePrompt({ user, news }) {
  return `Write a natural human article for ${user.name} (@${user.username}) based on trending discussions and hot news.
News: ${news.map((n, i) => `${i + 1}. ${n.title}`).join('\n') || 'none'}
Output JSON: {"title":"...", "content":"..."}`;
}

module.exports = { buildPostPrompt, buildArticlePrompt };
