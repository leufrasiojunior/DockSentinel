-- AlterTable
ALTER TABLE "GlobalSettings" ADD COLUMN "notificationsInAppEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "GlobalSettings" ADD COLUMN "notificationsEmailEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "GlobalSettings" ADD COLUMN "notificationRecipientEmail" TEXT;
ALTER TABLE "GlobalSettings" ADD COLUMN "smtpHost" TEXT;
ALTER TABLE "GlobalSettings" ADD COLUMN "smtpPort" INTEGER;
ALTER TABLE "GlobalSettings" ADD COLUMN "smtpSecureMode" TEXT NOT NULL DEFAULT 'starttls';
ALTER TABLE "GlobalSettings" ADD COLUMN "smtpUsername" TEXT;
ALTER TABLE "GlobalSettings" ADD COLUMN "smtpPasswordEnc" TEXT;
ALTER TABLE "GlobalSettings" ADD COLUMN "smtpFromName" TEXT;
ALTER TABLE "GlobalSettings" ADD COLUMN "smtpFromEmail" TEXT;

-- CreateTable
CREATE TABLE "NotificationEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'in_app',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "payloadJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "NotificationEvent_createdAt_idx" ON "NotificationEvent"("createdAt" DESC);
CREATE INDEX "NotificationEvent_id_idx" ON "NotificationEvent"("id");
