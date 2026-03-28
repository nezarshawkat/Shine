const express = require("express");
const prisma = require("../prisma");

const router = express.Router();

const APP_BASE_URL = (process.env.FRONTEND_URL || "https://sshine.org").replace(/\/$/, "");
const DEFAULT_OG_IMAGE = `${APP_BASE_URL}/og-default.png`;

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const trimText = (text = "", limit = 180) => {
  const normalized = String(text).replace(/\s+/g, " ").trim();
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit - 1).trimEnd()}…`;
};

const pickBestPreviewImage = (mediaItems = []) => {
  if (!Array.isArray(mediaItems) || mediaItems.length === 0) return null;
  const imageMedia = mediaItems.find((item) => String(item?.type || "").toLowerCase().startsWith("image"));
  return imageMedia?.url || mediaItems[0]?.url || null;
};

const toAbsoluteMediaUrl = (pathOrUrl, req) => {
  if (!pathOrUrl) return DEFAULT_OG_IMAGE;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;

  const backendBase = `${req.protocol}://${req.get("host")}`;
  const normalized = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${backendBase}${normalized}`;
};

const buildHtmlResponse = ({ title, description, image, canonicalUrl, redirectUrl }) => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />

  <meta property="og:type" content="website" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(image)}" />
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
  <meta property="og:site_name" content="Shine" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(image)}" />

  <meta http-equiv="refresh" content="0;url=${escapeHtml(redirectUrl)}" />
  <script>window.location.replace(${JSON.stringify(redirectUrl)});</script>
</head>
<body>
  <p>Redirecting to <a href="${escapeHtml(redirectUrl)}">${escapeHtml(redirectUrl)}</a>…</p>
</body>
</html>`;

router.get("/:type/:id", async (req, res) => {
  const rawType = String(req.params.type || "").toLowerCase();
  const id = req.params.id;

  const normalizedType = {
    post: "post",
    posts: "post",
    community: "community",
    communities: "community",
    article: "article",
    articles: "article",
    profile: "profile",
    profiles: "profile",
  }[rawType];

  if (!normalizedType) {
    return res.status(400).send("Unsupported share preview type.");
  }

  try {
    let preview;

    if (normalizedType === "post") {
      const post = await prisma.post.findUnique({
        where: { id },
        include: {
          author: { select: { name: true, username: true } },
          media: { select: { url: true, type: true }, orderBy: { createdAt: "asc" } },
        },
      });

      if (!post) return res.status(404).send("Post not found.");

      const authorName = post.author?.name || `@${post.author?.username || "unknown"}`;
      preview = {
        title: `${authorName} on Shine`,
        description: trimText(post.text || "Shared a post on Shine."),
        image: toAbsoluteMediaUrl(pickBestPreviewImage(post.media), req),
        redirectUrl: `${APP_BASE_URL}/post/${post.id}`,
      };
    }

    if (normalizedType === "community") {
      const community = await prisma.community.findUnique({
        where: { id },
        select: { id: true, name: true, slogan: true, icon: true, banner: true },
      });

      if (!community) return res.status(404).send("Community not found.");

      preview = {
        title: community.name,
        description: trimText(community.slogan || "Join this community on Shine."),
        image: toAbsoluteMediaUrl(community.icon || community.banner, req),
        redirectUrl: `${APP_BASE_URL}/community/${community.id}`,
      };
    }

    if (normalizedType === "article") {
      const article = await prisma.article.findUnique({
        where: { id },
        select: {
          id: true,
          title: true,
          content: true,
          media: { select: { url: true, type: true }, orderBy: { createdAt: "asc" } },
        },
      });

      if (!article) return res.status(404).send("Article not found.");

      preview = {
        title: article.title,
        description: trimText(article.content || "Read this article on Shine."),
        image: toAbsoluteMediaUrl(pickBestPreviewImage(article.media), req),
        redirectUrl: `${APP_BASE_URL}/article/${article.id}`,
      };
    }

    if (normalizedType === "profile") {
      const user = await prisma.user.findFirst({
        where: { OR: [{ id }, { username: id }] },
        select: { username: true, name: true, image: true },
      });

      if (!user) return res.status(404).send("Profile not found.");

      preview = {
        title: `${user.name} (@${user.username})`,
        description: `View ${user.name}'s profile on Shine.`,
        image: toAbsoluteMediaUrl(user.image, req),
        redirectUrl: `${APP_BASE_URL}/profile/${user.username}`,
      };
    }

    const canonicalUrl = `${req.protocol}://${req.get("host")}/share/${normalizedType}/${id}`;
    res.set("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(
      buildHtmlResponse({
        title: preview.title,
        description: preview.description,
        image: preview.image,
        canonicalUrl,
        redirectUrl: preview.redirectUrl,
      })
    );
  } catch (error) {
    console.error("Failed to render sharing preview", error);
    return res.status(500).send("Failed to load sharing preview.");
  }
});

module.exports = router;
