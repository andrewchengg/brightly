/*
  Warnings:

  - You are about to drop the column `imageUrl` on the `StudentUploadedQuestion` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "StudentUploadedQuestion" DROP COLUMN "imageUrl";

-- CreateIndex
CREATE INDEX "StudentUploadedQuestion_studentId_subjectId_idx" ON "StudentUploadedQuestion"("studentId", "subjectId");
