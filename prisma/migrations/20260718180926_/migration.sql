/*
  Warnings:

  - A unique constraint covering the columns `[externalId]` on the table `Exercise` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Exercise" ADD COLUMN     "bodyPart" TEXT,
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "gifUrl" TEXT,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "target" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Exercise_externalId_key" ON "Exercise"("externalId");
