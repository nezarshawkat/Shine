function buildPostPrompt({ user, postType, targetText, includeHashtags = false, lengthProfile }) {
  let topicInstruction;
  if (postType === 'poll') {
    topicInstruction = 'Create a politics or geopolitics opinion poll. Ask a clear question about government policy, elections, diplomacy, international relations, political movements, or conflicts. Return 2 to 4 distinct, concise poll options. The poll must ask for people\'s judgment rather than present uncertain claims as facts.';
  } else if (postType === 'critique') {
    topicInstruction = 'Critique the specific reply target shown below. Address its central claim, event, people, policy, or conflict directly; do not switch to another political topic. Clearly explain what this profile agrees or disagrees with and why. Search the web only for reliable sources about that same subject. Base every factual claim on those sources. Do not invent facts or URLs, and do not place citations or source links inside the text.';
  } else {
    topicInstruction = 'Search for a timely politics or geopolitics topic involving government policy, elections, diplomacy, international relations, political movements, or conflicts. Write this profile\'s genuine opinion or argument about it, not a neutral news summary. Ignore unrelated interests in the profile bio. Base every factual claim on reliable pages found during this search. Do not invent facts or URLs. Do not put citations or source links inside the text because the application displays the cited pages separately.';
  }

  const hashtagInstruction = includeHashtags
    ? 'If it feels natural for this specific post, include one or two relevant #hashtags in the text.'
    : 'Do not include hashtags in this post.';
  const lengthInstruction = lengthProfile
    ? `This post must use the ${lengthProfile.label} format: approximately ${lengthProfile.minWords} to ${lengthProfile.maxWords} words.`
    : 'Keep the length natural for a social media post.';

  return `You simulate one realistic social media user.
User: ${user.name} (@${user.username}), bio: ${user.description || 'n/a'}
Post type: ${postType}
Reply target (for critique only): ${targetText || 'none'}
${topicInstruction}
Write natural human text with a varied tone. ${lengthInstruction} ${hashtagInstruction}
Output JSON: {"text":"...", "keywords":["..."], "pollOptions":["...optional..."], "sourceEvidence":"For non-poll posts, briefly list the researched facts with web citations here; never put them in text."}`;
}

function buildArticlePrompt({ user }) {
  return `Search the live web for a timely politics or geopolitics topic for ${user.name} (@${user.username}), bio: ${user.description || 'n/a'}. Ignore unrelated interests in the profile bio.
Write a natural human opinion article about government policy, elections, diplomacy, international relations, political movements, or conflicts. It must express a clear viewpoint and be grounded in reliable pages found during the search. Every factual claim must be supported by those pages. Do not invent facts or URLs. Do not put citations or source links inside the article because the application displays the cited pages separately.
Output JSON: {"title":"...", "content":"...", "imageQuery":"A short, concrete search phrase for one documentary photo directly related to the main person, place, event, or institution in this article.", "sourceEvidence":"Briefly list the researched facts with web citations here; never put them in title or content."}`;
}

function buildCommentsPrompt({ postText, postType, actors, count }) {
  return `Generate ${count} distinct, natural comments that directly respond to this ${postType} post:
${postText}
Commenting profiles:
${actors.map((actor, index) => `${index}. ${actor.name} (@${actor.username}), bio: ${actor.description || 'n/a'}`).join('\n')}
Match each profile's likely voice, avoid generic filler, do not mention being AI, and do not repeat the post. Output JSON: {"comments":[{"actorIndex":0,"text":"..."}]}`;
}

module.exports = { buildPostPrompt, buildArticlePrompt, buildCommentsPrompt };
