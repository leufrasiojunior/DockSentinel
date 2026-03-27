CREATE TABLE "Environment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseUrl" TEXT,
    "agentTokenEnc" TEXT,
    "agentVersion" TEXT,
    "dockerVersion" TEXT,
    "lastSeenAt" DATETIME,
    "lastError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE INDEX "Environment_kind_createdAt_idx" ON "Environment"("kind", "createdAt" DESC);
CREATE INDEX "Environment_name_idx" ON "Environment"("name");

INSERT INTO "Environment" ("id", "kind", "name", "createdAt", "updatedAt")
VALUES ('local', 'local', 'Local', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

ALTER TABLE "NotificationEvent" ADD COLUMN "environmentId" TEXT NOT NULL DEFAULT 'local';
ALTER TABLE "NotificationEvent" ADD COLUMN "environmentName" TEXT NOT NULL DEFAULT 'Local';
CREATE INDEX "NotificationEvent_environmentId_createdAt_idx" ON "NotificationEvent"("environmentId", "createdAt" DESC);

ALTER TABLE "UpdateJob" ADD COLUMN "environmentId" TEXT NOT NULL DEFAULT 'local';
ALTER TABLE "UpdateJob" ADD COLUMN "environmentName" TEXT NOT NULL DEFAULT 'Local';
CREATE INDEX "UpdateJob_environmentId_status_createdAt_idx" ON "UpdateJob"("environmentId", "status", "createdAt");

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_UpdateSchedulerConfig" (
    "environmentId" TEXT NOT NULL PRIMARY KEY,
    "environmentName" TEXT NOT NULL DEFAULT 'Local',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "cronExpr" TEXT NOT NULL DEFAULT '*/5 * * * *',
    "mode" TEXT NOT NULL DEFAULT 'scan_only',
    "scope" TEXT NOT NULL DEFAULT 'all',
    "scanLabelKey" TEXT NOT NULL DEFAULT 'docksentinel.scan',
    "updateLabelKey" TEXT NOT NULL DEFAULT 'docksentinel.update',
    "lastRunAt" DATETIME,
    "running" BOOLEAN NOT NULL DEFAULT false,
    "lockedAt" DATETIME,
    "lockedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "new_UpdateSchedulerConfig" (
    "environmentId",
    "environmentName",
    "enabled",
    "cronExpr",
    "mode",
    "scope",
    "scanLabelKey",
    "updateLabelKey",
    "lastRunAt",
    "running",
    "lockedAt",
    "lockedBy",
    "createdAt",
    "updatedAt"
)
SELECT
    'local',
    'Local',
    "enabled",
    "cronExpr",
    "mode",
    "scope",
    "scanLabelKey",
    "updateLabelKey",
    "lastRunAt",
    "running",
    "lockedAt",
    "lockedBy",
    "createdAt",
    "updatedAt"
FROM "UpdateSchedulerConfig";

DROP TABLE "UpdateSchedulerConfig";
ALTER TABLE "new_UpdateSchedulerConfig" RENAME TO "UpdateSchedulerConfig";

INSERT INTO "UpdateSchedulerConfig" (
    "environmentId",
    "environmentName",
    "createdAt",
    "updatedAt"
)
SELECT 'local', 'Local', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1
    FROM "UpdateSchedulerConfig"
    WHERE "environmentId" = 'local'
);

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
