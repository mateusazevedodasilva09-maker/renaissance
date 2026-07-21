-- Valeurs forcées manuellement sur la fiche client (priment sur le calcul auto).
ALTER TABLE "Client"
  ADD COLUMN "manualWeightKg" DOUBLE PRECISION,
  ADD COLUMN "manualBmi" DOUBLE PRECISION,
  ADD COLUMN "manualBmr" INTEGER,
  ADD COLUMN "manualTdee" INTEGER;

-- Un programme peut désormais être rattaché à un objectif (programme de groupe)
-- au lieu d'un client : « objectif = groupe = programme ».
ALTER TABLE "Program" ALTER COLUMN "clientId" DROP NOT NULL;
ALTER TABLE "Program" ADD COLUMN "goalId" TEXT;

-- Clé étrangère Program.goalId -> Goal.id
ALTER TABLE "Program"
  ADD CONSTRAINT "Program_goalId_fkey"
  FOREIGN KEY ("goalId") REFERENCES "Goal"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
