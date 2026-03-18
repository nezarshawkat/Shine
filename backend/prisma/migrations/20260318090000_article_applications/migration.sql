-- CreateTable
CREATE TABLE "ArticleApplication" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "introduction" TEXT NOT NULL,
    "workSample" TEXT NOT NULL,
    "socialLink" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArticleApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ArticleApplication_userId_key" ON "ArticleApplication"("userId");

-- CreateIndex
CREATE INDEX "ArticleApplication_status_createdAt_idx" ON "ArticleApplication"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "ArticleApplication" ADD CONSTRAINT "ArticleApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
