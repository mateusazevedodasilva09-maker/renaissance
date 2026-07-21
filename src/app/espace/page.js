/**
 * Espace client — agenda des séances de la semaine :
 * - conseil du coach de la semaine ;
 * - séances de groupe (selon les objectifs du client) ;
 * - séances du programme personnel placées sur les jours prévus,
 *   avec le résumé de chaque séance (nom, exercices, paramètres).
 */
import { getSession } from "@/lib/session";
import { getClientByUserId } from "@/modules/clients/client.service";
import { getClientWeeklySchedule } from "@/modules/sessions/schedule.service";
import { getActiveProgramForClient } from "@/modules/programs/program.service";
import { getAdviceForClient } from "@/modules/clients/advice.service";
import { WEEKDAYS, WEEKDAY_LABELS, startOfWeek, addDays } from "@/lib/dates";
import ExerciseThumb from "@/components/ExerciseThumb";
import SessionSlotCard from "@/components/SessionSlotCard";
import ProgramSessionCard from "@/components/espace/ProgramSessionCard";
import Icon from "@/components/Icon";

export const dynamic = "force-dynamic";

export default async function EspaceSeancesPage() {
  const session = await getSession();
  const client = await getClientByUserId(session.userId);
  const [slots, program, advice] = await Promise.all([
    getClientWeeklySchedule(client.id),
    getActiveProgramForClient(client.id),
    getAdviceForClient(client),
  ]);

  const monday = startOfWeek();
  const programSessions = program?.sessions || [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Mes séances de la semaine</h1>
          <div className="subtitle">
            Vos séances de groupe, selon vos objectifs :{" "}
            {client.goals.map((g) => g.goal.label).join(", ") || "aucun objectif défini"}.
          </div>
        </div>
      </div>

      {/* Conseil du coach de la semaine */}
      {advice && (
        <div className="card mb" style={{ borderColor: "var(--accent)", background: "var(--accent-soft)" }}>
          <h3><Icon name="bulb" /> Le conseil de votre coach cette semaine</h3>
          <p style={{ whiteSpace: "pre-wrap", marginBottom: 0 }}>{advice.content}</p>
        </div>
      )}

      <div className="kanban mb">
        {WEEKDAYS.map((day, i) => {
          const date = addDays(monday, i);
          const daySlots = slots.filter((s) => s.weekday === day);
          const daySessions = programSessions.filter((s) => s.weekday === day);
          const isToday = new Date().toDateString() === date.toDateString();
          return (
            <div
              key={day}
              className="kanban-col"
              style={{ minWidth: 170, width: 170, outline: isToday ? "2px solid var(--accent)" : "none" }}
            >
              <div className="kanban-col-header">
                <span>
                  {WEEKDAY_LABELS[day]}
                  <div className="muted small">
                    {date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                    {isToday && " · aujourd'hui"}
                  </div>
                </span>
              </div>
              {daySlots.length === 0 && daySessions.length === 0 && (
                <div className="muted small" style={{ textAlign: "center", padding: 10 }}>Repos</div>
              )}
              {/* Séance de groupe cliquable : ouvre le contenu type de la
                  thématique (exercices, paramètres, descriptions). */}
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

      {/* Résumé des séances du programme */}
      {programSessions.length > 0 && (
        <div className="card">
          <h3><Icon name="clipboard" /> Le contenu de mes séances — {program.title}</h3>
          <div className="grid grid-2">
            {programSessions.map((s) => (
              <div key={s.id} className="card" style={{ background: "var(--bg)" }}>
                <div className="flex-between mb">
                  <strong>{s.name}</strong>
                  {s.weekday && <span className="badge">{WEEKDAY_LABELS[s.weekday]}</span>}
                </div>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Exercice</th>
                      <th>Séries × Réps</th>
                      <th>Repos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.exercises.map((ex) => (
                      <tr key={ex.id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <ExerciseThumb exercise={ex.exercise} size={36} />
                            <div>
                              {ex.exercise.name}
                              {ex.notes && <div className="muted small">{ex.notes}</div>}
                            </div>
                          </div>
                        </td>
                        <td>{ex.sets} × {ex.reps}</td>
                        <td className="muted">{ex.restSec ? `${ex.restSec} s` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
