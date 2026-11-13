CREATE TABLE IF NOT EXISTS "RegistryCredential" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "serverAddress" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordEnc" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "RegistryCredential_serverAddress_key" ON "RegistryCredential"("serverAddress");
CREATE INDEX IF NOT EXISTS "RegistryCredential_enabled_idx" ON "RegistryCredential"("enabled");
