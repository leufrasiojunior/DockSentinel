-- AlterTable
ALTER TABLE "GlobalSettings" ADD COLUMN "notificationReadRetentionDays" INTEGER NOT NULL DEFAULT 15;
ALTER TABLE "GlobalSettings" ADD COLUMN "notificationUnreadRetentionDays" INTEGER NOT NULL DEFAULT 60;

ALTER TABLE "NotificationEvent" ADD COLUMN "readAt" DATETIME;

-- CreateIndex
CREATE INDEX "NotificationEvent_readAt_idx" ON "NotificationEvent"("readAt");
