-- CreateEnum
CREATE TYPE "PhotoPose" AS ENUM ('FRONT', 'SIDE', 'BACK');

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "availability" TEXT,
ADD COLUMN     "calorieTarget" INTEGER,
ADD COLUMN     "carbTargetG" INTEGER,
ADD COLUMN     "equipment" TEXT,
ADD COLUMN     "experienceNote" TEXT,
ADD COLUMN     "fatTargetG" INTEGER,
ADD COLUMN     "injuries" TEXT,
ADD COLUMN     "medicalNotes" TEXT,
ADD COLUMN     "proteinTargetG" INTEGER;

-- AlterTable
ALTER TABLE "Program" ADD COLUMN     "isTemplate" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "StrengthLog" ADD COLUMN     "rpe" INTEGER;

-- CreateTable
CREATE TABLE "BodyMeasurement" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "weightKg" DOUBLE PRECISION,
    "bodyFatPct" DOUBLE PRECISION,
    "neckCm" DOUBLE PRECISION,
    "shouldersCm" DOUBLE PRECISION,
    "chestCm" DOUBLE PRECISION,
    "waistCm" DOUBLE PRECISION,
    "hipsCm" DOUBLE PRECISION,
    "armCm" DOUBLE PRECISION,
    "thighCm" DOUBLE PRECISION,
    "calfCm" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientId" TEXT NOT NULL,

    CONSTRAINT "BodyMeasurement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgressPhoto" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pose" "PhotoPose" NOT NULL DEFAULT 'FRONT',
    "url" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientId" TEXT NOT NULL,

    CONSTRAINT "ProgressPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientNote" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clientId" TEXT NOT NULL,
    "authorId" TEXT,

    CONSTRAINT "ClientNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BodyMeasurement_clientId_date_idx" ON "BodyMeasurement"("clientId", "date");

-- CreateIndex
CREATE INDEX "ProgressPhoto_clientId_date_idx" ON "ProgressPhoto"("clientId", "date");

-- CreateIndex
CREATE INDEX "ClientNote_clientId_createdAt_idx" ON "ClientNote"("clientId", "createdAt");

-- AddForeignKey
ALTER TABLE "BodyMeasurement" ADD CONSTRAINT "BodyMeasurement_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressPhoto" ADD CONSTRAINT "ProgressPhoto_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientNote" ADD CONSTRAINT "ClientNote_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientNote" ADD CONSTRAINT "ClientNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
