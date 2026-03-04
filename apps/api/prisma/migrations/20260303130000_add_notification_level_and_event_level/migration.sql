-- AlterTable
ALTER TABLE "GlobalSettings" ADD COLUMN "notificationLevel" TEXT NOT NULL DEFAULT 'all';
ALTER TABLE "NotificationEvent" ADD COLUMN "level" TEXT NOT NULL DEFAULT 'info';
