/*
  Warnings:

  - You are about to drop the column `score` on the `PracticeSession` table. All the data in the column will be lost.
  - You are about to drop the column `practiceSessionId` on the `ChatSession` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "PracticeSession" DROP COLUMN "score";

-- AlterTable
ALTER TABLE "ChatSession" DROP COLUMN "practiceSessionId"; 