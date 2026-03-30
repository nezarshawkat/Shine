-- CreateTable
CREATE TABLE "EmailDeliveryLog" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'digest',
    "status" TEXT NOT NULL,
    "toEmail" TEXT NOT NULL,
    "subject" TEXT,
    "provider" TEXT,
    "transporter" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailDeliveryLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailDeliveryLog_status_createdAt_idx" ON "EmailDeliveryLog"("status", "createdAt");

-- CreateIndex
CREATE INDEX "EmailDeliveryLog_category_createdAt_idx" ON "EmailDeliveryLog"("category", "createdAt");

-- CreateIndex
CREATE INDEX "EmailDeliveryLog_toEmail_createdAt_idx" ON "EmailDeliveryLog"("toEmail", "createdAt");
