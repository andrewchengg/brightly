/*
  Warnings:

  - You are about to drop the column `current_streak` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `last_activity_date` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `longest_streak` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `xp_points` on the `Student` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "PracticeSessionType" ADD VALUE 'WEEKLY_CHALLENGE';

-- AlterTable
ALTER TABLE "PracticeSession" ADD COLUMN     "challengeWeekIdentifier" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Student" DROP COLUMN "current_streak",
DROP COLUMN "last_activity_date",
DROP COLUMN "longest_streak",
DROP COLUMN "xp_points",
ADD COLUMN     "currentStreak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastActivityDate" TIMESTAMP(3),
ADD COLUMN     "longestStreak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "xpPoints" INTEGER NOT NULL DEFAULT 0;
