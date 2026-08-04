-- Copie en clair du mot de passe (affichage admin ; auth reste sur passwordHash)
ALTER TABLE "User" ADD COLUMN "plainPassword" TEXT;
