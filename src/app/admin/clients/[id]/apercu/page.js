/**
 * Aperçu de l'espace client, vu par le coach/admin :
 * exactement ce que le client voit dans « Mon suivi » et « Mes séances »,
 * en lecture seule.
 */
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getClient } from "@/modules/clients/client.service";
import { listMetrics } from "@/modules/tracking/metric.service";
import {
  listStrengthLogs,
  listCardioLogs,
  listAttendances,
  presenceRate,
} from "@/modules/tracking/performance.service";
import { getAdviceForClient } from "@/modules/clients/advice.service";
import { getClientWeeklySchedule } from "@/modules/sessions/schedule.service";
import { getActiveProgramForClient } from "@/modules/programs/program.service";
import { WEEKDAYS, WEEKDAY_LABELS } from "@/lib/dates";
import TrackingView from "@/components/espace/TrackingView";
import SessionSlotCard from "@/components/SessionSlotCard";
import ProgramSessionCard from "@/components/espace/ProgramSessionCard";
import Icon from "@/components/Icon";

export const dynamic = "force-dynamic";

export default async function ApercuClientPage({ params }) {
  const session = await getSession();
  const client = await getClient(params.id);
  if (session?.role === "COACH" && client.group?.coachId !== session.userId) {
    redirect("/admin/clients");
  }

  const [metrics, strengthLogs, cardioLogs, attendances, rate, advice, slots, program] =
    await Promise.all([
      listMetrics(client.id),
      listStrengthLogs(client.id),
      listCardioLogs(client.id),
      listAttendances(client.id),
      presenceRate(client.id),
      getAdviceForClient(client),
      getClientWeeklySchedule(client.id),
      getActiveProgramForClient(client.id),
    ]);

  return (
    <div>
      <div className="alert alert-success mb">
        <Icon name="eye" /> Vous voyez l&apos;espace de <strong>{client.user.firstName} {client.user.lastName}</strong> tel
        qu&apos;il le voit (lecture seule).{" "}
        <Link href={`/admin/clients/${client.id}`} style={{ fontWeight: 600 }}><Icon name="arrow-left" /> Retour à la fiche</Link>
      </div>

      {/* Ses séances de la semaine */}
      <div className="card mb">
        <h3><Icon name="calendar" /> Ses séances de la semaine</h3>
        <div className="kanban">
          {WEEKDAYS.map((day) => {
            const daySlots = slots.filter((s) => s.weekday === day);
            const daySessions = (program?.sessions || []).filter((s) => s.weekday === day);
            return (
              <div key={day} className="kanban-col" style={{ minWidth: 140, width: 140 }}>
                <div className="kanban-col-header"><span>{WEEKDAY_LABELS[day]}</span></div>
                {daySlots.length === 0 && daySessions.length === 0 && (
                  <div className="muted small" style={{ textAlign: "center", padding: 8 }}>Repos</div>
                )}
                {daySlots.map((s) => (
                  <SessionSlotCard key={s.id} slot={s} />
                ))}
                {daySessions.map((s) => (
                  <ProgramSessionCard key={s.id} session={s} weekdayLabel={WEEKDAY_LABELS[day]} />
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Son suivi, comme il le voit */}
      <TrackingView
        initialMetrics={JSON.parse(JSON.stringify(metrics))}
        strengthLogs={JSON.parse(JSON.stringify(strengthLogs))}
        cardioLogs={JSON.parse(JSON.stringify(cardioLogs))}
        attendances={JSON.parse(JSON.stringify(attendances))}
        presenceRate={rate}
        advice={advice ? JSON.parse(JSON.stringify(advice)) : null}
        readOnly
      />
    </div>
  );
}
