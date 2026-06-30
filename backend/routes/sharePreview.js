const express = require("express");
const prisma = require("../prisma");
const dataService = require("../services/dataService");
const localCommunities = require("../services/localCommunityService");
const localContent = require("../services/localContentService");
const localUsers = require("../services/localUserService");

const router = express.Router();

const APP_BASE_URL = (process.env.FRONTEND_URL || "https://sshine.org").replace(/\/$/, "");
const PUBLIC_BACKEND_URL = (process.env.PUBLIC_BACKEND_URL || "").replace(/\/$/, "");
const DEFAULT_OG_IMAGE = `${APP_BASE_URL}/og-default.png`;
const localOnly =
  process.env.DATABASE_MODE === "local" ||
  process.env.LOCAL_ONLY_DB === "true" ||
  !process.env.DATABASE_URL;

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const plainText = (value = "") =>
  String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const trimText = (value = "", limit = 200) => {
  const normalized = plainText(value);
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit - 3).trimEnd()}...`;
};

const imageMediaUrl = (mediaItems = []) => {
  if (!Array.isArray(mediaItems)) return null;
  return mediaItems.find((item) => {
    const type = String(item?.type || "").toLowerCase();
    const url = String(item?.url || "");
    return type.startsWith("image") || /\.(avif|gif|jpe?g|png|webp)(\?|$)/i.test(url);
  })?.url || null;
};

const requestOrigin = (req) => {
  if (PUBLIC_BACKEND_URL) return PUBLIC_BACKEND_URL;
  const forwardedProtocol = String(req.get("x-forwarded-proto") || "").split(",")[0].trim();
  return `${forwardedProtocol || req.protocol}://${req.get("host")}`;
};

const absoluteMediaUrl = (pathOrUrl, req) => {
  if (!pathOrUrl) return DEFAULT_OG_IMAGE;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${requestOrigin(req)}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
};

const safeJson = (value) => JSON.stringify(value).replace(/</g, "\\u003c");

const imageContentType = (url = "") => {
  if (/\.png(\?|$)/i.test(url)) return "image/png";
  if (/\.webp(\?|$)/i.test(url)) return "image/webp";
  if (/\.gif(\?|$)/i.test(url)) return "image/gif";
  return "image/jpeg";
};

function buildHtmlResponse(preview, { redirect = true } = {}) {
  const {
    title,
    description,
    image,
    imageAlt,
    canonicalUrl,
    shareUrl,
    redirectUrl,
    ogType = "website",
    twitterCard = "summary_large_image",
    structuredData,
  } = preview;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="theme-color" content="#1C274C" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
  <link rel="image_src" href="${escapeHtml(image)}" />

  <meta property="og:locale" content="en_US" />
  <meta property="og:type" content="${escapeHtml(ogType)}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(image)}" />
  <meta property="og:image:secure_url" content="${escapeHtml(image)}" />
  <meta property="og:image:type" content="${imageContentType(image)}" />
  <meta property="og:image:alt" content="${escapeHtml(imageAlt)}" />
  <meta property="og:url" content="${escapeHtml(shareUrl)}" />
  <meta property="og:site_name" content="Shine" />

  <meta name="twitter:card" content="${escapeHtml(twitterCard)}" />
  <meta name="twitter:domain" content="sshine.org" />
  <meta name="twitter:url" content="${escapeHtml(shareUrl)}" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(image)}" />
  <meta name="twitter:image:alt" content="${escapeHtml(imageAlt)}" />

  <script type="application/ld+json">${safeJson(structuredData)}</script>
  ${redirect ? `<meta http-equiv="refresh" content="0;url=${escapeHtml(redirectUrl)}" />
  <script>window.location.replace(${JSON.stringify(redirectUrl)});</script>` : ""}
</head>
<body>
  <main>
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(description)}</p>
    <a href="${escapeHtml(redirectUrl)}">Open on Shine</a>
  </main>
</body>
</html>`;
}

function postPreview(post, req) {
  const authorName = post.author?.name || `@${post.author?.username || "unknown"}`;
  const label = post.type === "poll"
    ? "Poll"
    : `${String(post.type || "Post").replace(/^./, (letter) => letter.toUpperCase())}`;
  const image = imageMediaUrl(post.media) || post.author?.image;
  const options = post.type === "poll"
    ? (post.pollOptions || []).map((option) => option.text).filter(Boolean).slice(0, 4)
    : [];
  const description = trimText(
    `${post.text || "Shared a post on Shine."}${options.length ? ` Options: ${options.join(", ")}.` : ""}`
  );
  const redirectUrl = `${APP_BASE_URL}/post/${post.id}`;
  return {
    title: `${label} by ${authorName} on Shine`,
    description,
    image: absoluteMediaUrl(image, req),
    imageAlt: image ? `Image shared by ${authorName}` : "Shine",
    redirectUrl,
    canonicalUrl: redirectUrl,
    ogType: "article",
    twitterCard: image ? "summary_large_image" : "summary",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "SocialMediaPosting",
      headline: trimText(post.text || `${label} on Shine`, 110),
      articleBody: plainText(post.text),
      datePublished: post.createdAt,
      author: { "@type": "Person", name: authorName },
      image: absoluteMediaUrl(image, req),
      url: redirectUrl,
    },
  };
}

function articlePreview(article, req) {
  const authorName = article.author?.name || article.author?.username || "Shine contributor";
  const image = imageMediaUrl(article.media) || article.author?.image;
  const redirectUrl = `${APP_BASE_URL}/article/${article.id}`;
  return {
    title: `${trimText(article.title || "Article", 100)} | Shine`,
    description: trimText(article.content || "Read this article on Shine."),
    image: absoluteMediaUrl(image, req),
    imageAlt: image ? article.title || "Shine article image" : "Shine",
    redirectUrl,
    canonicalUrl: redirectUrl,
    ogType: "article",
    twitterCard: image ? "summary_large_image" : "summary",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: plainText(article.title),
      description: trimText(article.content),
      datePublished: article.createdAt,
      dateModified: article.updatedAt,
      author: { "@type": "Person", name: authorName },
      image: absoluteMediaUrl(image, req),
      url: redirectUrl,
    },
  };
}

function communityPreview(community, req) {
  const image = community.icon || community.banner;
  const interests = Array.isArray(community.interests) ? community.interests.slice(0, 5) : [];
  const description = trimText(
    community.discription || community.slogan ||
    `Join ${community.name} on Shine.${interests.length ? ` Topics: ${interests.join(", ")}.` : ""}`
  );
  const redirectUrl = `${APP_BASE_URL}/community/${community.id}`;
  return {
    title: `${community.name} Community | Shine`,
    description,
    image: absoluteMediaUrl(image, req),
    imageAlt: image ? `${community.name} community logo` : "Shine",
    redirectUrl,
    canonicalUrl: redirectUrl,
    twitterCard: community.icon ? "summary" : "summary_large_image",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: community.name,
      description,
      logo: absoluteMediaUrl(community.icon, req),
      image: absoluteMediaUrl(community.banner || community.icon, req),
      url: redirectUrl,
    },
  };
}

function profilePreview(user, req) {
  const description = trimText(user.description || `View ${user.name}'s profile and posts on Shine.`);
  const redirectUrl = `${APP_BASE_URL}/profile/${user.username}`;
  return {
    title: `${user.name} (@${user.username}) | Shine`,
    description,
    image: absoluteMediaUrl(user.image, req),
    imageAlt: user.image ? `${user.name}'s profile photo` : "Shine",
    redirectUrl,
    canonicalUrl: redirectUrl,
    ogType: "profile",
    twitterCard: "summary",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "Person",
      name: user.name,
      alternateName: `@${user.username}`,
      description,
      image: absoluteMediaUrl(user.image, req),
      url: redirectUrl,
    },
  };
}

function eventPreview(event, req) {
  const eventDate = event.date ? new Date(event.date) : null;
  const dateText = eventDate && !Number.isNaN(eventDate.getTime())
    ? eventDate.toLocaleDateString("en", { dateStyle: "long" })
    : "";
  const detail = [dateText, event.location].filter(Boolean).join(" at ");
  const description = trimText(`${event.description || "Discover this event on Shine."}${detail ? ` ${detail}.` : ""}`);
  const redirectUrl = `${APP_BASE_URL}/events?event=${encodeURIComponent(event.id)}`;
  return {
    title: `${event.title} | Shine Events`,
    description,
    image: absoluteMediaUrl(event.image, req),
    imageAlt: event.image ? `${event.title} event image` : "Shine",
    redirectUrl,
    canonicalUrl: redirectUrl,
    twitterCard: event.image ? "summary_large_image" : "summary",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "Event",
      name: event.title,
      description: plainText(event.description),
      startDate: event.date,
      eventAttendanceMode: event.mode === "ONLINE"
        ? "https://schema.org/OnlineEventAttendanceMode"
        : "https://schema.org/OfflineEventAttendanceMode",
      location: event.location ? { "@type": "Place", name: event.location } : undefined,
      image: absoluteMediaUrl(event.image, req),
      url: redirectUrl,
    },
  };
}

router.get("/:type/:id", async (req, res) => {
  const rawType = String(req.params.type || "").toLowerCase();
  const id = String(req.params.id || "");
  const normalizedType = {
    post: "post", posts: "post",
    article: "article", articles: "article",
    community: "community", communities: "community",
    profile: "profile", profiles: "profile", user: "profile", users: "profile",
    event: "event", events: "event",
  }[rawType];
  if (!normalizedType) return res.status(400).send("Unsupported share preview type.");

  try {
    let preview = null;
    if (localOnly) {
      if (normalizedType === "post") {
        const post = await dataService.getSinglePost(id, null);
        if (post) preview = postPreview(post, req);
      }
      if (normalizedType === "article") {
        const article = localContent.getArticle(id);
        if (article) preview = articlePreview(article, req);
      }
      if (normalizedType === "community") {
        const community = localCommunities.getCommunity(id);
        if (community) preview = communityPreview(community, req);
      }
      if (normalizedType === "profile") {
        const user = localUsers.findById(id) || localUsers.findByUsername(id);
        if (user) preview = profilePreview(user, req);
      }
      if (normalizedType === "event") {
        const event = localContent.getEvent(id);
        if (event) preview = eventPreview(event, req);
      }
    } else {
      if (normalizedType === "post") {
        const post = await prisma.post.findUnique({
          where: { id },
          include: {
            author: { select: { name: true, username: true, image: true } },
            media: { select: { url: true, type: true }, orderBy: { createdAt: "asc" } },
            pollOptions: { select: { text: true } },
          },
        });
        if (post) preview = postPreview(post, req);
      }
      if (normalizedType === "article") {
        const article = await prisma.article.findUnique({
          where: { id },
          include: {
            author: { select: { name: true, username: true, image: true } },
            media: { select: { url: true, type: true }, orderBy: { createdAt: "asc" } },
          },
        });
        if (article) preview = articlePreview(article, req);
      }
      if (normalizedType === "community") {
        const community = await prisma.community.findUnique({ where: { id } });
        if (community) preview = communityPreview(community, req);
      }
      if (normalizedType === "profile") {
        const user = await prisma.user.findFirst({ where: { OR: [{ id }, { username: id }] } });
        if (user) preview = profilePreview(user, req);
      }
      if (normalizedType === "event") {
        const event = await prisma.event.findUnique({ where: { id } });
        if (event) preview = eventPreview(event, req);
      }
    }

    if (!preview) return res.status(404).send(`${normalizedType} not found.`);
    const version = String(req.query.v || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24);
    preview.shareUrl = `${APP_BASE_URL}/share/${normalizedType}/${encodeURIComponent(id)}${version ? `?v=${version}` : ""}`;
    const crawler = /bot|crawler|spider|facebookexternalhit|facebot|twitterbot|whatsapp|linkedinbot|slackbot|discordbot|telegrambot|pinterest|skypeuripreview|google-inspectiontool/i
      .test(String(req.get("user-agent") || ""));
    res.set({
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
      "Content-Language": "en",
    });
    return res.status(200).send(buildHtmlResponse(preview, { redirect: !crawler }));
  } catch (error) {
    console.error("Failed to render sharing preview", error);
    return res.status(500).send("Failed to load sharing preview.");
  }
});

module.exports = router;
