/**
 * Séance du jour — vue tablette du coach pendant le cours.
 *
 * Objectif : saisir ce qui est réellement soulevé (charge × reps + RPE) en
 * quelques taps par personne, sans ralentir la séance. Les exercices sont
 * pré-remplis depuis le programme du client ; la présence se marque d'un tap.
 */
import { getSession } from "@/lib/session";
import { listClients } from "@/modules/clients/client.service";
import { listSlots } from "@/modules/sessions/schedule.service";
import { WEEKDAYS } from "@/lib/dates";
import SessionLogger from "@/components/admin/SessionLogger";

export const dynamic = "force-dynamic";

export default async function SeanceDuJourPage() {
  const session = await getSession();
  // Un coach ne voit que les membres de ses groupes (même règle que /admin/clients).
  const coachUserId = session?.role === "COACH" ? session.userId : null;

  const [clients, slots] = await Promise.all([
    listClients({ activeOnly: true, coachUserId }),
    listSlots(),
  ]);

  // Jour actuel au format enum Prisma : getDay() renvoie 0 = dimanche,
  // notre énumération commence lundi → décalage de 6.
  const todayKey = WEEKDAYS[(new Date().getDay() + 6) % 7];
  const todaySlots = slots.filter((s) => s.weekday === todayKey && s.isActive);

  return (
    <SessionLogger
      clients={JSON.parse(JSON.stringify(clients))}
      todaySlots={JSON.parse(JSON.stringify(todaySlots))}
      todayKey={todayKey}
    />
  );
}
