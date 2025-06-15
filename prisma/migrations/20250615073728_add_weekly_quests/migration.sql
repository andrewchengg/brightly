-- CreateEnum
CREATE TYPE "WeeklyQuestCategory" AS ENUM ('CORE', 'SUBJECT', 'CONSISTENCY', 'CHALLENGE', 'PERFORMANCE', 'SOCIAL', 'LEARNING');

-- CreateTable
CREATE TABLE "WeeklyQuest" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "questType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "target" INTEGER NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekEnd" TIMESTAMP(3) NOT NULL,
    "icon" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "category" "WeeklyQuestCategory" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyQuest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WeeklyQuest_studentId_weekStart_idx" ON "WeeklyQuest"("studentId", "weekStart");

-- CreateIndex
CREATE INDEX "WeeklyQuest_weekStart_weekEnd_idx" ON "WeeklyQuest"("weekStart", "weekEnd");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyQuest_studentId_questType_weekStart_key" ON "WeeklyQuest"("studentId", "questType", "weekStart");

-- AddForeignKey
ALTER TABLE "WeeklyQuest" ADD CONSTRAINT "WeeklyQuest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
