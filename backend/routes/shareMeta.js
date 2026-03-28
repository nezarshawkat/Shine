const express = require("express");
const prisma = require("../prisma");

const router = express.Router();

const FRONTEND_URL = (process.env.FRONTEND_URL || "https://sshine.org").replace(/\/$/, "");
const BACKEND_URL = (process.env.BACKEND_URL || "https://shine-a77g.onrender.com").replace(/\/$/, "");

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function truncate(text = "", max = 170) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1)}…`;
}

function looksLikeImageUrl(url = "") {
  return /\.(avif|gif|jpe?g|png|svg|webp)(\?.*)?$/i.test(url);
}

function getFirstMediaUrl(media = []) {
  const items = Array.isArray(media) ? media : [];
  if (!items.length) return "";

  const firstImageByType = items.find((item) => {
    const kind = String(item?.type || "").toLowerCase();
    return kind === "image" || kind.startsWith("image/");
  });
  if (firstImageByType?.url) return firstImageByType.url;

  const firstImageByUrl = items.find((item) => looksLikeImageUrl(item?.url || ""));
  if (firstImageByUrl?.url) return firstImageByUrl.url;

  return items[0]?.url || "";
}

function getFirstImageFromText(text = "") {
  const raw = String(text || "");
  if (!raw) return "";

  const htmlImgMatch = raw.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (htmlImgMatch?.[1]) return htmlImgMatch[1];

  const markdownImgMatch = raw.match(/!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/i);
  if (markdownImgMatch?.[1]) return markdownImgMatch[1];

  const directImageUrlMatch = raw.match(/https?:\/\/[^\s"'<>]+\.(?:avif|gif|jpe?g|png|svg|webp)(?:\?[^\s"'<>]*)?/i);
  if (directImageUrlMatch?.[0]) return directImageUrlMatch[0];

  return "";
}

function toAbsoluteUrl(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("//")) return `https:${raw}`;

  if (
    raw.startsWith("/uploads/") ||
    raw.startsWith("/api/upload") ||
    raw.startsWith("uploads/") ||
    raw.startsWith("api/upload")
  ) {
    const normalized = raw.startsWith("/") ? raw : `/${raw}`;
    return `${BACKEND_URL}${normalized}`;
  }

  if (raw.startsWith("blob:") || raw.startsWith("data:")) return raw;

  const normalized = raw.startsWith("/") ? raw : `/${raw}`;
  return `${FRONTEND_URL}${normalized}`;
}

function buildMetaHtml({ title, description, image, url }) {
  const redirectUrl = url || FRONTEND_URL;
  const safeTitle = escapeHtml(title || "Shine");
  const safeDescription = escapeHtml(description || "Discover content on Shine.");
  const absoluteImage = toAbsoluteUrl(image);
  const safeImage = absoluteImage ? escapeHtml(absoluteImage) : "";
  const safeUrl = escapeHtml(redirectUrl);
  const hasImage = Boolean(safeImage);
  const twitterCardType = hasImage ? "summary_large_image" : "summary";
  const imageMeta = hasImage
    ? `
    <meta property="og:image" content="${safeImage}" />
    <meta property="og:image:secure_url" content="${safeImage}" />
    <meta property="og:image:alt" content="${safeTitle}" />
    <meta name="twitter:image" content="${safeImage}" />`
    : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${safeTitle}</title>
    <meta property="og:title" content="${safeTitle}" />
    <meta property="og:description" content="${safeDescription}" />
    ${imageMeta}
    <meta property="og:url" content="${safeUrl}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Shine" />
    <meta name="twitter:card" content="${twitterCardType}" />
    <meta name="twitter:title" content="${safeTitle}" />
    <meta name="twitter:description" content="${safeDescription}" />
    <meta http-equiv="refresh" content="0;url=${safeUrl}" />
    <link rel="canonical" href="${safeUrl}" />
  </head>
  <body>
    <p>Redirecting to <a href="${safeUrl}">${safeUrl}</a>…</p>
  </body>
</html>`;
}

router.get("/share/post/:id", async (req, res) => {
  try {
    const post = await prisma.post.findUnique({
      where: { id: req.params.id },
      include: {
        media: {
          orderBy: { createdAt: "asc" },
        },
        author: { select: { username: true, name: true } },
      },
    });

    if (!post) return res.status(404).send("Post not found");

    const authorName = post.author?.name || post.author?.username || "Shine member";
    const postText = truncate(post.text || "View this post on Shine.");
    const postMedia = getFirstMediaUrl(post.media);

    const html = buildMetaHtml({
      title: `${authorName} posted on Shine`,
      description: postText,
      image: postMedia,
      url: `${FRONTEND_URL}/post/${post.id}`,
    });

    res.set("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(html);
  } catch (error) {
    console.error("Post share meta route error:", error);
    return res.status(500).send("Internal server error");
  }
});

router.get("/share/community/:id", async (req, res) => {
  try {
    const community = await prisma.community.findUnique({ where: { id: req.params.id } });

    if (!community) return res.status(404).send("Community not found");

    const image = community.icon || community.banner;

    const html = buildMetaHtml({
      title: community.name || "Shine Community",
      description: truncate(community.slogan || community.discription || "Join this community on Shine."),
      image,
      url: `${FRONTEND_URL}/community/${community.id}`,
    });

    res.set("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(html);
  } catch (error) {
    console.error("Community share meta route error:", error);
    return res.status(500).send("Internal server error");
  }
});

router.get("/share/article/:id", async (req, res) => {
  try {
    const article = await prisma.article.findUnique({
      where: { id: req.params.id },
      include: {
        media: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!article) return res.status(404).send("Article not found");

    const excerpt = truncate(article.content || "Read this article on Shine.");
    const image = getFirstMediaUrl(article.media) || getFirstImageFromText(article.content);

    const html = buildMetaHtml({
      title: article.title || "Shine Article",
      description: excerpt,
      image,
      url: `${FRONTEND_URL}/article/${article.id}`,
    });

    res.set("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(html);
  } catch (error) {
    console.error("Article share meta route error:", error);
    return res.status(500).send("Internal server error");
  }
});

router.get("/share/profile/:id", async (req, res) => {
  try {
    const profileKey = String(req.params.id || "").trim();
    if (!profileKey) return res.status(404).send("Profile not found");

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ id: profileKey }, { username: profileKey }],
      },
      select: {
        id: true,
        username: true,
        name: true,
        image: true,
      },
    });

    if (!user) return res.status(404).send("Profile not found");

    const displayName = user.name || "Shine Member";
    const username = user.username ? `@${user.username}` : "";

    const html = buildMetaHtml({
      title: displayName,
      description: truncate(username || "View this profile on Shine."),
      image: user.image,
      url: `${FRONTEND_URL}/profile/${user.username || user.id}`,
    });

    res.set("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(html);
  } catch (error) {
    console.error("Profile share meta route error:", error);
    return res.status(500).send("Internal server error");
  }
});

module.exports = router;
