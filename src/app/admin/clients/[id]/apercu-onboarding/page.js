/**
 * Aperçu admin de toutes les étapes d'onboarding d'un client (lecture seule).
 * Montre chaque écran que le client traverse (inscription → choix → appel →
 * fiche → attente → accès) et met en évidence l'étape où il se trouve.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getClient } from "@/modules/clients/client.service";
import { getUpcomingAppointmentForClient } from "@/modules/agenda/appointment.service";
import OnboardingPreview from "@/components/admin/OnboardingPreview";
import Icon from "@/components/Icon";

export const dynamic = "force-dynamic";

export default async function ApercuOnboardingPage({ params }) {
  const session = await getSession();
  const client = await getClient(params.id);
  if (session?.role === "COACH" && client.group?.coachId !== session.userId) {
    redirect("/admin/clients");
  }

  const appointment = await getUpcomingAppointmentForClient(client.id);

  // Détermine l'étape courante réelle du client dans le tunnel.
  let currentStep = "register";
  if (client.enrolled) currentStep = "dashboard";
  else if (client.onboardingMeasurementsDone) currentStep = "waiting";
  else if (appointment) currentStep = "call";
  else currentStep = "hub";

  return (
    <div>
      <div className="alert alert-success mb">
        <Icon name="eye" /> Étapes d&apos;onboarding de <strong>{client.user.firstName} {client.user.lastName}</strong> (lecture seule).
        Étape actuelle marquée d&apos;un point.{" "}
        <Link href={`/admin/clients/${client.id}`} style={{ fontWeight: 600 }}><Icon name="arrow-left" /> Retour à la fiche</Link>
      </div>
      <OnboardingPreview currentStep={currentStep} />
    </div>
  );
}
