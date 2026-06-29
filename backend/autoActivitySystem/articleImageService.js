const USER_AGENT = "Shine/1.0 (https://sshine.org)";
const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function metaAttributes(tag) {
  const attributes = {};
  const pattern = /([:\w-]+)\s*=\s*(["'])([\s\S]*?)\2/g;
  let match;
  while ((match = pattern.exec(tag))) attributes[match[1].toLowerCase()] = decodeHtml(match[3]);
  return attributes;
}

function sourcePageImages(html, pageUrl) {
  const candidates = [];
  const metaTags = String(html || "").match(/<meta\s+[^>]*>/gi) || [];
  for (const tag of metaTags) {
    const attributes = metaAttributes(tag);
    const key = String(attributes.property || attributes.name || "").toLowerCase();
    if (!["og:image", "og:image:secure_url", "twitter:image", "twitter:image:src"].includes(key)) continue;
    try {
      candidates.push(new URL(attributes.content, pageUrl).toString());
    } catch {
      // Ignore malformed preview URLs and continue to the next candidate.
    }
  }
  return [...new Set(candidates)];
}

function looksLikeRasterUrl(value) {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return false;
    return !/\.(?:svg|gif)(?:$|[?#])/i.test(url.pathname);
  } catch {
    return false;
  }
}

async function validateImage(url) {
  if (!looksLikeRasterUrl(url)) return null;
  try {
    const response = await fetchWithTimeout(url, {
      method: "HEAD",
      redirect: "follow",
      headers: { "User-Agent": USER_AGENT, Accept: "image/*" },
    }, 8000);
    const mimeType = String(response.headers.get("content-type") || "").split(";")[0].toLowerCase();
    if (response.ok && IMAGE_MIME_TYPES.has(mimeType)) {
      return { url: response.url || url, mimeType };
    }
  } catch {
    // Some publishers block HEAD requests; extension validation below remains a safe fallback.
  }
  const extension = String(new URL(url).pathname).match(/\.(jpe?g|png|webp|avif)$/i)?.[1]?.toLowerCase();
  if (!extension) return null;
  return { url, mimeType: extension === "jpg" || extension === "jpeg" ? "image/jpeg" : `image/${extension}` };
}

async function imageFromSources(sources) {
  for (const source of (Array.isArray(sources) ? sources : []).slice(0, 4)) {
    try {
      const response = await fetchWithTimeout(source.link, {
        redirect: "follow",
        headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml" },
      });
      if (!response.ok) continue;
      const html = await response.text();
      for (const candidate of sourcePageImages(html, response.url || source.link)) {
        const image = await validateImage(candidate);
        if (image) return { ...image, origin: "source-page", sourceLink: source.link };
      }
    } catch {
      // Continue to another cited page or Wikimedia when a publisher blocks preview access.
    }
  }
  return null;
}

async function imageFromWikimedia(query) {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*",
    generator: "search",
    gsrnamespace: "6",
    gsrlimit: "8",
    gsrsearch: String(query || "politics geopolitics").slice(0, 180),
    prop: "imageinfo",
    iiprop: "url|mime",
    iiurlwidth: "1600",
  });
  try {
    const response = await fetchWithTimeout(`https://commons.wikimedia.org/w/api.php?${params}`, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    });
    if (!response.ok) return null;
    const data = await response.json();
    const pages = Object.values(data?.query?.pages || {}).sort((a, b) => Number(a.index || 0) - Number(b.index || 0));
    for (const page of pages) {
      const info = page.imageinfo?.[0];
      if (!IMAGE_MIME_TYPES.has(String(info?.mime || "").toLowerCase())) continue;
      const image = await validateImage(info.thumburl || info.url);
      if (image) return { ...image, origin: "wikimedia", sourceLink: info.descriptionurl || info.url };
    }
  } catch {
    return null;
  }
  return null;
}

async function findArticleImage({ title, imageQuery, sources }) {
  return (await imageFromSources(sources)) || (await imageFromWikimedia(imageQuery || title));
}

module.exports = { findArticleImage, sourcePageImages };
