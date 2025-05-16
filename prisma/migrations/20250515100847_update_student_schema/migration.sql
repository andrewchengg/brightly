/*
  Warnings:

  - You are about to drop the column `address` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `bloodType` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `sex` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `surname` on the `Student` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Student" DROP CONSTRAINT "Student_classId_fkey";

-- DropForeignKey
ALTER TABLE "Student" DROP CONSTRAINT "Student_gradeId_fkey";

-- DropForeignKey
ALTER TABLE "Student" DROP CONSTRAINT "Student_parentId_fkey";

-- AlterTable
ALTER TABLE "Student" DROP COLUMN "address",
DROP COLUMN "bloodType",
DROP COLUMN "sex",
DROP COLUMN "surname",
ADD COLUMN     "schoolLevel" INTEGER,
ADD COLUMN     "schoolName" TEXT,
ALTER COLUMN "img" DROP NOT NULL,
ALTER COLUMN "parentId" DROP NOT NULL,
ALTER COLUMN "classId" DROP NOT NULL,
ALTER COLUMN "gradeId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE SET NULL ON UPDATE CASCADE;
