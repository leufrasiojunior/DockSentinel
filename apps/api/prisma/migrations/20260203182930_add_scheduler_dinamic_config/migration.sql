-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_UpdateSchedulerConfig" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
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
INSERT INTO "new_UpdateSchedulerConfig" ("createdAt", "cronExpr", "enabled", "id", "mode", "scanLabelKey", "scope", "updateLabelKey", "updatedAt") SELECT "createdAt", "cronExpr", "enabled", "id", "mode", "scanLabelKey", "scope", "updateLabelKey", "updatedAt" FROM "UpdateSchedulerConfig";
DROP TABLE "UpdateSchedulerConfig";
ALTER TABLE "new_UpdateSchedulerConfig" RENAME TO "UpdateSchedulerConfig";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
