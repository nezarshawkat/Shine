function buildPostPrompt({ user, postType, targetText }) {
  const topicInstruction = postType === 'poll'
    ? 'Create an opinion-based poll that does not depend on current factual claims.'
    : 'Search for a timely topic that fits this profile. Base every factual claim on reliable pages found during this search. Do not invent facts or URLs. Do not put citations or source links inside the text because the application displays the cited pages separately.';

  return `You simulate one realistic social media user.
User: ${user.name} (@${user.username}), bio: ${user.description || 'n/a'}
Post type: ${postType}
Reply target (for critique only): ${targetText || 'none'}
${topicInstruction}
Write natural human text with a varied tone.
Output JSON: {"text":"...", "keywords":["..."], "pollOptions":["...optional..."]}`;
}

function buildArticlePrompt({ user }) {
  return `Search the live web for a timely topic that fits ${user.name} (@${user.username}), bio: ${user.description || 'n/a'}.
Write a natural human article grounded in reliable pages found during the search. Every factual claim must be supported by those pages. Do not invent facts or URLs. Do not put citations or source links inside the article because the application displays the cited pages separately.
Output JSON: {"title":"...", "content":"..."}`;
}

function buildCommentsPrompt({ postText, postType, actors, count }) {
  return `Generate ${count} distinct, natural comments that directly respond to this ${postType} post:
${postText}
Commenting profiles:
${actors.map((actor, index) => `${index}. ${actor.name} (@${actor.username}), bio: ${actor.description || 'n/a'}`).join('\n')}
Match each profile's likely voice, avoid generic filler, do not mention being AI, and do not repeat the post. Output JSON: {"comments":[{"actorIndex":0,"text":"..."}]}`;
}

module.exports = { buildPostPrompt, buildArticlePrompt, buildCommentsPrompt };
