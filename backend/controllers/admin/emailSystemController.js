const prisma = require("../../prisma");
const {
  runDigestCycle,
  createTransportersWithFallback,
  filterHealthyTransporters,
  sendMailWithRetry,
  buildBrandedEmailShell,
  getPlatformBaseUrl,
  getEmailProvider,
  pauseDigestScheduler,
  resumeDigestScheduler,
  getDigestRuntimeState,
} = require("../../services/notificationDigestService");

function boolFromEnv(value, fallback = false) {
  if (value === undefined) return fallback;
  return String(value).toLowerCase() === "true";
}

function smtpConfigHealth() {
  const smtpRequired = {
    EMAIL_HOST: Boolean(process.env.EMAIL_HOST),
    EMAIL_PORT: Boolean(process.env.EMAIL_PORT),
    EMAIL_USER: Boolean(process.env.EMAIL_USER),
    EMAIL_PASS: Boolean(process.env.EMAIL_PASS),
    EMAIL_FROM: Boolean(process.env.EMAIL_FROM),
  };
  const apiFallbackRequired = {
    BREVO_API_KEY: Boolean(process.env.BREVO_API_KEY),
  };

  const provider = getEmailProvider();
  const smtpReady = Object.values(smtpRequired).every(Boolean);
  const apiReady = Object.values(apiFallbackRequired).every(Boolean) && Boolean(process.env.EMAIL_FROM || process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER);
  const ready = provider === "brevo_api" ? apiReady : smtpReady;
  return {
    provider,
    ready,
    required: smtpRequired,
    apiFallbackRequired,
    smtpReady,
    apiReady,
    secure: Number(process.env.EMAIL_PORT || 587) === 465,
    digestEnabled: boolFromEnv(process.env.ENABLE_EMAIL_DIGEST, true),
    weeklyRecommendationEnabled: boolFromEnv(process.env.ENABLE_WEEKLY_RECOMMENDATION_EMAIL, true),
    apiFallbackEnabled: boolFromEnv(process.env.EMAIL_ENABLE_API_FALLBACK, true),
    digestIntervalMinutes: Math.max(5, Number(process.env.EMAIL_DIGEST_INTERVAL_MINUTES || 60)),
    apiFallbackProvider: "Brevo API",
  };
}

const EMAIL_SEGMENTS = [
  { key: "all_active_users", label: "All users with email" },
  { key: "new_users_7d", label: "New users (last 7 days)" },
  { key: "new_users_30d", label: "New users (last 30 days)" },
  { key: "inactive_14d", label: "Haven't been online lately (14+ days)" },
  { key: "inactive_30d", label: "Very inactive users (30+ days)" },
  { key: "digest_subscribers", label: "Digest subscribers" },
  { key: "weekly_reco_enabled", label: "Weekly recommendation enabled" },
  { key: "supporters", label: "Supporters only" },
  { key: "authors_with_posts", label: "Creators with at least one post" },
  { key: "article_authors", label: "Article writers" },
  { key: "community_admins", label: "Community admins" },
  { key: "highly_engaged_7d", label: "Highly engaged users (likes/comments last 7 days)" },
];

async function fetchSegmentEmails(segmentKey) {
  const selectDistinctEmails = async (where) => {
    const users = await prisma.user.findMany({
      where: { ...where, email: { not: "" } },
      select: { email: true },
      take: 10000,
    });
    return users.map((u) => u.email);
  };

  switch (segmentKey) {
    case "all_active_users":
      return selectDistinctEmails({});
    case "new_users_7d":
      return selectDistinctEmails({ createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } });
    case "new_users_30d":
      return selectDistinctEmails({ createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } });
    case "inactive_14d":
      return selectDistinctEmails({
        OR: [
          { emailNotificationPreference: { is: null } },
          { emailNotificationPreference: { lastNotifiedAt: { lte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) } } },
        ],
      });
    case "inactive_30d":
      return selectDistinctEmails({
        OR: [
          { emailNotificationPreference: { is: null } },
          { emailNotificationPreference: { lastNotifiedAt: { lte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
        ],
      });
    case "digest_subscribers": {
      const rows = await prisma.emailNotificationPreference.findMany({
        where: { enabled: true, user: { email: { not: "" } } },
        select: { user: { select: { email: true } } },
        take: 10000,
      });
      return rows.map((row) => row.user.email);
    }
    case "weekly_reco_enabled":
      return parseBooleanEnv(process.env.ENABLE_WEEKLY_RECOMMENDATION_EMAIL, true) ? selectDistinctEmails({}) : [];
    case "supporters":
      return selectDistinctEmails({ isSupporter: true });
    case "authors_with_posts":
      return selectDistinctEmails({ posts: { some: {} } });
    case "article_authors":
      return selectDistinctEmails({ articles: { some: {} } });
    case "community_admins":
      return selectDistinctEmails({ memberships: { some: { role: { in: ["MAIN_ADMIN", "ADMIN"] } } } });
    case "highly_engaged_7d":
      return selectDistinctEmails({
        OR: [
          { comments: { some: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } } },
          { posts: { some: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } } },
          { articles: { some: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } } },
        ],
      });
    default:
      return [];
  }
}

function parseBooleanEnv(value, fallback = false) {
  if (value === undefined) return fallback;
  return String(value).toLowerCase() === "true";
}

function parseRecipientList(to) {
  return String(to || "")
    .split(/[,\n;]+/)
    .map((email) => email.trim())
    .filter(Boolean);
}

function dedupeEmails(emails = []) {
  return Array.from(new Set(emails.map((email) => String(email).toLowerCase())));
}

function buildAdminLivePreview({ platformBaseUrl, headline, message, ctaLabel, ctaUrl }) {
  return buildBrandedEmailShell({
    platformBaseUrl,
    title: headline || "Message from Shine Admin",
    subtitle: "Admin Broadcast",
    contentHtml: `<p style=\"margin:0;color:#334155;line-height:1.65;white-space:pre-wrap;\">${String(message || "Write your message to preview it live.")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")}</p>`,
    ctaHref: ctaUrl,
    ctaLabel,
  });
}

function explainSystemState({ smtpHealth, transporterVerified, lastFailure }) {
  if (!smtpHealth.ready) {
    return "Email system is blocked: required environment keys for the selected provider are missing.";
  }
  if (!transporterVerified) {
    return "Provider keys exist, but delivery verification failed. Check credentials and network access.";
  }
  if (lastFailure) {
    return "Email system is active, but there were recent failures. Investigate the latest errors below.";
  }
  return "Email system is healthy. Delivery provider is connected and recent sends are succeeding.";
}

async function getEmailSystemOverview(req, res) {
  try {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    let transporterVerified = false;
    try {
      const healthyTransporters = await filterHealthyTransporters(createTransportersWithFallback());
      transporterVerified = healthyTransporters.length > 0;
    } catch (error) {
      transporterVerified = false;
    }

    const [
      totalSent,
      totalFailed,
      sent24h,
      failed24h,
      sent7d,
      failed7d,
      lastLogs,
      categoryStats,
      recentBatches,
      pendingDigestUsers,
      preferenceCount,
      sectionAudienceRows,
    ] = await Promise.all([
      prisma.emailDeliveryLog.count({ where: { status: "sent" } }),
      prisma.emailDeliveryLog.count({ where: { status: "failed" } }),
      prisma.emailDeliveryLog.count({ where: { status: "sent", createdAt: { gte: since24h } } }),
      prisma.emailDeliveryLog.count({ where: { status: "failed", createdAt: { gte: since24h } } }),
      prisma.emailDeliveryLog.count({ where: { status: "sent", createdAt: { gte: since7d } } }),
      prisma.emailDeliveryLog.count({ where: { status: "failed", createdAt: { gte: since7d } } }),
      prisma.emailDeliveryLog.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
      prisma.emailDeliveryLog.groupBy({ by: ["category", "status"], _count: true }),
      prisma.emailNotificationBatch.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
      prisma.$queryRaw`
        SELECT COUNT(*)::int AS count
        FROM "EmailNotificationPreference" p
        JOIN "User" u ON u.id = p."userId"
        WHERE p.enabled = true
          AND u.email <> ''
          AND (
            p."lastDigestSentAt" IS NULL
            OR p."lastDigestSentAt" <= NOW() - (p."digestFrequencyMinutes" * INTERVAL '1 minute')
          )
      `,
      prisma.emailNotificationPreference.count({ where: { enabled: true } }),
      prisma.$queryRaw`
        SELECT
          COALESCE(SUM(CASE WHEN b."messagesCount" > 0 THEN 1 ELSE 0 END), 0)::int AS messages,
          COALESCE(SUM(CASE WHEN b."followingPostsCount" > 0 THEN 1 ELSE 0 END), 0)::int AS following_posts,
          COALESCE(SUM(CASE WHEN b."communityPostsCount" > 0 THEN 1 ELSE 0 END), 0)::int AS community_posts,
          COALESCE(SUM(CASE WHEN b."articlesCount" > 0 THEN 1 ELSE 0 END), 0)::int AS articles,
          COALESCE(SUM(CASE WHEN b."pollsCount" > 0 THEN 1 ELSE 0 END), 0)::int AS polls
        FROM "EmailNotificationBatch" b
        WHERE b."createdAt" >= NOW() - INTERVAL '24 hour'
      `,
    ]);

    const smtpHealth = smtpConfigHealth();
    const lastFailure = lastLogs.find((row) => row.status === "failed");

    const sectionAudiences = await Promise.all(
      EMAIL_SEGMENTS.map(async (segment) => {
        const emails = await fetchSegmentEmails(segment.key);
        return { ...segment, userCount: emails.length };
      })
    );

    const runtime = getDigestRuntimeState();
    const sectionAudience = sectionAudienceRows?.[0] || {};

    return res.json({
      data: {
        statusText: explainSystemState({ smtpHealth, transporterVerified, lastFailure }),
        smtpHealth: { ...smtpHealth, transporterVerified },
        counters: {
          totalSent,
          totalFailed,
          sent24h,
          failed24h,
          sent7d,
          failed7d,
          successRate24h: sent24h + failed24h > 0 ? Number(((sent24h / (sent24h + failed24h)) * 100).toFixed(1)) : 100,
        },
        digest: {
          activePreferenceCount: preferenceCount,
          pendingUsers: pendingDigestUsers?.[0]?.count || 0,
          recentBatchCount: recentBatches.length,
          recentBatchVolume: recentBatches.reduce((sum, batch) => sum + batch.messagesCount + batch.followingPostsCount + batch.communityPostsCount + batch.articlesCount + batch.pollsCount, 0),
          runtime,
          algorithmSatisfied24h: {
            messages: Number(sectionAudience.messages || 0),
            followingPosts: Number(sectionAudience.following_posts || 0),
            communityPosts: Number(sectionAudience.community_posts || 0),
            articles: Number(sectionAudience.articles || 0),
            polls: Number(sectionAudience.polls || 0),
          },
        },
        sections: sectionAudiences,
        categoryStats,
        recentLogs: lastLogs,
        templatePreviews: {
          digest: buildBrandedEmailShell({
            platformBaseUrl: getPlatformBaseUrl(),
            title: "Hello Alex, here's your Shine digest",
            subtitle: "Professional Activity Digest",
            introHtml: "<p style='margin:8px 0 0 0;color:#334155;'>You have 3 new messages, 5 followed-user posts and 2 community posts.</p>",
            contentHtml: "<p style='color:#334155;'>Digest sections render here based on each user's preferences.</p>",
            ctaHref: `${getPlatformBaseUrl()}/feed`,
            ctaLabel: "Open Shine",
          }),
          weekly: buildBrandedEmailShell({
            platformBaseUrl: getPlatformBaseUrl(),
            title: "Hello Alex, your weekly pick is here",
            subtitle: "Shine Weekly Pick",
            contentHtml: "<p style='color:#334155;'>This week’s most-liked forum post is ready for you.</p>",
            ctaHref: `${getPlatformBaseUrl()}/feed`,
            ctaLabel: "Open feed",
          }),
          admin: buildAdminLivePreview({ platformBaseUrl: getPlatformBaseUrl(), headline: "", message: "", ctaLabel: "", ctaUrl: "" }),
        },
      },
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch email system overview" });
  }
}

async function sendAdminEmail(req, res) {
  try {
    const { to, subject, headline, message, ctaLabel, ctaUrl, sectionKeys = [] } = req.body || {};
    if (!subject || !message) {
      return res.status(400).json({ error: "subject and message are required" });
    }

    const platformBaseUrl = getPlatformBaseUrl();
    const transporters = await filterHealthyTransporters(createTransportersWithFallback());
    if (transporters.length === 0) {
      return res.status(400).json({ error: "SMTP transporter is not healthy" });
    }

    const sectionTargets = await Promise.all(
      (Array.isArray(sectionKeys) ? sectionKeys : []).map(async (sectionKey) => ({
        sectionKey,
        emails: await fetchSegmentEmails(sectionKey),
      }))
    );
    const manualTargets = parseRecipientList(to);
    const allTargets = dedupeEmails([...manualTargets, ...sectionTargets.flatMap((group) => group.emails)]);
    if (allTargets.length === 0) {
      return res.status(400).json({ error: "Provide recipients or select at least one section." });
    }

    const html = buildAdminLivePreview({ platformBaseUrl, headline, message, ctaLabel, ctaUrl });
    const perChunk = Math.max(10, Number(process.env.ADMIN_EMAIL_SEND_CONCURRENCY || 35));
    const batches = [];

    for (let i = 0; i < allTargets.length; i += perChunk) {
      batches.push(allTargets.slice(i, i + perChunk));
    }

    for (const batch of batches) {
      await Promise.all(
        batch.map((recipient) =>
          sendMailWithRetry(transporters, {
            from: process.env.EMAIL_FROM,
            to: recipient,
            subject,
            html,
            context: {
              category: "admin_manual",
              metadata: {
                adminId: req.admin?.id || null,
                hasCta: Boolean(ctaLabel && ctaUrl),
                sectionKeys,
              },
            },
          })
        )
      );
    }

    return res.json({ ok: true, sent: allTargets.length });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to send admin email" });
  }
}

async function triggerDigestNow(req, res) {
  runDigestCycle().catch((error) => {
    console.error("Admin-triggered digest failed:", error.message);
  });

  return res.json({
    ok: true,
    message: "Digest run started in the background. Refresh stats in a minute to see updated counters.",
  });
}

module.exports = {
  getEmailSystemOverview,
  sendAdminEmail,
  triggerDigestNow,
  async updateDigestSchedulerState(req, res) {
    const { action } = req.body || {};
    if (action === "pause") pauseDigestScheduler();
    else if (action === "resume") resumeDigestScheduler();
    else return res.status(400).json({ error: "action must be pause or resume" });
    return res.json({ ok: true, runtime: getDigestRuntimeState() });
  },
  async getAdminEmailPreview(req, res) {
    const { headline, message, ctaLabel, ctaUrl } = req.body || {};
    return res.json({
      data: {
        html: buildAdminLivePreview({
          platformBaseUrl: getPlatformBaseUrl(),
          headline,
          message,
          ctaLabel,
          ctaUrl,
        }),
      },
    });
  },
};
