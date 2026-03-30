const nodemailer = require("nodemailer");
<<<<<<< ours
=======
const https = require("https");
>>>>>>> theirs
const fs = require("fs");
const path = require("path");
const prisma = require("../prisma");

const DEFAULT_FROM = "Shine Notifications <notifications@sshine.org>";
const DEFAULT_INTERVAL_MINUTES = 60;
const MAX_MESSAGE_PREVIEW_PER_CHAT = 5;
const MAX_POSTS_PER_FOLLOWED_USER = 3;
const MAX_POSTS_PER_COMMUNITY = 3;
const SUPPORTED_POST_TYPES = ["opinion", "analysis", "critique", "poll"];
const DEFAULT_EMAIL_SEND_RETRIES = 2;
const DIGEST_USER_BATCH_SIZE = Math.max(25, Number(process.env.EMAIL_DIGEST_USER_BATCH_SIZE || 200));
const DIGEST_SEND_CONCURRENCY = Math.max(1, Number(process.env.EMAIL_DIGEST_SEND_CONCURRENCY || 20));
const DIGEST_LOOKBACK_DAYS = Math.max(1, Number(process.env.EMAIL_DIGEST_LOOKBACK_DAYS || 14));
const DIGEST_GLOBAL_LOCK_ID = 4047701;
const EVENT_DIGEST_DEBOUNCE_MS = Math.max(10000, Number(process.env.EMAIL_EVENT_DEBOUNCE_MS || 120000));
const WEEKLY_RECOMMENDATION_BATCH_SIZE = Math.max(50, Number(process.env.EMAIL_WEEKLY_RECOMMENDATION_BATCH_SIZE || 500));

let digestTimer = null;
let eventDigestFlushTimer = null;
const eventDigestQueue = new Set();
let cachedLogoDataUri = null;

async function acquireDigestGlobalLock() {
  try {
    const rows = await prisma.$queryRaw`SELECT pg_try_advisory_lock(${DIGEST_GLOBAL_LOCK_ID}) AS locked`;
    return Boolean(Array.isArray(rows) && rows[0]?.locked);
  } catch (error) {
    console.warn("Digest lock unavailable (non-Postgres or restricted db user). Continuing without global lock.");
    return true;
  }
}

async function releaseDigestGlobalLock() {
  try {
    await prisma.$queryRaw`SELECT pg_advisory_unlock(${DIGEST_GLOBAL_LOCK_ID})`;
  } catch (error) {
    // No-op when advisory locks are unavailable.
  }
}

function getDigestPrismaDelegates() {
  const preference = prisma.emailNotificationPreference;
  const batch = prisma.emailNotificationBatch;

  if (!preference || !batch) {
    throw new Error(
      "Prisma client is missing email notification models. Run `npx prisma generate --schema=backend/prisma/schema.prisma` and redeploy."
    );
  }

  return { preference, batch };
}

function parseBooleanEnv(value, defaultValue) {
  if (value === undefined) return defaultValue;
  return String(value).toLowerCase() === "true";
}

function getPlatformBaseUrl() {
  return process.env.PLATFORM_BASE_URL || "https://sshine.org";
}

function getDigestIntervalMs() {
  const minutes = Number(process.env.EMAIL_DIGEST_INTERVAL_MINUTES || DEFAULT_INTERVAL_MINUTES);
  return Math.max(5, Number.isFinite(minutes) ? minutes : DEFAULT_INTERVAL_MINUTES) * 60 * 1000;
}

function getEmailProvider() {
<<<<<<< ours
  return "smtp";
}

function createTransporter(provider = getEmailProvider()) {
  if (provider !== "smtp") {
    throw new Error(`Unsupported email provider "${provider}". Only SMTP is enabled.`);
  }

  const host = process.env.EMAIL_HOST;
  const port = Number(process.env.EMAIL_PORT || 587);
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!host || !user || !pass) {
    throw new Error("Missing EMAIL_HOST, EMAIL_USER or EMAIL_PASS for digest email delivery.");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    connectionTimeout: Number(process.env.EMAIL_CONNECTION_TIMEOUT_MS || 30000),
    greetingTimeout: Number(process.env.EMAIL_GREETING_TIMEOUT_MS || 15000),
    socketTimeout: Number(process.env.EMAIL_SOCKET_TIMEOUT_MS || 30000),
    family: Number(process.env.EMAIL_IP_FAMILY || 4),
  });
}

function createTransportersWithFallback() {
  const provider = getEmailProvider();
  return [{ name: provider, instance: createTransporter(provider) }];
=======
  const configuredProvider = String(process.env.EMAIL_PROVIDER || "smtp").trim().toLowerCase();
  return configuredProvider || "smtp";
}

function createTransporter(provider = getEmailProvider()) {
  if (provider === "brevo_api") {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) throw new Error("Missing BREVO_API_KEY for Brevo API fallback delivery.");
    return createBrevoApiTransporter(apiKey);
  }

  if (provider !== "smtp") {
    throw new Error(`Unsupported email provider "${provider}". Use smtp or brevo_api.`);
  }

  const host = process.env.EMAIL_HOST;
  const port = Number(process.env.EMAIL_PORT || 587);
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!host || !user || !pass) {
    throw new Error("Missing EMAIL_HOST, EMAIL_USER or EMAIL_PASS for digest email delivery.");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    connectionTimeout: Number(process.env.EMAIL_CONNECTION_TIMEOUT_MS || 30000),
    greetingTimeout: Number(process.env.EMAIL_GREETING_TIMEOUT_MS || 15000),
    socketTimeout: Number(process.env.EMAIL_SOCKET_TIMEOUT_MS || 30000),
    family: Number(process.env.EMAIL_IP_FAMILY || 4),
  });
}

function createBrevoApiTransporter(apiKey) {
  const resolveSender = () => {
    const fromValue = String(process.env.EMAIL_FROM || "").trim();
    const fallbackEmail = process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER;
    if (!fromValue && !fallbackEmail) {
      throw new Error("Missing sender address. Set EMAIL_FROM (or EMAIL_FROM_ADDRESS) for Brevo API fallback.");
    }
    if (fromValue.includes("<") && fromValue.includes(">")) {
      const match = fromValue.match(/^(.*)<([^>]+)>$/);
      if (match) return { name: match[1].trim().replace(/^"|"$/g, "") || "Shine Notifications", email: match[2].trim() };
    }
    if (fromValue.includes("@")) return { name: "Shine Notifications", email: fromValue };
    return { name: fromValue || "Shine Notifications", email: fallbackEmail };
  };

  return {
    async sendMail(mailOptions) {
      const payload = JSON.stringify({
        sender: resolveSender(),
        to: [{ email: mailOptions.to }],
        subject: mailOptions.subject,
        htmlContent: mailOptions.html,
        textContent: mailOptions.text,
      });

      await new Promise((resolve, reject) => {
        const req = https.request(
          {
            hostname: "api.brevo.com",
            path: "/v3/smtp/email",
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Content-Length": Buffer.byteLength(payload),
              "api-key": apiKey,
            },
            timeout: Number(process.env.EMAIL_CONNECTION_TIMEOUT_MS || 30000),
          },
          (res) => {
            let body = "";
            res.on("data", (chunk) => {
              body += chunk;
            });
            res.on("end", () => {
              if (res.statusCode >= 200 && res.statusCode < 300) return resolve();
              reject(new Error(`Brevo API send failed (${res.statusCode}): ${body || "no response body"}`));
            });
          }
        );
        req.on("timeout", () => req.destroy(new Error("Brevo API timeout")));
        req.on("error", reject);
        req.write(payload);
        req.end();
      });
    },
  };
}

function createTransportersWithFallback() {
  const provider = getEmailProvider();
  const fallbackEnabled = String(process.env.EMAIL_ENABLE_API_FALLBACK || "true").toLowerCase() === "true";
  const transporters = [];

  try {
    transporters.push({ name: provider, instance: createTransporter(provider) });
  } catch (error) {
    if (!(provider === "smtp" && fallbackEnabled && process.env.BREVO_API_KEY)) throw error;
    console.warn(`Primary transporter "${provider}" is unavailable: ${error.message}`);
  }

  if (provider === "smtp" && fallbackEnabled && process.env.BREVO_API_KEY) {
    transporters.push({ name: "brevo_api_fallback", instance: createTransporter("brevo_api"), skipVerify: true });
  }

  if (transporters.length === 0) {
    throw new Error("No email transporters could be initialized.");
  }
  return transporters;
>>>>>>> theirs
}

async function filterHealthyTransporters(transporters) {
  const healthy = [];

  for (const transporter of transporters) {
    if (transporter.skipVerify) {
      healthy.push(transporter);
      continue;
    }

    if (typeof transporter.instance.verify !== "function") {
      healthy.push(transporter);
      continue;
    }

    try {
      await transporter.instance.verify();
      healthy.push(transporter);
    } catch (error) {
      console.error(`Digest transporter "${transporter.name}" failed verification:`, error.message);
    }
  }

  return healthy;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function logEmailDelivery(data) {
  try {
    await prisma.emailDeliveryLog.create({ data });
  } catch (error) {
    console.error("Failed to persist email delivery log:", error.message);
  }
}

function isTransientEmailError(error) {
  if (!error) return false;

  const message = String(error.message || "").toLowerCase();
  const code = String(error.code || "").toUpperCase();

  return (
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("rate limit") ||
    ["ETIMEDOUT", "ECONNRESET", "ECONNREFUSED", "EAI_AGAIN"].includes(code)
  );
}

async function sendMailWithRetry(transporters, mailOptions) {
  if (!Array.isArray(transporters) || transporters.length === 0) {
    throw new Error("No healthy email transporters are available.");
  }

  const attempts = Math.max(1, Number(process.env.EMAIL_SEND_RETRIES || DEFAULT_EMAIL_SEND_RETRIES));
  let lastError;
  const failedTransporters = [];
  const context = mailOptions?.context || {};
  const { context: _context, ...deliveryOptions } = mailOptions || {};

  for (const transporter of transporters) {
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        await transporter.instance.sendMail(deliveryOptions);
        await logEmailDelivery({
          category: context.category || "digest",
          status: "sent",
          toEmail: String(mailOptions?.to || ""),
          subject: mailOptions?.subject || null,
          provider: getEmailProvider(),
          transporter: transporter.name,
          attempts: attempt,
          metadata: context.metadata || undefined,
        });
        return;
      } catch (error) {
        lastError = error;
        if (!isTransientEmailError(error) || attempt >= attempts) break;
        await sleep(Math.min(1000 * attempt, 3000));
      }
    }
    failedTransporters.push(transporter.name);
  }

  if (lastError && failedTransporters.length > 0) {
    lastError.message = `${lastError.message} (transporters tried: ${failedTransporters.join(", ")})`;
  }
  await logEmailDelivery({
    category: context.category || "digest",
    status: "failed",
    toEmail: String(mailOptions?.to || ""),
    subject: mailOptions?.subject || null,
    provider: getEmailProvider(),
    transporter: failedTransporters.join(", ") || null,
    attempts,
    errorMessage: lastError?.message || "Unknown error",
    metadata: context.metadata || undefined,
  });
  throw lastError;
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatTimestamp(date) {
  return new Date(date).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getShineLogoSrc(platformBaseUrl) {
  if (cachedLogoDataUri) return cachedLogoDataUri;
  try {
    const logoPath = path.resolve(__dirname, "../../frontend/src/assets/shineLogo.png");
    const ext = path.extname(logoPath).replace(".", "") || "png";
    const base64 = fs.readFileSync(logoPath, "base64");
    cachedLogoDataUri = `data:image/${ext};base64,${base64}`;
    return cachedLogoDataUri;
  } catch (error) {
    return `${platformBaseUrl}/assets/shineLogo.png`;
  }
}

function buildBrandedEmailShell({ platformBaseUrl, title, subtitle, introHtml = "", contentHtml = "", ctaHref, ctaLabel }) {
  const logoSrc = getShineLogoSrc(platformBaseUrl);
  return `
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#eef2f7;font-family:Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="700" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 12px 28px rgba(15,23,42,0.08);">
            <tr>
              <td style="background:#112f5d;padding:20px 24px;color:#ffffff;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="vertical-align:middle;">
                      <div style="font-size:24px;font-weight:800;line-height:1.2;">Shine</div>
                      <div style="font-size:12px;opacity:0.9;">${escapeHtml(subtitle || "Professional updates, delivered clearly.")}</div>
                    </td>
                    <td align="right" style="vertical-align:middle;">
                      <img src="${logoSrc}" alt="Shine Logo" style="height:38px;width:auto;background:#fff;border-radius:8px;padding:4px;" />
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <h2 style="margin:0 0 10px 0;color:#112f5d;">${escapeHtml(title)}</h2>
                ${introHtml}
                ${contentHtml}
                ${
                  ctaHref && ctaLabel
                    ? `<a href="${ctaHref}" style="display:inline-block;margin-top:14px;background:#facc15;color:#112f5d;text-decoration:none;font-weight:700;padding:10px 16px;border-radius:999px;">${escapeHtml(
                        ctaLabel
                      )}</a>`
                    : ""
                }
              </td>
            </tr>
            <tr>
              <td style="background:#112f5d;padding:14px 24px;color:#dbeafe;font-size:12px;">
                You can manage your notification preferences anytime in Shine Settings → Notifications.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function pickPostPreviewImage(post) {
  if (!post) return null;
  const media = Array.isArray(post.media) ? post.media : [];
  const image = media.find((item) => String(item?.type || "").toLowerCase().startsWith("image"));
  return image?.url || null;
}

function buildDigestSubject(summary) {
  const segments = [];
  if (summary.messages > 0) segments.push(`${summary.messages} new messages`);
  if (summary.followingPosts > 0) segments.push(`${summary.followingPosts} followed posts`);
  if (summary.communityPosts > 0) segments.push(`${summary.communityPosts} community posts`);
  if (summary.articles > 0) segments.push(`${summary.articles} articles`);
  if (summary.polls > 0) segments.push(`${summary.polls} polls`);

  return segments.length > 0 ? `Your Shine digest: ${segments.join(" · ")}` : "Your Shine digest";
}

function buildWeeklyRecommendationSubject(post) {
  return `Top post this week: ${extractPostTitle(post)}`;
}

function buildWeeklyRecommendationHtml({ user, post, platformBaseUrl }) {
  const authorName = post.author?.name || post.author?.username || "A creator you may like";
  const previewImage = pickPostPreviewImage(post);
  return buildBrandedEmailShell({
    platformBaseUrl,
    title: `Hello ${user.name || user.username}, your weekly pick is here`,
    subtitle: "Shine Weekly Pick",
    contentHtml: `
      <p style="margin:0 0 14px 0;color:#334155;">This week’s most-liked forum post is ready for you.</p>
      <a href="${platformBaseUrl}/posts/${post.id}" style="display:block;padding:14px;border:1px solid #e2e8f0;border-radius:10px;text-decoration:none;">
        ${
          previewImage
            ? `<img src="${escapeHtml(previewImage)}" alt="Post preview" style="display:block;width:100%;max-height:280px;object-fit:cover;border-radius:8px;margin-bottom:10px;" />`
            : ""
        }
        <div style="font-size:16px;font-weight:700;color:#112f5d;">${escapeHtml(extractPostTitle(post))}</div>
        <div style="margin-top:8px;font-size:13px;color:#64748b;">by ${escapeHtml(authorName)} · ${escapeHtml(
          mapPostType(post.type, (post.pollOptions || []).length > 0)
        )}</div>
      </a>`,
    ctaHref: `${platformBaseUrl}/feed`,
    ctaLabel: "Open feed",
  });
}

function buildEmailHtml({
  user,
  summary,
  groupedMessages,
  groupedFollowingPosts,
  groupedCommunityPosts,
  groupedArticles,
  platformBaseUrl,
}) {
  const messageSections = groupedMessages
    .map((chat) => {
      const messages = chat.messages
        .map(
          (message) => `
          <li style=\"padding:8px 0;border-bottom:1px solid #edf2f7;\"> 
            <div style=\"font-weight:600;color:#112f5d;\">${escapeHtml(message.senderName)}</div>
            <div style=\"color:#334155;\">${escapeHtml(message.preview)}</div>
            <div style=\"font-size:12px;color:#64748b;\">${formatTimestamp(message.createdAt)}</div>
          </li>
        `
        )
        .join("");

      return `
        <div style=\"margin-bottom:20px;\">
          <h4 style=\"margin:0 0 6px 0;color:#112f5d;\">Chat with ${escapeHtml(chat.partnerName)}</h4>
          <ul style=\"list-style:none;padding:0;margin:0;\">${messages}</ul>
          <a href=\"${platformBaseUrl}/messenger/${chat.partnerId}\" style=\"display:inline-block;margin-top:8px;color:#facc15;font-weight:700;text-decoration:none;\">Open chat →</a>
        </div>
      `;
    })
    .join("");

  const followingSections = groupedFollowingPosts
    .map((entry) => {
      const posts = entry.posts
        .map(
          (post) => `
          <li style=\"padding:8px 0;border-bottom:1px solid #edf2f7;\">
            ${
              post.previewImage
                ? `<img src=\"${escapeHtml(post.previewImage)}\" alt=\"Post preview\" style=\"display:block;width:100%;max-height:220px;object-fit:cover;border-radius:8px;margin-bottom:8px;\" />`
                : ""
            }
            <a href=\"${platformBaseUrl}/posts/${post.id}\" style=\"font-weight:600;color:#112f5d;text-decoration:none;\">${escapeHtml(post.title)}</a>
            <div style=\"font-size:12px;color:#64748b;\">${formatTimestamp(post.createdAt)} · ${escapeHtml(post.typeLabel)}</div>
          </li>
        `
        )
        .join("");

      return `
        <div style=\"margin-bottom:20px;\">
          <h4 style=\"margin:0 0 6px 0;color:#112f5d;\">${escapeHtml(entry.authorName)}</h4>
          <ul style=\"list-style:none;padding:0;margin:0;\">${posts}</ul>
          <a href=\"${platformBaseUrl}/profile/${entry.authorUsername}\" style=\"display:inline-block;margin-top:8px;color:#facc15;font-weight:700;text-decoration:none;\">View profile →</a>
        </div>
      `;
    })
    .join("");

  const communitySections = groupedCommunityPosts
    .map((entry) => {
      const posts = entry.posts
        .map(
          (post) => `
          <li style=\"padding:8px 0;border-bottom:1px solid #edf2f7;\">
            ${
              post.previewImage
                ? `<img src=\"${escapeHtml(post.previewImage)}\" alt=\"Post preview\" style=\"display:block;width:100%;max-height:220px;object-fit:cover;border-radius:8px;margin-bottom:8px;\" />`
                : ""
            }
            <a href=\"${platformBaseUrl}/posts/${post.id}\" style=\"font-weight:600;color:#112f5d;text-decoration:none;\">${escapeHtml(post.title)}</a>
            <div style=\"font-size:12px;color:#64748b;\">${formatTimestamp(post.createdAt)} · ${escapeHtml(post.typeLabel)}</div>
          </li>
        `
        )
        .join("");

      return `
        <div style=\"margin-bottom:20px;\">
          <h4 style=\"margin:0 0 6px 0;color:#112f5d;\">${escapeHtml(entry.communityName)}</h4>
          <ul style=\"list-style:none;padding:0;margin:0;\">${posts}</ul>
          <a href=\"${platformBaseUrl}/communities/${entry.communityId}\" style=\"display:inline-block;margin-top:8px;color:#facc15;font-weight:700;text-decoration:none;\">Open community →</a>
        </div>
      `;
    })
    .join("");

  const articleSections = groupedArticles
    .map((entry) => {
      const articles = entry.articles
        .map(
          (article) => `
          <li style=\"padding:8px 0;border-bottom:1px solid #edf2f7;\">
            <a href=\"${platformBaseUrl}/articles/${article.id}\" style=\"font-weight:600;color:#112f5d;text-decoration:none;\">${escapeHtml(article.title)}</a>
            <div style=\"font-size:12px;color:#64748b;\">${formatTimestamp(article.createdAt)} · Article</div>
          </li>
        `
        )
        .join("");

      return `
        <div style=\"margin-bottom:20px;\">
          <h4 style=\"margin:0 0 6px 0;color:#112f5d;\">${escapeHtml(entry.authorName)}</h4>
          <ul style=\"list-style:none;padding:0;margin:0;\">${articles}</ul>
        </div>
      `;
    })
    .join("");
  const contentBlocks = [
    groupedMessages.length > 0 ? `<div style="margin-top:18px;"><h3 style="margin:0 0 12px 0;color:#112f5d;">Messenger updates</h3>${messageSections}</div>` : "",
    groupedFollowingPosts.length > 0 ? `<div style="margin-top:18px;"><h3 style="margin:0 0 12px 0;color:#112f5d;">New posts from people you follow</h3>${followingSections}</div>` : "",
    groupedArticles.length > 0 ? `<div style="margin-top:18px;"><h3 style="margin:0 0 12px 0;color:#112f5d;">New articles</h3>${articleSections}</div>` : "",
    groupedCommunityPosts.length > 0 ? `<div style="margin-top:18px;"><h3 style="margin:0 0 12px 0;color:#112f5d;">Community activity</h3>${communitySections}</div>` : "",
  ].join("");

  return buildBrandedEmailShell({
    platformBaseUrl,
    title: `Hello ${user.name || user.username}, here's your Shine digest`,
    subtitle: "Professional Activity Digest",
    introHtml: `<p style="margin:8px 0 0 0;color:#334155;">You have ${summary.messages} new messages, ${summary.followingPosts} new followed-user posts, ${summary.communityPosts} community posts, ${summary.articles} articles and ${summary.polls} polls.</p>`,
    contentHtml: contentBlocks,
    ctaHref: `${platformBaseUrl}/feed`,
    ctaLabel: "Open Shine",
  });
}

function extractPostTitle(post) {
  if (!post?.text) return "Untitled post";
  const compact = post.text.replace(/\s+/g, " ").trim();
  return compact.length <= 90 ? compact : `${compact.slice(0, 87)}...`;
}

function mapPostType(type, hasPollOptions) {
  if (type === "poll" || hasPollOptions) return "Poll";
  if (type === "analysis") return "Analysis";
  if (type === "critique") return "Critique";
  if (type === "opinion") return "Opinion";
  return "Post";
}

async function getOrCreatePreference(userId) {
  const { preference } = getDigestPrismaDelegates();
  const existing = await preference.findUnique({ where: { userId } });
  if (existing) return existing;

  return preference.create({
    data: {
      userId,
      digestFrequencyMinutes: Number(process.env.EMAIL_DIGEST_INTERVAL_MINUTES || DEFAULT_INTERVAL_MINUTES),
      lastNotifiedAt: new Date(0),
    },
  });
}

async function collectUserDigestData(user, preference) {
  const minSince = new Date(Date.now() - DIGEST_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const since = preference.lastNotifiedAt && preference.lastNotifiedAt > minSince ? preference.lastNotifiedAt : minSince;
  const messageSince = preference.lastMessengerViewedAt && preference.lastMessengerViewedAt > since ? preference.lastMessengerViewedAt : since;

  const [followedUserIds, joinedCommunityIds] = await Promise.all([
    preference.enableFollowingPosts || preference.enableArticles
      ? prisma.follows.findMany({ where: { followerId: user.id }, select: { followingId: true } })
      : Promise.resolve([]),
    preference.enableCommunityPosts
      ? prisma.communityMember.findMany({ where: { userId: user.id }, select: { communityId: true } })
      : Promise.resolve([]),
  ]);

  const followedSet = new Set(followedUserIds.map((f) => f.followingId));
  const communitySet = new Set(joinedCommunityIds.map((c) => c.communityId));
  const followedAuthorIds = Array.from(followedSet);
  const joinedCommunityIdsArray = Array.from(communitySet);

  const maxFollowedCandidates = Math.max(60, followedAuthorIds.length * MAX_POSTS_PER_FOLLOWED_USER * 2);
  const maxCommunityCandidates = Math.max(60, joinedCommunityIdsArray.length * MAX_POSTS_PER_COMMUNITY * 2);
  const maxArticleCandidates = Math.max(60, followedAuthorIds.length * MAX_POSTS_PER_FOLLOWED_USER * 2);

  const [messages, followingPostsRaw, communityPostsRaw, followedArticlesRaw] = await Promise.all([
    preference.enableMessages
      ? prisma.message.findMany({
          where: { receiverId: user.id, isRead: false, createdAt: { gt: messageSince } },
          include: { sender: { select: { id: true, name: true, username: true } } },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    preference.enableFollowingPosts && followedAuthorIds.length > 0
      ? prisma.post.findMany({
          where: {
            authorId: { in: followedAuthorIds },
            createdAt: { gt: since },
            communityId: null,
            status: "ACTIVE",
            type: { in: SUPPORTED_POST_TYPES },
          },
          include: {
            author: { select: { id: true, name: true, username: true } },
            pollOptions: { select: { id: true } },
            media: { select: { url: true, type: true } },
          },
          orderBy: { createdAt: "desc" },
          take: maxFollowedCandidates,
        })
      : Promise.resolve([]),
    preference.enableCommunityPosts && joinedCommunityIdsArray.length > 0
      ? prisma.post.findMany({
          where: {
            createdAt: { gt: since },
            communityId: { in: joinedCommunityIdsArray },
            status: "ACTIVE",
            type: { in: SUPPORTED_POST_TYPES },
          },
          include: {
            community: { select: { id: true, name: true } },
            author: { select: { id: true, username: true } },
            pollOptions: { select: { id: true } },
            media: { select: { url: true, type: true } },
          },
          orderBy: { createdAt: "desc" },
          take: maxCommunityCandidates,
        })
      : Promise.resolve([]),
    preference.enableArticles && followedAuthorIds.length > 0
      ? prisma.article.findMany({
          where: {
            createdAt: { gt: since },
            authorId: { in: followedAuthorIds },
          },
          include: { author: { select: { id: true, name: true, username: true } } },
          orderBy: { createdAt: "desc" },
          take: maxArticleCandidates,
        })
      : Promise.resolve([]),
  ]);

  const groupedMessagesMap = new Map();
  for (const message of messages) {
    const partnerId = message.senderId;
    if (!groupedMessagesMap.has(partnerId)) {
      groupedMessagesMap.set(partnerId, {
        partnerId,
        partnerName: message.sender?.name || message.sender?.username || "Unknown user",
        messages: [],
      });
    }

    const chat = groupedMessagesMap.get(partnerId);
    if (chat.messages.length < MAX_MESSAGE_PREVIEW_PER_CHAT) {
      chat.messages.push({
        senderName: message.sender?.name || message.sender?.username || "Unknown",
        preview: message.text || "📷 Image",
        createdAt: message.createdAt,
      });
    }
  }

  const groupedFollowingMap = new Map();
  for (const post of followingPostsRaw) {
    if (!followedSet.has(post.authorId)) continue;
    if (!groupedFollowingMap.has(post.authorId)) {
      groupedFollowingMap.set(post.authorId, {
        authorId: post.authorId,
        authorName: post.author?.name || post.author?.username || "Unknown",
        authorUsername: post.author?.username || "",
        posts: [],
      });
    }

    const typeLabel = mapPostType(post.type, (post.pollOptions || []).length > 0);
    if (typeLabel === "Poll" && !preference.enablePolls) continue;
    if (typeLabel === "Analysis" && !preference.enableArticles) continue;

    const item = groupedFollowingMap.get(post.authorId);
    if (item.posts.length < MAX_POSTS_PER_FOLLOWED_USER) {
      item.posts.push({
        id: post.id,
        title: extractPostTitle(post),
        previewImage: pickPostPreviewImage(post),
        typeLabel,
        createdAt: post.createdAt,
      });
    }
  }

  const groupedCommunityMap = new Map();
  for (const post of communityPostsRaw) {
    if (!post.communityId || !communitySet.has(post.communityId)) continue;
    if (!groupedCommunityMap.has(post.communityId)) {
      groupedCommunityMap.set(post.communityId, {
        communityId: post.communityId,
        communityName: post.community?.name || "Community",
        posts: [],
      });
    }

    const typeLabel = mapPostType(post.type, (post.pollOptions || []).length > 0);
    if (typeLabel === "Poll" && !preference.enablePolls) continue;
    if (typeLabel === "Analysis" && !preference.enableArticles) continue;

    const item = groupedCommunityMap.get(post.communityId);
    if (item.posts.length < MAX_POSTS_PER_COMMUNITY) {
      item.posts.push({
        id: post.id,
        title: extractPostTitle(post),
        previewImage: pickPostPreviewImage(post),
        typeLabel,
        createdAt: post.createdAt,
      });
    }
  }

  const groupedArticlesMap = new Map();
  for (const article of followedArticlesRaw) {
    if (!followedSet.has(article.authorId)) continue;
    if (!groupedArticlesMap.has(article.authorId)) {
      groupedArticlesMap.set(article.authorId, {
        authorId: article.authorId,
        authorName: article.author?.name || article.author?.username || "Unknown",
        articles: [],
      });
    }
    const item = groupedArticlesMap.get(article.authorId);
    if (item.articles.length < MAX_POSTS_PER_FOLLOWED_USER) {
      item.articles.push({
        id: article.id,
        title: article.title || "Untitled article",
        createdAt: article.createdAt,
      });
    }
  }

  const groupedMessages = Array.from(groupedMessagesMap.values());
  const groupedFollowingPosts = Array.from(groupedFollowingMap.values());
  const groupedCommunityPosts = Array.from(groupedCommunityMap.values());
  const groupedArticles = Array.from(groupedArticlesMap.values());

  const followingPostsCount = groupedFollowingPosts.reduce((sum, group) => sum + group.posts.length, 0);
  const communityPostsCount = groupedCommunityPosts.reduce((sum, group) => sum + group.posts.length, 0);
  const allGroupedPosts = [...groupedFollowingPosts.flatMap((g) => g.posts), ...groupedCommunityPosts.flatMap((g) => g.posts)];

  return {
    groupedMessages,
    groupedFollowingPosts,
    groupedCommunityPosts,
    groupedArticles,
    summary: {
      messages: messages.length,
      followingPosts: followingPostsCount,
      communityPosts: communityPostsCount,
      articles: groupedArticles.reduce((sum, group) => sum + group.articles.length, 0),
      polls: allGroupedPosts.filter((post) => post.typeLabel === "Poll").length,
    },
  };
}

async function sendDigestForUser({ user, preference, transporters = [], platformBaseUrl }) {
  const { preference: preferenceDelegate, batch } = getDigestPrismaDelegates();
  const digest = await collectUserDigestData(user, preference);
  const summary = digest.summary;
  const activeTransporters = Array.isArray(transporters) && transporters.length > 0 ? transporters : createTransportersWithFallback();

  const hasDigestContent =
    summary.messages > 0 ||
    summary.followingPosts > 0 ||
    summary.communityPosts > 0 ||
    summary.articles > 0 ||
    summary.polls > 0;

  if (!hasDigestContent) {
    return { skipped: true, reason: "no-new-content" };
  }

  await sendMailWithRetry(activeTransporters, {
    from: process.env.EMAIL_FROM || DEFAULT_FROM,
    to: user.email,
    subject: buildDigestSubject(summary),
    context: {
      category: "digest",
      metadata: { userId: user.id, summary },
    },
    html: buildEmailHtml({
      user,
      summary,
      groupedMessages: digest.groupedMessages,
      groupedFollowingPosts: digest.groupedFollowingPosts,
      groupedCommunityPosts: digest.groupedCommunityPosts,
      groupedArticles: digest.groupedArticles,
      platformBaseUrl,
    }),
  });

  const notifiedAt = new Date();
  await prisma.$transaction([
    preferenceDelegate.update({
      where: { userId: user.id },
      data: {
        lastNotifiedAt: notifiedAt,
        lastDigestSentAt: notifiedAt,
      },
    }),
    batch.create({
      data: {
        userId: user.id,
        messagesCount: summary.messages,
        followingPostsCount: summary.followingPosts,
        communityPostsCount: summary.communityPosts,
        articlesCount: summary.articles,
        pollsCount: summary.polls,
      },
    }),
  ]);

  return { skipped: false, summary };
}

async function runDigestCycle() {
  if (!parseBooleanEnv(process.env.ENABLE_EMAIL_DIGEST, true)) return;

  const lockAcquired = await acquireDigestGlobalLock();
  if (!lockAcquired) {
    console.log("Digest cycle skipped: another node currently owns the global digest lock.");
    return;
  }

  try {
    getDigestPrismaDelegates();
  } catch (error) {
    console.error("Digest cycle disabled:", error.message);
    await releaseDigestGlobalLock();
    return;
  }

  try {
    const transporters = await filterHealthyTransporters(createTransportersWithFallback());
    if (transporters.length === 0) {
      console.error(
<<<<<<< ours
        "Digest cycle disabled: no healthy SMTP transporters. Check EMAIL_HOST/EMAIL_PORT connectivity, SMTP credentials, and outbound firewall/network rules."
=======
        "Digest cycle disabled: no healthy email transporters. Check SMTP connectivity/credentials, or configure Brevo API fallback via BREVO_API_KEY."
>>>>>>> theirs
      );
      return;
    }

    const platformBaseUrl = getPlatformBaseUrl();
    let cursorId = null;

    while (true) {
      const duePreferences = cursorId
        ? await prisma.$queryRawUnsafe(
            `
              SELECT
                p.id,
                p."userId",
                p.enabled,
                p."enableMessages",
                p."enableFollowingPosts",
                p."enableCommunityPosts",
                p."enableArticles",
                p."enablePolls",
                p."digestFrequencyMinutes",
                p."lastMessengerViewedAt",
                p."lastNotifiedAt",
                p."lastDigestSentAt",
                u.id AS "accountId",
                u.email,
                u.name,
                u.username
              FROM "EmailNotificationPreference" p
              JOIN "User" u ON u.id = p."userId"
              WHERE p.enabled = true
                AND u.email <> ''
                AND p.id > $2
                AND (
                  p."lastDigestSentAt" IS NULL
                  OR p."lastDigestSentAt" <= NOW() - (p."digestFrequencyMinutes" * INTERVAL '1 minute')
                )
              ORDER BY p.id ASC
              LIMIT $1
            `,
            DIGEST_USER_BATCH_SIZE,
            cursorId
          )
        : await prisma.$queryRawUnsafe(
            `
              SELECT
                p.id,
                p."userId",
                p.enabled,
                p."enableMessages",
                p."enableFollowingPosts",
                p."enableCommunityPosts",
                p."enableArticles",
                p."enablePolls",
                p."digestFrequencyMinutes",
                p."lastMessengerViewedAt",
                p."lastNotifiedAt",
                p."lastDigestSentAt",
                u.id AS "accountId",
                u.email,
                u.name,
                u.username
              FROM "EmailNotificationPreference" p
              JOIN "User" u ON u.id = p."userId"
              WHERE p.enabled = true
                AND u.email <> ''
                AND (
                  p."lastDigestSentAt" IS NULL
                  OR p."lastDigestSentAt" <= NOW() - (p."digestFrequencyMinutes" * INTERVAL '1 minute')
                )
              ORDER BY p.id ASC
              LIMIT $1
            `,
            DIGEST_USER_BATCH_SIZE
          );

      if (duePreferences.length === 0) break;

      for (let index = 0; index < duePreferences.length; index += DIGEST_SEND_CONCURRENCY) {
        const chunk = duePreferences.slice(index, index + DIGEST_SEND_CONCURRENCY);
        await Promise.all(
          chunk.map(async (preference) => {
            try {
              const user = {
                id: preference.accountId,
                email: preference.email,
                name: preference.name,
                username: preference.username,
              };
              if (!user?.email) return;

              await sendDigestForUser({ user, preference, transporters, platformBaseUrl });
            } catch (error) {
              console.error(`Digest failed for user ${preference.userId}:`, error.message);
            }
          })
        );
      }

      cursorId = duePreferences[duePreferences.length - 1].id;
      if (duePreferences.length < DIGEST_USER_BATCH_SIZE) break;
    }

    await sendWeeklyRecommendedPostEmails({ transporters, platformBaseUrl });
  } finally {
    await releaseDigestGlobalLock();
  }
}

async function sendWeeklyRecommendedPostEmails({ transporters, platformBaseUrl }) {
  if (!parseBooleanEnv(process.env.ENABLE_WEEKLY_RECOMMENDATION_EMAIL, true)) return;

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const topPost = await prisma.post.findFirst({
    where: {
      createdAt: { gte: weekAgo },
      status: "ACTIVE",
      communityId: null,
      type: { in: SUPPORTED_POST_TYPES },
    },
    include: {
      author: { select: { id: true, name: true, username: true } },
      pollOptions: { select: { id: true } },
      media: { select: { url: true, type: true } },
      _count: { select: { likes: true } },
    },
    orderBy: [{ likes: { _count: "desc" } }, { createdAt: "desc" }],
  });

  if (!topPost) return;

  const sentThisWeek = await prisma.notification.findMany({
    where: {
      type: "weekly_recommended_email_sent",
      createdAt: { gte: weekAgo },
    },
    select: { userId: true },
  });
  const sentUserIds = new Set(sentThisWeek.map((row) => row.userId));

  let cursorId = null;
  while (true) {
    const preferenceRows = await prisma.emailNotificationPreference.findMany({
      where: {
        enabled: true,
        user: { email: { not: "" } },
        ...(cursorId ? { id: { gt: cursorId } } : {}),
      },
      include: {
        user: { select: { id: true, email: true, name: true, username: true } },
      },
      orderBy: { id: "asc" },
      take: WEEKLY_RECOMMENDATION_BATCH_SIZE,
    });

    if (preferenceRows.length === 0) break;

    const targets = preferenceRows.filter((row) => !sentUserIds.has(row.userId));
    for (let index = 0; index < targets.length; index += DIGEST_SEND_CONCURRENCY) {
      const chunk = targets.slice(index, index + DIGEST_SEND_CONCURRENCY);
      await Promise.all(
        chunk.map(async (row) => {
          try {
            await sendMailWithRetry(transporters, {
              from: process.env.EMAIL_FROM || DEFAULT_FROM,
              to: row.user.email,
              subject: buildWeeklyRecommendationSubject(topPost),
              context: {
                category: "weekly_recommendation",
                metadata: { userId: row.userId, postId: topPost.id },
              },
              html: buildWeeklyRecommendationHtml({ user: row.user, post: topPost, platformBaseUrl }),
            });

            await prisma.notification.create({
              data: {
                userId: row.userId,
                type: "weekly_recommended_email_sent",
                content: `Weekly recommendation email sent for post ${topPost.id}`,
                link: `/posts/${topPost.id}`,
              },
            });
          } catch (error) {
            console.error(`Weekly recommendation email failed for user ${row.userId}:`, error.message);
          }
        })
      );
    }

    cursorId = preferenceRows[preferenceRows.length - 1].id;
    if (preferenceRows.length < WEEKLY_RECOMMENDATION_BATCH_SIZE) break;
  }
}

async function flushEventDigestQueue() {
  const queuedUserIds = Array.from(eventDigestQueue.values());
  eventDigestQueue.clear();
  eventDigestFlushTimer = null;
  if (queuedUserIds.length === 0) return;

  const lockAcquired = await acquireDigestGlobalLock();
  if (!lockAcquired) return;

  try {
    const transporters = await filterHealthyTransporters(createTransportersWithFallback());
    if (transporters.length === 0) return;
    const platformBaseUrl = getPlatformBaseUrl();

    const preferences = await prisma.emailNotificationPreference.findMany({
      where: {
        userId: { in: queuedUserIds },
        enabled: true,
        user: { email: { not: "" } },
      },
      include: {
        user: {
          select: { id: true, email: true, name: true, username: true },
        },
      },
    });

    for (let index = 0; index < preferences.length; index += DIGEST_SEND_CONCURRENCY) {
      const chunk = preferences.slice(index, index + DIGEST_SEND_CONCURRENCY);
      await Promise.all(
        chunk.map(async (preference) => {
          try {
            await sendDigestForUser({
              user: preference.user,
              preference,
              transporters,
              platformBaseUrl,
            });
          } catch (error) {
            console.error(`Event digest failed for user ${preference.userId}:`, error.message);
          }
        })
      );
    }
  } finally {
    await releaseDigestGlobalLock();
  }
}

function scheduleEventDigestFlush() {
  if (eventDigestFlushTimer) return;
  eventDigestFlushTimer = setTimeout(() => {
    flushEventDigestQueue().catch((error) => {
      console.error("Event digest flush failed:", error.message);
    });
  }, EVENT_DIGEST_DEBOUNCE_MS);
}

async function queueDigestForAuthorFollowers(authorId) {
  if (!authorId) return;
  if (!parseBooleanEnv(process.env.ENABLE_EMAIL_DIGEST, true)) return;

  const followers = await prisma.follows.findMany({
    where: { followingId: authorId },
    select: { followerId: true },
  });

  followers.forEach((row) => {
    if (row.followerId) eventDigestQueue.add(row.followerId);
  });

  scheduleEventDigestFlush();
}

function startDigestScheduler() {
  if (digestTimer) return digestTimer;

  digestTimer = setInterval(() => {
    runDigestCycle().catch((error) => {
      console.error("Digest cycle failed:", error.message);
    });
  }, getDigestIntervalMs());

  runDigestCycle().catch((error) => {
    console.error("Initial digest cycle failed:", error.message);
  });

  return digestTimer;
}

module.exports = {
  runDigestCycle,
  startDigestScheduler,
  getOrCreatePreference,
  queueDigestForAuthorFollowers,
  createTransportersWithFallback,
  filterHealthyTransporters,
  sendMailWithRetry,
  buildBrandedEmailShell,
  getPlatformBaseUrl,
  getEmailProvider,
};
