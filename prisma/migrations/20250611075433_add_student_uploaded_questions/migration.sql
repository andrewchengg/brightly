-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED', 'NEEDS_REVIEW');

-- CreateTable
CREATE TABLE "StudentUploadedQuestion" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "originalFileName" TEXT,
    "imageUrl" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "questionType" "QuestionType" NOT NULL DEFAULT 'MULTIPLE_CHOICE',
    "options" JSONB,
    "correctAnswer" JSONB,
    "explanation" TEXT,
    "hint" TEXT,
    "difficulty" "DifficultyLevel" NOT NULL DEFAULT 'MEDIUM',
    "subjectId" INTEGER,
    "topicId" INTEGER,
    "processingStatus" "ProcessingStatus" NOT NULL DEFAULT 'PROCESSING',
    "ocrText" TEXT,
    "aiProcessingLog" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentUploadedQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentUploadedQuestion_studentId_createdAt_idx" ON "StudentUploadedQuestion"("studentId", "createdAt");

-- AddForeignKey
ALTER TABLE "StudentUploadedQuestion" ADD CONSTRAINT "StudentUploadedQuestion_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentUploadedQuestion" ADD CONSTRAINT "StudentUploadedQuestion_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentUploadedQuestion" ADD CONSTRAINT "StudentUploadedQuestion_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;
