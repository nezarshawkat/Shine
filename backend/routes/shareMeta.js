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
<<<<<<< ours
  const clean = String(text || "").trim();
=======
  const clean = String(text || "").replace(/\s+/g, " ").trim();
>>>>>>> theirs
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1)}…`;
}

function getMediaImage(media = []) {
  return (media || []).find((item) => item?.type === "image")?.url || media?.[0]?.url || "";
}

<<<<<<< ours
async function resolveShareData(type, id) {
  if (type === "post") {
    const post = await prisma.post.findUnique({
      where: { id },
      include: { media: true, author: { select: { username: true, name: true } } },
    });
    if (!post) return null;

    const authorName = post.author?.name || post.author?.username || "Shine member";
    return {
=======
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
    <meta property="og:url" content="${safeUrl}" />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${safeTitle}" />
    <meta name="twitter:description" content="${safeDescription}" />
    <meta name="twitter:image" content="${safeImage}" />
    <meta http-equiv="refresh" content="0;url=${safeUrl}" />
  </head>
  <body>
    <p>Redirecting to <a href="${safeUrl}">${safeUrl}</a>…</p>
  </body>
</html>`;
}

router.get("/post/:id", async (req, res) => {
  try {
    const post = await prisma.post.findUnique({
      where: { id: req.params.id },
      include: { media: true, author: { select: { username: true, name: true } } },
    });

    if (!post) return res.status(404).send("Post not found");

    const authorName = post.author?.name || post.author?.username || "Shine member";
    const html = buildMetaHtml({
>>>>>>> theirs
      title: `${authorName} on Shine`,
      description: truncate(post.text || "View this post on Shine."),
      image: getMediaImage(post.media),
      url: `${FRONTEND_URL}/post/${post.id}`,
<<<<<<< ours
    };
  }

  if (type === "article") {
    const article = await prisma.article.findUnique({
      where: { id },
      include: { media: true },
    });
    if (!article) return null;

    return {
=======
    });

    res.set("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(html);
  } catch (error) {
    console.error("Post share meta route error:", error);
    return res.status(500).send("Internal server error");
  }
});

router.get("/article/:id", async (req, res) => {
  try {
    const article = await prisma.article.findUnique({
      where: { id: req.params.id },
      include: { media: true },
    });

    if (!article) return res.status(404).send("Article not found");

    const html = buildMetaHtml({
>>>>>>> theirs
      title: article.title || "Shine Article",
      description: truncate(article.content || "Read this article on Shine."),
      image: getMediaImage(article.media),
      url: `${FRONTEND_URL}/article/${article.id}`,
<<<<<<< ours
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
=======
    });

    res.set("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(html);
  } catch (error) {
    console.error("Article share meta route error:", error);
    return res.status(500).send("Internal server error");
  }
});

router.get("/community/:id", async (req, res) => {
  try {
    const community = await prisma.community.findUnique({ where: { id: req.params.id } });

    if (!community) return res.status(404).send("Community not found");

    const html = buildMetaHtml({
      title: community.name || "Shine Community",
      description: truncate(community.discription || community.slogan || "Join this community on Shine."),
      image: community.banner || community.icon,
      url: `${FRONTEND_URL}/community/${community.id}`,
    });

    res.set("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(html);
  } catch (error) {
    console.error("Community share meta route error:", error);
    return res.status(500).send("Internal server error");
  }
});

router.get(["/event/:id", "/events/:id"], async (req, res) => {
  try {
    const event = await prisma.event.findUnique({ where: { id: req.params.id } });

    if (!event) return res.status(404).send("Event not found");

    const html = buildMetaHtml({
      title: event.title || "Shine Event",
      description: truncate(event.description || "See this event on Shine."),
      image: event.image,
      url: `${FRONTEND_URL}/events`,
    });
>>>>>>> theirs

    res.set("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(html);
  } catch (error) {
<<<<<<< ours
    console.error("Share meta route error:", error);
=======
    console.error("Event share meta route error:", error);
>>>>>>> theirs
    return res.status(500).send("Internal server error");
  }
});

module.exports = router;
