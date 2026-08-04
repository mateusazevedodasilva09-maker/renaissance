-- Ajoute la source APP (auto-inscription depuis l'application)
ALTER TYPE "ProspectSource" ADD VALUE IF NOT EXISTS 'APP';
