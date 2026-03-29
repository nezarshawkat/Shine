const nodemailer = require("nodemailer");
const prisma = require("../prisma");

const DEFAULT_FROM = "Shine Notifications <notifications@sshine.org>";
const DEFAULT_INTERVAL_MINUTES = 60;
const MAX_MESSAGE_PREVIEW_PER_CHAT = 5;
const MAX_POSTS_PER_FOLLOWED_USER = 3;
const MAX_POSTS_PER_COMMUNITY = 3;
const SUPPORTED_POST_TYPES = ["opinion", "analysis", "critique", "poll"];

let digestTimer = null;

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

function createTransporter() {
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
  });
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

function buildDigestSubject(summary) {
  const segments = [];
  if (summary.messages > 0) segments.push(`${summary.messages} new messages`);
  if (summary.followingPosts > 0) segments.push(`${summary.followingPosts} followed posts`);
  if (summary.communityPosts > 0) segments.push(`${summary.communityPosts} community posts`);
  if (summary.articles > 0) segments.push(`${summary.articles} articles`);
  if (summary.polls > 0) segments.push(`${summary.polls} polls`);

  return segments.length > 0 ? `Your Shine digest: ${segments.join(" · ")}` : "Your Shine digest";
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

  return `
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="680" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 8px 24px rgba(15,23,42,0.08);">
            <tr>
              <td style="background:#112f5d;padding:20px 24px;color:#ffffff;">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;">
                  <div>
                    <div style="font-size:24px;font-weight:800;letter-spacing:0.3px;">Shine</div>
                    <div style="font-size:12px;opacity:0.9;">Professional Activity Digest</div>
                  </div>
                  <img src="${platformBaseUrl}/assets/shine-logo.png" alt="ShineLogo" style="height:42px;width:auto;object-fit:contain;background:#fff;border-radius:8px;padding:4px;" />
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 24px 4px 24px;">
                <h2 style="margin:0;color:#112f5d;">Hello ${escapeHtml(user.name || user.username)},</h2>
                <p style="margin:8px 0 0 0;color:#334155;">You have ${summary.messages} new messages, ${summary.followingPosts} new posts from followed users, and ${summary.communityPosts} new community posts.</p>
                <p style="margin:4px 0 0 0;color:#334155;">Articles: ${summary.articles} · Polls: ${summary.polls}</p>
              </td>
            </tr>
            ${
              groupedMessages.length > 0
                ? `<tr>
              <td style="padding:16px 24px 0 24px;">
                <h3 style="margin:0 0 12px 0;color:#112f5d;">Messenger updates</h3>
                ${messageSections}
                <a href="${platformBaseUrl}/messenger" style="display:inline-block;background:#facc15;color:#112f5d;text-decoration:none;font-weight:700;padding:10px 16px;border-radius:999px;">View all messages</a>
              </td>
            </tr>`
                : ""
            }
            ${
              groupedFollowingPosts.length > 0
                ? `<tr>
              <td style="padding:24px 24px 0 24px;">
                <h3 style="margin:0 0 12px 0;color:#112f5d;">New posts from people you follow</h3>
                ${followingSections}
                <a href="${platformBaseUrl}/feed/following" style="display:inline-block;background:#facc15;color:#112f5d;text-decoration:none;font-weight:700;padding:10px 16px;border-radius:999px;">View all followed posts</a>
              </td>
            </tr>`
                : ""
            }
            ${
              groupedArticles.length > 0
                ? `<tr>
              <td style="padding:24px 24px 0 24px;">
                <h3 style="margin:0 0 12px 0;color:#112f5d;">New articles</h3>
                ${articleSections}
                <a href="${platformBaseUrl}/articles" style="display:inline-block;background:#facc15;color:#112f5d;text-decoration:none;font-weight:700;padding:10px 16px;border-radius:999px;">View all articles</a>
              </td>
            </tr>`
                : ""
            }
            ${
              groupedCommunityPosts.length > 0
                ? `<tr>
              <td style="padding:24px 24px 0 24px;">
                <h3 style="margin:0 0 12px 0;color:#112f5d;">Community activity</h3>
                ${communitySections}
                <a href="${platformBaseUrl}/communities" style="display:inline-block;background:#facc15;color:#112f5d;text-decoration:none;font-weight:700;padding:10px 16px;border-radius:999px;">View all communities</a>
              </td>
            </tr>`
                : ""
            }
            <tr>
              <td style="padding:24px;color:#64748b;font-size:12px;">Manage your digest preferences in Settings → Notifications.</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
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
  const existing = await prisma.emailNotificationPreference.findUnique({ where: { userId } });
  if (existing) return existing;

  return prisma.emailNotificationPreference.create({
    data: {
      userId,
      digestFrequencyMinutes: Number(process.env.EMAIL_DIGEST_INTERVAL_MINUTES || DEFAULT_INTERVAL_MINUTES),
      lastNotifiedAt: new Date(0),
    },
  });
}

async function collectUserDigestData(user, preference) {
  const since = preference.lastNotifiedAt || new Date(0);
  const messageSince = preference.lastMessengerViewedAt && preference.lastMessengerViewedAt > since ? preference.lastMessengerViewedAt : since;

  const [messages, followingPostsRaw, communityPostsRaw, followedArticlesRaw, followedUserIds, joinedCommunityIds] =
    await Promise.all([
    preference.enableMessages
      ? prisma.message.findMany({
          where: { receiverId: user.id, isRead: false, createdAt: { gt: messageSince } },
          include: { sender: { select: { id: true, name: true, username: true } } },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    preference.enableFollowingPosts
      ? prisma.post.findMany({
          where: { createdAt: { gt: since }, communityId: null, status: "ACTIVE", type: { in: SUPPORTED_POST_TYPES } },
          include: { author: { select: { id: true, name: true, username: true } }, pollOptions: { select: { id: true } } },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    preference.enableCommunityPosts
      ? prisma.post.findMany({
          where: { createdAt: { gt: since }, communityId: { not: null }, status: "ACTIVE", type: { in: SUPPORTED_POST_TYPES } },
          include: {
            community: { select: { id: true, name: true } },
            author: { select: { id: true, username: true } },
            pollOptions: { select: { id: true } },
          },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
      preference.enableArticles
        ? prisma.article.findMany({
            where: { createdAt: { gt: since } },
            include: { author: { select: { id: true, name: true, username: true } } },
            orderBy: { createdAt: "desc" },
          })
        : Promise.resolve([]),
      preference.enableFollowingPosts || preference.enableArticles
      ? prisma.follows.findMany({ where: { followerId: user.id }, select: { followingId: true } })
      : Promise.resolve([]),
    preference.enableCommunityPosts
      ? prisma.communityMember.findMany({ where: { userId: user.id }, select: { communityId: true } })
      : Promise.resolve([]),
  ]);

  const followedSet = new Set(followedUserIds.map((f) => f.followingId));
  const communitySet = new Set(joinedCommunityIds.map((c) => c.communityId));

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

async function sendDigestForUser({ user, preference, transporter, platformBaseUrl }) {
  const digest = await collectUserDigestData(user, preference);
  const summary = digest.summary;

  if (summary.messages === 0 && summary.followingPosts === 0 && summary.communityPosts === 0) {
    return { skipped: true, reason: "no-new-content" };
  }

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || DEFAULT_FROM,
    to: user.email,
    subject: buildDigestSubject(summary),
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
    prisma.emailNotificationPreference.update({
      where: { userId: user.id },
      data: {
        lastNotifiedAt: notifiedAt,
        lastDigestSentAt: notifiedAt,
      },
    }),
    prisma.emailNotificationBatch.create({
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

  const transporter = createTransporter();
  const platformBaseUrl = getPlatformBaseUrl();

  const users = await prisma.user.findMany({
    where: { email: { not: "" } },
    select: { id: true, email: true, name: true, username: true },
  });

  for (const user of users) {
    try {
      const preference = await getOrCreatePreference(user.id);
      if (!preference.enabled) continue;

      const minutesSinceLastDigest = (Date.now() - new Date(preference.lastDigestSentAt || 0).getTime()) / 60000;
      if (minutesSinceLastDigest < preference.digestFrequencyMinutes) continue;

      await sendDigestForUser({ user, preference, transporter, platformBaseUrl });
    } catch (error) {
      console.error(`Digest failed for user ${user.id}:`, error.message);
    }
  }
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
};
