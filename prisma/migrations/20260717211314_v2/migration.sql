/*
  Warnings:

  - You are about to drop the column `expectations` on the `Prospect` table. All the data in the column will be lost.
  - You are about to drop the column `objectives` on the `Prospect` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ProspectSource" ADD VALUE 'SOCIAL_MEDIA';
ALTER TYPE "ProspectSource" ADD VALUE 'WORD_OF_MOUTH';
ALTER TYPE "ProspectSource" ADD VALUE 'FLYER';

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "activityLevel" TEXT,
ADD COLUMN     "age" INTEGER,
ADD COLUMN     "bodyType" TEXT,
ADD COLUMN     "dietPreferences" TEXT,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "groupId" TEXT,
ADD COLUMN     "heightCm" INTEGER,
ADD COLUMN     "lifestyle" TEXT,
ADD COLUMN     "objectiveDeadline" TIMESTAMP(3),
ADD COLUMN     "sportLevel" TEXT,
ADD COLUMN     "startWeightKg" DOUBLE PRECISION,
ADD COLUMN     "targetWeightKg" DOUBLE PRECISION,
ADD COLUMN     "weeklyRateKg" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Prospect" DROP COLUMN "expectations",
DROP COLUMN "objectives",
ADD COLUMN     "goalId" TEXT,
ADD COLUMN     "nextActionAt" TIMESTAMP(3),
ADD COLUMN     "nextActionLabel" TEXT,
ADD COLUMN     "priority" "Priority" NOT NULL DEFAULT 'NORMAL';

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "category" TEXT,
ADD COLUMN     "priority" "Priority" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN     "progress" INTEGER;

-- AlterTable
ALTER TABLE "WeeklyMetric" ADD COLUMN     "coachComment" TEXT;

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 7,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "goalId" TEXT,
    "coachId" TEXT,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrengthLog" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "reps" INTEGER NOT NULL,
    "isPR" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,

    CONSTRAINT "StrengthLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardioLog" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "distanceKm" DOUBLE PRECISION,
    "paceMinPerKm" DOUBLE PRECISION,
    "avgHeartRate" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientId" TEXT NOT NULL,

    CONSTRAINT "CardioLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "present" BOOLEAN NOT NULL DEFAULT true,
    "label" TEXT,
    "clientId" TEXT NOT NULL,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedbackMessage" (
    "id" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3),
    "content" TEXT NOT NULL,
    "coachReply" TEXT,
    "repliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientId" TEXT NOT NULL,

    CONSTRAINT "FeedbackMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyAdvice" (
    "id" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "groupId" TEXT,
    "clientId" TEXT,
    "authorId" TEXT,

    CONSTRAINT "WeeklyAdvice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StrengthLog_clientId_exerciseId_date_idx" ON "StrengthLog"("clientId", "exerciseId", "date");

-- CreateIndex
CREATE INDEX "CardioLog_clientId_date_idx" ON "CardioLog"("clientId", "date");

-- CreateIndex
CREATE INDEX "Attendance_clientId_date_idx" ON "Attendance"("clientId", "date");

-- CreateIndex
CREATE INDEX "FeedbackMessage_clientId_createdAt_idx" ON "FeedbackMessage"("clientId", "createdAt");

-- CreateIndex
CREATE INDEX "WeeklyAdvice_weekStart_idx" ON "WeeklyAdvice"("weekStart");

-- AddForeignKey
ALTER TABLE "Prospect" ADD CONSTRAINT "Prospect_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrengthLog" ADD CONSTRAINT "StrengthLog_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrengthLog" ADD CONSTRAINT "StrengthLog_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardioLog" ADD CONSTRAINT "CardioLog_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackMessage" ADD CONSTRAINT "FeedbackMessage_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyAdvice" ADD CONSTRAINT "WeeklyAdvice_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyAdvice" ADD CONSTRAINT "WeeklyAdvice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyAdvice" ADD CONSTRAINT "WeeklyAdvice_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
