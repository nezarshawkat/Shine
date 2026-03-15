-- Admin dashboard schema extension
CREATE TYPE "AdminStatus" AS ENUM ('ACTIVE', 'SUSPENDED');
CREATE TYPE "ReportType" AS ENUM ('POST', 'COMMUNITY', 'PROFILE');
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'RESOLVED', 'ACTIONED');

ALTER TABLE "Post"
  ADD COLUMN IF NOT EXISTS "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "moderationStatus" TEXT NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE "Article"
  ADD COLUMN IF NOT EXISTS "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "moderationStatus" TEXT NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE "Event"
  ADD COLUMN IF NOT EXISTS "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "moderationStatus" TEXT NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE "Community"
  ADD COLUMN IF NOT EXISTS "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "moderationStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS "Admin" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "password" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'ADMIN',
  "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "status" "AdminStatus" NOT NULL DEFAULT 'ACTIVE',
  "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
  "twoFactorSecret" TEXT,
  "allowedIps" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "lastLoginAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Admin_email_key" ON "Admin"("email");

CREATE TABLE IF NOT EXISTS "Report" (
  "id" TEXT NOT NULL,
  "type" "ReportType" NOT NULL,
  "reporterId" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "details" TEXT,
  "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
  "actionTaken" TEXT,
  "resolvedByAdminId" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Report_type_status_idx" ON "Report"("type", "status");
CREATE INDEX IF NOT EXISTS "Report_targetId_idx" ON "Report"("targetId");

CREATE TABLE IF NOT EXISTS "AnalyticsCache" (
  "id" TEXT NOT NULL,
  "metricGroup" TEXT NOT NULL,
  "metricKey" TEXT NOT NULL,
  "metricLabel" TEXT NOT NULL,
  "metricValue" DOUBLE PRECISION NOT NULL,
  "trendData" JSONB,
  "metadata" JSONB,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AnalyticsCache_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AnalyticsCache_metricGroup_timestamp_idx" ON "AnalyticsCache"("metricGroup", "timestamp");

CREATE TABLE IF NOT EXISTS "AdminAuditLog" (
  "id" TEXT NOT NULL,
  "adminId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AdminAuditLog_adminId_createdAt_idx" ON "AdminAuditLog"("adminId", "createdAt");

ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_resolvedByAdminId_fkey" FOREIGN KEY ("resolvedByAdminId") REFERENCES "Admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
