const { sendSystemMessage } = require("./systemMessageService");

const STOP_WORDS = new Set([
  "about", "after", "again", "also", "because", "being", "from", "have", "into",
  "just", "more", "most", "other", "over", "that", "their", "there", "these", "they",
  "this", "those", "through", "very", "what", "when", "where", "which", "with", "would",
]);

function tokens(value) {
  return new Set(
    String(value || "")
      .toLowerCase()
      .replace(/https?:\/\/\S+/g, " ")
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length >= 4 && !STOP_WORDS.has(word))
  );
}

function validHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return ["http:", "https:"].includes(parsed.protocol) && Boolean(parsed.hostname.includes("."));
  } catch {
    return false;
  }
}

function validateSources({ type, text, keywords = [], sources = [] }) {
  if (String(type).toLowerCase() === "poll") return { valid: true, reasons: [] };
  if (!Array.isArray(sources) || sources.length === 0) {
    return { valid: false, reasons: ["A non-poll post must include at least one source."] };
  }

  const subjectTokens = tokens(`${text || ""} ${(keywords || []).join(" ")}`);
  const reasons = [];
  for (const [index, source] of sources.entries()) {
    const name = String(source?.name || "").trim();
    const link = String(source?.link || "").trim();
    if (!name || !validHttpUrl(link)) {
      reasons.push(`Source ${index + 1} has an invalid name or URL.`);
      continue;
    }
    const sourceTokens = tokens(`${name} ${new URL(link).hostname.replace(/\./g, " ")}`);
    const overlap = [...sourceTokens].filter((word) => subjectTokens.has(word));
    if (subjectTokens.size && sourceTokens.size && overlap.length === 0) {
      reasons.push(`Source ${index + 1} does not match the post topic.`);
    }
  }
  return { valid: reasons.length === 0, reasons };
}

async function moderateCreatedPost({ post, authorId, dataService, prisma = null }) {
  const result = validateSources({
    type: post.type,
    text: post.text,
    keywords: post.keywords,
    sources: post.sources,
  });
  if (result.valid) return result;

  await dataService.deletePost(post.id);
  await sendSystemMessage(
    authorId,
    `Admin moderation: Your post was removed automatically because its sources did not pass verification: ${result.reasons.join(" ")}`,
    "/forum",
    prisma
  );
  return { ...result, deleted: true };
}

module.exports = { moderateCreatedPost, validateSources };
