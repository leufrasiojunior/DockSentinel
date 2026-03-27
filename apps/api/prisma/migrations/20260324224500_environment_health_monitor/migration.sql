ALTER TABLE "GlobalSettings"
ADD COLUMN "environmentHealthcheckIntervalMin" INTEGER NOT NULL DEFAULT 5;

ALTER TABLE "Environment"
ADD COLUMN "connectivityStatus" TEXT NOT NULL DEFAULT 'unknown';

ALTER TABLE "Environment"
ADD COLUMN "offlineNotifiedAt" DATETIME;

UPDATE "Environment"
SET "connectivityStatus" = CASE
  WHEN "id" = 'local' THEN 'online'
  WHEN "lastError" IS NULL AND "lastSeenAt" IS NOT NULL THEN 'online'
  WHEN "lastError" IS NOT NULL THEN 'offline'
  ELSE 'unknown'
END;
