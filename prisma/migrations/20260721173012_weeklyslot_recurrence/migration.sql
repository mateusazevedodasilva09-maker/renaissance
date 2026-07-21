-- AlterTable
ALTER TABLE "WeeklySlot" ADD COLUMN     "oneOff" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "startDate" TIMESTAMP(3);
