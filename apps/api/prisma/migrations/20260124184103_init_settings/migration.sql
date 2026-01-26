-- CreateTable
CREATE TABLE "GlobalSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "authMode" TEXT NOT NULL DEFAULT 'none',
    "adminPasswordHash" TEXT,
    "totpSecretEnc" TEXT,
    "logLevel" TEXT NOT NULL DEFAULT 'info',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
