PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_GlobalSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "authMode" TEXT NOT NULL DEFAULT 'none',
    "adminPasswordHash" TEXT,
    "totpSecretEnc" TEXT,
    "logLevel" TEXT NOT NULL DEFAULT 'info',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "new_GlobalSettings" (
    "id",
    "authMode",
    "adminPasswordHash",
    "totpSecretEnc",
    "logLevel",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    "authMode",
    "adminPasswordHash",
    "totpSecretEnc",
    "logLevel",
    "createdAt",
    "updatedAt"
FROM "GlobalSettings";

DROP TABLE "GlobalSettings";
ALTER TABLE "new_GlobalSettings" RENAME TO "GlobalSettings";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
