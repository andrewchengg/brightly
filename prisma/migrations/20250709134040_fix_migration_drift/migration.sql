-- Fix Migration Drift
-- This migration adds all the changes that were applied via db push but not tracked in migrations

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED');

-- AlterEnum
ALTER TYPE "PracticeSessionStatus" ADD VALUE 'ABANDONED';
ALTER TYPE "PracticeSessionStatus" ADD VALUE 'TIMED_OUT';
ALTER TYPE "PracticeSessionStatus" ADD VALUE 'FORCE_CLOSED';
ALTER TYPE "PracticeSessionStatus" ADD VALUE 'CLEANUP_PENDING';
ALTER TYPE "PracticeSessionStatus" ADD VALUE 'CLEANED_UP';

-- CreateTable
CREATE TABLE "SubjectPlan" (
    "id" SERIAL NOT NULL,
    "subjectId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "monthlyPrice" DECIMAL(10,2) NOT NULL,
    "yearlyPrice" DECIMAL(10,2),
    "features" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubjectPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubjectSubscription" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "subjectPlanId" INTEGER NOT NULL,
    "studentIds" TEXT[],
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3) NOT NULL,
    "nextBillingDate" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "stripeSubscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubjectSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentHistory" (
    "id" TEXT NOT NULL,
    "subjectSubscriptionId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL,
    "stripePaymentIntentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentHistory_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "PracticeSession" ADD COLUMN "lastActivityAt" TIMESTAMP(3);
ALTER TABLE "PracticeSession" ADD COLUMN "lastHeartbeatAt" TIMESTAMP(3);
ALTER TABLE "PracticeSession" ADD COLUMN "gracePeriodStarted" TIMESTAMP(3);
ALTER TABLE "PracticeSession" ADD COLUMN "gracePeriodEnds" TIMESTAMP(3);
ALTER TABLE "PracticeSession" ADD COLUMN "abandonedAt" TIMESTAMP(3);
ALTER TABLE "PracticeSession" ADD COLUMN "cleanupAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PracticeSession" ADD COLUMN "cleanupCompletedAt" TIMESTAMP(3);
ALTER TABLE "PracticeSession" ADD COLUMN "isMarkedForCleanup" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "SubjectPlan_subjectId_key" ON "SubjectPlan"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "SubjectSubscription_parentId_subjectPlanId_key" ON "SubjectSubscription"("parentId", "subjectPlanId");

-- CreateIndex
CREATE INDEX "PracticeSession_studentId_status_idx" ON "PracticeSession"("studentId", "status");

-- CreateIndex
CREATE INDEX "PracticeSession_studentId_lastActivityAt_idx" ON "PracticeSession"("studentId", "lastActivityAt");

-- CreateIndex
CREATE INDEX "PracticeSession_status_lastActivityAt_idx" ON "PracticeSession"("status", "lastActivityAt");

-- CreateIndex
CREATE INDEX "PracticeSession_isMarkedForCleanup_gracePeriodEnds_idx" ON "PracticeSession"("isMarkedForCleanup", "gracePeriodEnds");

-- CreateIndex
CREATE INDEX "PracticeSession_status_gracePeriodEnds_idx" ON "PracticeSession"("status", "gracePeriodEnds");

-- AddForeignKey
ALTER TABLE "SubjectPlan" ADD CONSTRAINT "SubjectPlan_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectSubscription" ADD CONSTRAINT "SubjectSubscription_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectSubscription" ADD CONSTRAINT "SubjectSubscription_subjectPlanId_fkey" FOREIGN KEY ("subjectPlanId") REFERENCES "SubjectPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentHistory" ADD CONSTRAINT "PaymentHistory_subjectSubscriptionId_fkey" FOREIGN KEY ("subjectSubscriptionId") REFERENCES "SubjectSubscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE; 