-- CreateTable
CREATE TABLE "SessionTypeExercise" (
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "sets" INTEGER NOT NULL DEFAULT 3,
    "reps" TEXT NOT NULL DEFAULT '10',
    "restSec" INTEGER,
    "sessionTypeId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,

    CONSTRAINT "SessionTypeExercise_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SessionTypeExercise_sessionTypeId_idx" ON "SessionTypeExercise"("sessionTypeId");

-- AddForeignKey
ALTER TABLE "SessionTypeExercise" ADD CONSTRAINT "SessionTypeExercise_sessionTypeId_fkey" FOREIGN KEY ("sessionTypeId") REFERENCES "SessionType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionTypeExercise" ADD CONSTRAINT "SessionTypeExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
