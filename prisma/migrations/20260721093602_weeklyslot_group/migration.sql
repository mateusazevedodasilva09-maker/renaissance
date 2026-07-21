-- AlterTable
ALTER TABLE "WeeklySlot" ADD COLUMN     "groupId" TEXT;

-- CreateIndex
CREATE INDEX "WeeklySlot_groupId_idx" ON "WeeklySlot"("groupId");

-- AddForeignKey
ALTER TABLE "WeeklySlot" ADD CONSTRAINT "WeeklySlot_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;
