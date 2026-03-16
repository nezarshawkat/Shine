-- Add details message to events
ALTER TABLE "Event"
ADD COLUMN IF NOT EXISTS "detailsMessage" TEXT;

-- Participation table to prevent duplicate event joins per user
CREATE TABLE IF NOT EXISTS "EventParticipation" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EventParticipation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EventParticipation_eventId_userId_key"
  ON "EventParticipation"("eventId", "userId");

CREATE INDEX IF NOT EXISTS "EventParticipation_userId_idx"
  ON "EventParticipation"("userId");

CREATE INDEX IF NOT EXISTS "EventParticipation_eventId_idx"
  ON "EventParticipation"("eventId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'EventParticipation_eventId_fkey'
  ) THEN
    ALTER TABLE "EventParticipation"
      ADD CONSTRAINT "EventParticipation_eventId_fkey"
      FOREIGN KEY ("eventId") REFERENCES "Event"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'EventParticipation_userId_fkey'
  ) THEN
    ALTER TABLE "EventParticipation"
      ADD CONSTRAINT "EventParticipation_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
