-- CreateIndex
CREATE INDEX "StudentAnswer_practiceSessionId_idx" ON "StudentAnswer"("practiceSessionId");

-- CreateIndex
CREATE INDEX "StudentAnswer_questionId_idx" ON "StudentAnswer"("questionId");

-- CreateIndex
CREATE INDEX "StudentAnswer_attemptedAt_idx" ON "StudentAnswer"("attemptedAt");
