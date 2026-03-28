const express = require("express");
const prisma = require("../prisma");

const router = express.Router();

const FRONTEND_URL = (process.env.FRONTEND_URL || "https://sshine.org").replace(/\/$/, "");
const DEFAULT_IMAGE = `${FRONTEND_URL}/images/logo.png`;

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function truncate(text = "", max = 150) {
  const clean = String(text || "").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1)}…`;
}

function getMediaImage(media = []) {
  return (media || []).find((item) => item?.type === "image")?.url || media?.[0]?.url || "";
}

async function resolveShareData(type, id) {
  if (type === "post") {
    const post = await prisma.post.findUnique({
      where: { id },
      include: { media: true, author: { select: { username: true, name: true } } },
    });
    if (!post) return null;

    const authorName = post.author?.name || post.author?.username || "Shine member";
    return {
      title: `${authorName} on Shine`,
      description: truncate(post.text || "View this post on Shine."),
      image: getMediaImage(post.media),
      url: `${FRONTEND_URL}/post/${post.id}`,
    };
  }

  if (type === "article") {
    const article = await prisma.article.findUnique({
      where: { id },
      include: { media: true },
    });
    if (!article) return null;

    return {
      title: article.title || "Shine Article",
      description: truncate(article.content || "Read this article on Shine."),
      image: getMediaImage(article.media),
      url: `${FRONTEND_URL}/article/${article.id}`,
    };
  }

  if (type === "community") {
    const community = await prisma.community.findUnique({ where: { id } });
    if (!community) return null;

    return {
      title: community.name || "Shine Community",
      description: truncate(community.discription || community.slogan || "Join this community on Shine."),
      image: community.banner || community.icon || "",
      url: `${FRONTEND_URL}/community/${community.id}`,
    };
  }

  if (type === "event") {
    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) return null;

    return {
      title: event.title || "Shine Event",
      description: truncate(event.description || "See this event on Shine."),
      image: event.image || "",
      url: `${FRONTEND_URL}/events`,
    };
  }

  return null;
}

router.get("/share/:type/:id", async (req, res) => {
  try {
    const type = String(req.params.type || "").toLowerCase();
    const { id } = req.params;

    const data = await resolveShareData(type, id);
    if (!data) {
      return res.status(404).send("Not found");
    }

    const title = escapeHtml(data.title);
    const description = escapeHtml(data.description);
    const image = escapeHtml(data.image || DEFAULT_IMAGE);
    const url = escapeHtml(data.url);

    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${title}</title>
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${image}" />
    <meta http-equiv="refresh" content="0;url=${url}" />
  </head>
  <body>
    <p>Redirecting to <a href="${url}">${url}</a>…</p>
  </body>
</html>`;

    res.set("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(html);
  } catch (error) {
    console.error("Share meta route error:", error);
    return res.status(500).send("Internal server error");
  }
});

module.exports = router;
