/*
  Warnings:

  - You are about to drop the `WeeklyQuest` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "QuestRarity" AS ENUM ('COMMON', 'UNCOMMON', 'RARE', 'EPIC');

-- DropForeignKey
ALTER TABLE "WeeklyQuest" DROP CONSTRAINT "WeeklyQuest_studentId_fkey";

-- DropTable
DROP TABLE "WeeklyQuest";

-- CreateTable
CREATE TABLE "Quest" (
    "id" TEXT NOT NULL,
    "questType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "baseTarget" INTEGER NOT NULL,
    "targetFormula" TEXT,
    "icon" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "category" "WeeklyQuestCategory" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "minLevel" INTEGER NOT NULL DEFAULT 1,
    "maxLevel" INTEGER,
    "rarity" "QuestRarity" NOT NULL DEFAULT 'COMMON',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentQuest" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "questId" TEXT NOT NULL,
    "target" INTEGER NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentQuest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Quest_questType_key" ON "Quest"("questType");

-- CreateIndex
CREATE INDEX "StudentQuest_studentId_weekStart_idx" ON "StudentQuest"("studentId", "weekStart");

-- CreateIndex
CREATE INDEX "StudentQuest_weekStart_weekEnd_idx" ON "StudentQuest"("weekStart", "weekEnd");

-- CreateIndex
CREATE INDEX "StudentQuest_questId_idx" ON "StudentQuest"("questId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentQuest_studentId_questId_weekStart_key" ON "StudentQuest"("studentId", "questId", "weekStart");

-- AddForeignKey
ALTER TABLE "StudentQuest" ADD CONSTRAINT "StudentQuest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentQuest" ADD CONSTRAINT "StudentQuest_questId_fkey" FOREIGN KEY ("questId") REFERENCES "Quest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
