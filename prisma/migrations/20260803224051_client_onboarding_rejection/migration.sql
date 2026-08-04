-- Motif de refus d'onboarding (message affiché au client)
ALTER TABLE "Client" ADD COLUMN "onboardingRejectionReason" TEXT;
