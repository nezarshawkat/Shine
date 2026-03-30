const prisma = require("../../prisma");
const {
  runDigestCycle,
  createTransportersWithFallback,
  filterHealthyTransporters,
  sendMailWithRetry,
  buildBrandedEmailShell,
  getPlatformBaseUrl,
  getEmailProvider,
} = require("../../services/notificationDigestService");

function boolFromEnv(value, fallback = false) {
  if (value === undefined) return fallback;
  return String(value).toLowerCase() === "true";
}

function smtpConfigHealth() {
  const required = {
    EMAIL_HOST: Boolean(process.env.EMAIL_HOST),
    EMAIL_PORT: Boolean(process.env.EMAIL_PORT),
    EMAIL_USER: Boolean(process.env.EMAIL_USER),
    EMAIL_PASS: Boolean(process.env.EMAIL_PASS),
    EMAIL_FROM: Boolean(process.env.EMAIL_FROM),
<<<<<<< ours
=======
    BREVO_API_KEY: Boolean(process.env.BREVO_API_KEY),
>>>>>>> theirs
  };

  const ready = Object.values(required).every(Boolean);
  return {
    provider: getEmailProvider(),
    ready,
    required,
    secure: Number(process.env.EMAIL_PORT || 587) === 465,
    digestEnabled: boolFromEnv(process.env.ENABLE_EMAIL_DIGEST, true),
    weeklyRecommendationEnabled: boolFromEnv(process.env.ENABLE_WEEKLY_RECOMMENDATION_EMAIL, true),
<<<<<<< ours
=======
    apiFallbackEnabled: boolFromEnv(process.env.EMAIL_ENABLE_API_FALLBACK, true),
>>>>>>> theirs
    digestIntervalMinutes: Math.max(5, Number(process.env.EMAIL_DIGEST_INTERVAL_MINUTES || 60)),
  };
}

function explainSystemState({ smtpHealth, transporterVerified, lastFailure }) {
  if (!smtpHealth.ready) {
    return "Email system is blocked: one or more SMTP environment keys are missing.";
  }
  if (!transporterVerified) {
    return "SMTP keys exist, but login/connection verification failed. Check credentials or firewall/port access.";
  }
  if (lastFailure) {
    return "Email system is active, but there were recent failures. Investigate the latest errors below.";
  }
  return "Email system is healthy. SMTP is connected and recent sends are succeeding.";
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
    ]);

    const smtpHealth = smtpConfigHealth();
    const lastFailure = lastLogs.find((row) => row.status === "failed");

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
        },
        categoryStats,
        recentLogs: lastLogs,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch email system overview" });
  }
}

async function sendAdminEmail(req, res) {
  try {
    const { to, subject, headline, message, ctaLabel, ctaUrl } = req.body || {};
    if (!to || !subject || !message) {
      return res.status(400).json({ error: "to, subject and message are required" });
    }

    const platformBaseUrl = getPlatformBaseUrl();
    const transporters = await filterHealthyTransporters(createTransportersWithFallback());
    if (transporters.length === 0) {
      return res.status(400).json({ error: "SMTP transporter is not healthy" });
    }

    const html = buildBrandedEmailShell({
      platformBaseUrl,
      title: headline || "Message from Shine Admin",
      subtitle: "Admin Broadcast",
      contentHtml: `<p style=\"margin:0;color:#334155;line-height:1.65;white-space:pre-wrap;\">${String(message)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")}</p>`,
      ctaHref: ctaUrl,
      ctaLabel,
    });

    await sendMailWithRetry(transporters, {
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
      context: {
        category: "admin_manual",
        metadata: { adminId: req.admin?.id || null, hasCta: Boolean(ctaLabel && ctaUrl) },
      },
    });

    return res.json({ ok: true });
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
};
