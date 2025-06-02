/*
  Warnings:

  - Made the column `productionReady` on table `Question` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ALTER COLUMN "productionReady" SET NOT NULL;

-- CreateTable
CREATE TABLE "ArchivedOriginalQuestion" (
    "id" SERIAL NOT NULL,
    "liveQuestionId" INTEGER NOT NULL,
    "pdfPageNumber" INTEGER NOT NULL,
    "questionNumberOnPage" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "questionType" "QuestionType" NOT NULL,
    "options" JSONB,
    "correctAnswer" JSONB,
    "answerKeyRawText" TEXT,
    "explanation" TEXT,
    "hint" TEXT,
    "marks" INTEGER,
    "difficulty" "DifficultyLevel" NOT NULL,
    "pointsAwarded" INTEGER NOT NULL,
    "subjectId" INTEGER NOT NULL,
    "topicId" INTEGER NOT NULL,
    "questionGroupId" INTEGER,
    "imageUrl" TEXT,
    "fullPageImageUrl" TEXT,
    "audioUrl" TEXT,
    "sourceYear" INTEGER,
    "sourceLevel" TEXT,
    "sourceSchool" TEXT,
    "sourceAssessmentType" TEXT,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArchivedOriginalQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ArchivedOriginalQuestion_liveQuestionId_key" ON "ArchivedOriginalQuestion"("liveQuestionId");

-- AddForeignKey
ALTER TABLE "ArchivedOriginalQuestion" ADD CONSTRAINT "ArchivedOriginalQuestion_liveQuestionId_fkey" FOREIGN KEY ("liveQuestionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchivedOriginalQuestion" ADD CONSTRAINT "ArchivedOriginalQuestion_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchivedOriginalQuestion" ADD CONSTRAINT "ArchivedOriginalQuestion_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchivedOriginalQuestion" ADD CONSTRAINT "ArchivedOriginalQuestion_questionGroupId_fkey" FOREIGN KEY ("questionGroupId") REFERENCES "QuestionGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
