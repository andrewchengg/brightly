-- CreateEnum
CREATE TYPE "OralPromptType" AS ENUM ('PASSAGE_READING', 'PICTURE_CONVERSATION', 'VIDEO_CONVERSATION');

-- CreateTable
CREATE TABLE "OralPrompt" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "subjectId" INTEGER NOT NULL,
    "topicId" INTEGER,
    "promptType" "OralPromptType" NOT NULL,
    "description" TEXT,
    "studentInstructions" TEXT,
    "imageUrl" TEXT,
    "videoUrl" TEXT,
    "guidingQuestions" JSONB,
    "passageText" TEXT,
    "difficulty" "DifficultyLevel" DEFAULT 'MEDIUM',
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "estimatedTimeSeconds" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "productionReady" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "OralPrompt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OralPracticeAttempt" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "oralPromptId" INTEGER NOT NULL,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "audioRecordingUrl" TEXT,
    "transcription" TEXT,
    "aiFeedback" JSONB,
    "teacherFeedback" TEXT,
    "score" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OralPracticeAttempt_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "OralPrompt" ADD CONSTRAINT "OralPrompt_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OralPrompt" ADD CONSTRAINT "OralPrompt_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OralPracticeAttempt" ADD CONSTRAINT "OralPracticeAttempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OralPracticeAttempt" ADD CONSTRAINT "OralPracticeAttempt_oralPromptId_fkey" FOREIGN KEY ("oralPromptId") REFERENCES "OralPrompt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
