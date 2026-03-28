const express = require("express");
const prisma = require("../prisma");

const router = express.Router();

const FRONTEND_URL = (process.env.FRONTEND_URL || "https://sshine.org").replace(/\/$/, "");
const BACKEND_URL = (process.env.BACKEND_URL || "https://shine-a77g.onrender.com").replace(/\/$/, "");
const DEFAULT_IMAGE = `${FRONTEND_URL}/og-default.png`;

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function truncate(text = "", max = 150) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1)}…`;
}

function looksLikeImageUrl(url = "") {
  return /\.(avif|gif|jpe?g|png|svg|webp)(\?.*)?$/i.test(url);
}

function getMediaImage(media = []) {
  const items = Array.isArray(media) ? media : [];

  const explicitImage = items.find((item) => {
    const kind = String(item?.type || "").toLowerCase();
    return kind === "image" || kind.startsWith("image/");
  });
  if (explicitImage?.url) return explicitImage.url;

  const imageByUrl = items.find((item) => looksLikeImageUrl(item?.url || ""));
  if (imageByUrl?.url) return imageByUrl.url;

  return items[0]?.url || "";
}

function toAbsoluteUrl(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("//")) return `https:${raw}`;

  if (raw.startsWith("/uploads/") || raw.startsWith("/api/upload")) {
    return `${BACKEND_URL}${raw}`;
  }

  if (raw.startsWith("/")) return `${FRONTEND_URL}${raw}`;
  return `${FRONTEND_URL}/${raw}`;
}

function buildMetaHtml({ title, description, image, url }) {
  const safeTitle = escapeHtml(title || "Shine");
  const safeDescription = escapeHtml(description || "Discover content on Shine.");
  const safeImage = escapeHtml(image || DEFAULT_IMAGE);
  const safeUrl = escapeHtml(url || FRONTEND_URL);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${safeTitle}</title>
    <meta property="og:title" content="${safeTitle}" />
    <meta property="og:description" content="${safeDescription}" />
    <meta property="og:image" content="${safeImage}" />
    <meta property="og:image:secure_url" content="${safeImage}" />
    <meta property="og:url" content="${safeUrl}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Shine" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${safeTitle}" />
    <meta name="twitter:description" content="${safeDescription}" />
    <meta name="twitter:image" content="${safeImage}" />
    <link rel="canonical" href="${safeUrl}" />
    <script>
      window.location.replace(${JSON.stringify(url || FRONTEND_URL)});
    </script>
  </head>
  <body>
    <p>Redirecting to <a href="${safeUrl}">${safeUrl}</a>…</p>
  </body>
</html>`;
}

router.get(["/post/:id", "/share/post/:id"], async (req, res) => {
  try {
    const post = await prisma.post.findUnique({
      where: { id: req.params.id },
      include: { media: true, author: { select: { username: true, name: true } } },
    });

    if (!post) return res.status(404).send("Post not found");

    const authorName = post.author?.name || post.author?.username || "Shine member";
    const html = buildMetaHtml({
      title: `${authorName} on Shine`,
      description: truncate(post.text || "View this post on Shine."),
      image: toAbsoluteUrl(getMediaImage(post.media)),
      url: `${FRONTEND_URL}/post/${post.id}`,
    });

    res.set("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(html);
  } catch (error) {
    console.error("Post share meta route error:", error);
    return res.status(500).send("Internal server error");
  }
});

router.get(["/article/:id", "/share/article/:id"], async (req, res) => {
  try {
    const article = await prisma.article.findUnique({
      where: { id: req.params.id },
      include: { media: true },
    });

    if (!article) return res.status(404).send("Article not found");

    const html = buildMetaHtml({
      title: article.title || "Shine Article",
      description: truncate(article.content || "Read this article on Shine."),
      image: toAbsoluteUrl(getMediaImage(article.media)),
      url: `${FRONTEND_URL}/article/${article.id}`,
    });

    res.set("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(html);
  } catch (error) {
    console.error("Article share meta route error:", error);
    return res.status(500).send("Internal server error");
  }
});

router.get(["/community/:id", "/share/community/:id"], async (req, res) => {
  try {
    const community = await prisma.community.findUnique({ where: { id: req.params.id } });

    if (!community) return res.status(404).send("Community not found");

    const html = buildMetaHtml({
      title: community.name || "Shine Community",
      description: truncate(community.slogan || community.discription || "Join this community on Shine."),
      image: toAbsoluteUrl(community.icon || community.banner),
      url: `${FRONTEND_URL}/community/${community.id}`,
    });

    res.set("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(html);
  } catch (error) {
    console.error("Community share meta route error:", error);
    return res.status(500).send("Internal server error");
  }
});

router.get(["/event/:id", "/events/:id", "/share/event/:id"], async (req, res) => {
  try {
    const event = await prisma.event.findUnique({ where: { id: req.params.id } });

    if (!event) return res.status(404).send("Event not found");

    const html = buildMetaHtml({
      title: event.title || "Shine Event",
      description: truncate(event.description || "See this event on Shine."),
      image: toAbsoluteUrl(event.image),
      url: `${FRONTEND_URL}/events`,
    });

    res.set("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(html);
  } catch (error) {
    console.error("Event share meta route error:", error);
    return res.status(500).send("Internal server error");
  }
});

module.exports = router;
