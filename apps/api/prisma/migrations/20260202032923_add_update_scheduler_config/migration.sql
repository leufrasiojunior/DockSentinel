-- CreateTable
CREATE TABLE "UpdateSchedulerConfig" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "cronExpr" TEXT NOT NULL DEFAULT '*/5 * * * *',
    "mode" TEXT NOT NULL DEFAULT 'scan_only',
    "scope" TEXT NOT NULL DEFAULT 'all',
    "scanLabelKey" TEXT NOT NULL DEFAULT 'docksentinel.scan',
    "updateLabelKey" TEXT NOT NULL DEFAULT 'docksentinel.update',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
