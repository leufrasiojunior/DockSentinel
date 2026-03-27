ALTER TABLE "Environment" ADD COLUMN "pendingBootstrapTokenEnc" TEXT;
ALTER TABLE "Environment" ADD COLUMN "rotationState" TEXT NOT NULL DEFAULT 'paired';

UPDATE "Environment"
SET "rotationState" = 'paired'
WHERE "rotationState" IS NULL OR TRIM("rotationState") = '';
