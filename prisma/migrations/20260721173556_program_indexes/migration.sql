-- CreateIndex
CREATE INDEX "Program_clientId_status_idx" ON "Program"("clientId", "status");

-- CreateIndex
CREATE INDEX "Program_goalId_status_idx" ON "Program"("goalId", "status");
