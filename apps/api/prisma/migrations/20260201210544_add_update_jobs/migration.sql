-- CreateTable
CREATE TABLE "UpdateJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL,
    "container" TEXT NOT NULL,
    "image" TEXT,
    "force" BOOLEAN NOT NULL DEFAULT false,
    "pull" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    "resultJson" TEXT,
    "error" TEXT,
    "lockedAt" DATETIME
);
