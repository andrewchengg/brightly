-- AlterTable
ALTER TABLE "StudentUploadedQuestion" ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "requiresImage" BOOLEAN NOT NULL DEFAULT false;
