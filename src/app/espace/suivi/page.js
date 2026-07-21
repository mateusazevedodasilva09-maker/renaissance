/**
 * Espace client — suivi complet : mesures hebdo, force (PR), cardio,
 * présence, bilans et conseil du coach.
 */
import { getSession } from "@/lib/session";
import { getClientByUserId } from "@/modules/clients/client.service";
import { listMetrics } from "@/modules/tracking/metric.service";
import {
  listStrengthLogs,
  listCardioLogs,
  listAttendances,
  presenceRate,
} from "@/modules/tracking/performance.service";
import { getAdviceForClient } from "@/modules/clients/advice.service";
import { listMeasurements } from "@/modules/tracking/body.service";
import { computeMetabolism, computeMacroTargets, effectiveMacroTargets } from "@/modules/clients/nutrition";
import TrackingView from "@/components/espace/TrackingView";
import BodyMeasurements from "@/components/espace/BodyMeasurements";

export const dynamic = "force-dynamic";

export default async function SuiviPage() {
  const session = await getSession();
  const client = await getClientByUserId(session.userId);
  const [metrics, strengthLogs, cardioLogs, attendances, rate, advice, measurements] = await Promise.all([
    listMetrics(client.id),
    listStrengthLogs(client.id),
    listCardioLogs(client.id),
    listAttendances(client.id),
    presenceRate(client.id),
    getAdviceForClient(client),
    listMeasurements(client.id),
  ]);
  // Cible nutrition (macros) : même calcul que la fiche coach, à partir du
  // dernier poids connu — les valeurs forcées par le coach priment.
  const lastWeight =
    client.manualWeightKg ??
    ([...metrics].reverse().find((m) => m.weightKg != null)?.weightKg ?? client.startWeightKg);
  const tdee =
    client.manualTdee ??
    computeMetabolism({
      gender: client.gender,
      age: client.age,
      heightCm: client.heightCm,
      weightKg: lastWeight,
      activityLevel: client.activityLevel,
    })?.active ?? null;
  const nutrition = effectiveMacroTargets(
    client,
    computeMacroTargets({ tdee, weightKg: lastWeight, weeklyRateKg: client.weeklyRateKg })
  );

  return (
    <>
      <TrackingView
        nutrition={nutrition}
        initialMetrics={JSON.parse(JSON.stringify(metrics))}
        strengthLogs={JSON.parse(JSON.stringify(strengthLogs))}
        cardioLogs={JSON.parse(JSON.stringify(cardioLogs))}
        attendances={JSON.parse(JSON.stringify(attendances))}
        presenceRate={rate}
        advice={advice ? JSON.parse(JSON.stringify(advice)) : null}
      />
      {/* Mensurations renseignées par le client (étape d'onboarding). */}
      <BodyMeasurements
        initialMeasurements={JSON.parse(JSON.stringify(measurements))}
        onboardingDone={!!client.onboardingMeasurementsDone}
      />
    </>
  );
}
