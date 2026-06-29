function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sourceLabels(sources) {
  const labels = [];
  for (const source of Array.isArray(sources) ? sources : []) {
    const name = String(source?.name || "").trim();
    if (name && name.length <= 80) labels.push(name);
    try {
      const hostname = new URL(source?.link || "").hostname.replace(/^www\./i, "");
      if (hostname) {
        labels.push(hostname);
        labels.push(hostname.split(".")[0]);
      }
    } catch {
      // Invalid source URLs are handled by source moderation.
    }
  }
  return [...new Set(labels.filter((label) => label.length >= 3))].sort((a, b) => b.length - a.length);
}

function stripSourceCitations(value, sources = []) {
  let text = String(value || "");

  text = text.replace(
    /(?:^|\n)\s*(?:#{1,6}\s*)?(?:\*{1,2})?(?:sources?|references?|citations?)(?:\*{1,2})?\s*:[\s\S]*$/im,
    ""
  );
  text = text.replace(/\s*\(\s*\[[^\]]+\]\(https?:\/\/[^)\s]+\)\s*\)/gi, "");
  text = text.replace(/\s*\[[^\]]+\]\(https?:\/\/[^)\s]+\)/gi, "");
  text = text.replace(/\s*<https?:\/\/[^>]+>/gi, "");
  text = text.replace(/\s*https?:\/\/[^\s)\]}]+/gi, "");
  text = text.replace(/\s*\[(?:\d+\s*(?:,|-)?\s*)+\]/g, "");
  text = text.replace(/\s*\u3010\s*\d+(?:\s*[,;-]\s*\d+)*\s*\u3011/g, "");

  for (const label of sourceLabels(sources)) {
    const escaped = escapeRegExp(label);
    text = text.replace(new RegExp(`\\s*\\(\\s*(?:source\\s*:\\s*)?${escaped}\\s*\\)`, "gi"), "");
    text = text.replace(new RegExp(`\\s*\\[\\s*(?:source\\s*:\\s*)?${escaped}\\s*\\]`, "gi"), "");
    text = text.replace(new RegExp(`\\baccording\\s+to\\s+${escaped}\\s*,?\\s*`, "gi"), "");
  }

  return text
    .replace(/\(\s*\)/g, "")
    .replace(/[ \t]+([,.;:!?])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

module.exports = { stripSourceCitations };
