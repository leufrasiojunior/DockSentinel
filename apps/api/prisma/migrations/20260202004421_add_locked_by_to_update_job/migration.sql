-- AlterTable
ALTER TABLE "UpdateJob" ADD COLUMN "lockedBy" TEXT;

-- CreateIndex
CREATE INDEX "UpdateJob_status_createdAt_idx" ON "UpdateJob"("status", "createdAt");

-- CreateIndex
CREATE INDEX "UpdateJob_lockedAt_idx" ON "UpdateJob"("lockedAt");
