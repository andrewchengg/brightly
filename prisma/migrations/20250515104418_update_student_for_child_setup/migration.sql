/*
  Warnings:

  - Made the column `schoolLevel` on table `Student` required. This step will fail if there are existing NULL values in that column.

*/
-- Update existing NULL schoolLevel values to 1
UPDATE "Student" SET "schoolLevel" = 1 WHERE "schoolLevel" IS NULL;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "initialSetupComplete" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "schoolLevel" SET NOT NULL;
