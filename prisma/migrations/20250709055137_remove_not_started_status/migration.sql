/*
  Warnings:

  - The values [NOT_STARTED] on the enum `PracticeSessionStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PracticeSessionStatus_new" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'PAUSED', 'ABANDONED', 'TIMED_OUT', 'FORCE_CLOSED', 'CLEANUP_PENDING', 'CLEANED_UP');
ALTER TABLE "PracticeSession" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "PracticeSession" ALTER COLUMN "status" TYPE "PracticeSessionStatus_new" USING ("status"::text::"PracticeSessionStatus_new");
ALTER TYPE "PracticeSessionStatus" RENAME TO "PracticeSessionStatus_old";
ALTER TYPE "PracticeSessionStatus_new" RENAME TO "PracticeSessionStatus";
DROP TYPE "PracticeSessionStatus_old";
ALTER TABLE "PracticeSession" ALTER COLUMN "status" SET DEFAULT 'IN_PROGRESS';
COMMIT;

-- AlterTable
ALTER TABLE "PracticeSession" ALTER COLUMN "status" SET DEFAULT 'IN_PROGRESS';
