export function getPostPublishError(error, fallback) {
  const data = error?.response?.data || {};
  const reasons = Array.isArray(data.reasons)
    ? data.reasons.map((reason) => String(reason || "").trim()).filter(Boolean)
    : [];
  const message = String(data.error || data.message || "").trim();

  if (reasons.length) {
    return `${message || "Source verification failed"} ${reasons.join(" ")}`;
  }
  return message || fallback;
}
