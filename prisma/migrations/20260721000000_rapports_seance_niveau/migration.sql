-- CreateEnum
CREATE TYPE "SessionRating" AS ENUM ('BON', 'NEUTRE', 'MAUVAIS');

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "level" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "onboardingMeasurementsDone" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "SessionReport" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "rating" "SessionRating" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientId" TEXT NOT NULL,
    "sessionTypeId" TEXT,
    "authorId" TEXT,
    "strengthLogId" TEXT,

    CONSTRAINT "SessionReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyLevelChange" (
    "id" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientId" TEXT NOT NULL,

    CONSTRAINT "WeeklyLevelChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SessionReport_strengthLogId_key" ON "SessionReport"("strengthLogId");

-- CreateIndex
CREATE INDEX "SessionReport_clientId_date_idx" ON "SessionReport"("clientId", "date");

-- CreateIndex
CREATE INDEX "SessionReport_clientId_weekStart_idx" ON "SessionReport"("clientId", "weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyLevelChange_clientId_weekStart_key" ON "WeeklyLevelChange"("clientId", "weekStart");

-- AddForeignKey
ALTER TABLE "SessionReport" ADD CONSTRAINT "SessionReport_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionReport" ADD CONSTRAINT "SessionReport_sessionTypeId_fkey" FOREIGN KEY ("sessionTypeId") REFERENCES "SessionType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionReport" ADD CONSTRAINT "SessionReport_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionReport" ADD CONSTRAINT "SessionReport_strengthLogId_fkey" FOREIGN KEY ("strengthLogId") REFERENCES "StrengthLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyLevelChange" ADD CONSTRAINT "WeeklyLevelChange_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
