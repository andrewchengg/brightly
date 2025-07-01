-- AlterTable
ALTER TABLE "StudentUploadedQuestion" ADD COLUMN     "cropCoordinates" JSONB,
ADD COLUMN     "diagramUrl" TEXT,
ADD COLUMN     "hasDiagram" BOOLEAN NOT NULL DEFAULT false;
