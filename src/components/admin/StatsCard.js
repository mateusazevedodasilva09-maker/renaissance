"use client";

/**
 * Stats enrichies (fiche client) : des chiffres qui parlent.
 *   - 1RM estimé par exercice (formule d'Epley) — la force réelle ;
 *   - volume d'entraînement hebdomadaire (charge × reps) — la constance ;
 *   - moyenne mobile du poids (3 semaines) — la vraie tendance, sans le bruit ;
 *   - projection de l'objectif à partir de la tendance récente.
 * Tous les calculs viennent de src/modules/tracking/stats.js (fonctions pures).
 */
import { useMemo } from "react";
import LineChart from "@/components/charts/LineChart";
import Icon from "@/components/Icon";
import { best1RMs, weeklyVolumes, movingAverage, weightProjection } from "@/modules/tracking/stats";

const fmtWeek = (d) => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
const fmtDate = (d) => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

export default function StatsCard({ client }) {
  const logs = client.strengthLogs || [];
  const metrics = client.metrics || [];

  const oneRms = useMemo(() => best1RMs(logs), [logs]);
  const volumes = useMemo(() => weeklyVolumes(logs), [logs]);
  const smoothWeight = useMemo(
    () => movingAverage(metrics.map((m) => ({ label: fmtWeek(m.weekStart), value: m.weightKg }))),
    [metrics]
  );
  const projection = useMemo(
    () => weightProjection({ metrics, targetWeightKg: client.targetWeightKg, objectiveDeadline: client.objectiveDeadline }),
    [metrics, client.targetWeightKg, client.objectiveDeadline]
  );

  return (
    <div className="card">
      <h3><Icon name="chart" /> Analyse & projections</h3>

      {/* Projection de l'objectif : la phrase qui résume tout. */}
      {projection && (
        <div
          className="alert mb"
          style={{ border: `1px solid ${projection.onTrack ? "var(--green)" : "var(--amber)"}` }}
        >
          <strong>
            Tendance : {projection.slopePerWeek > 0 ? "+" : ""}{projection.slopePerWeek} kg / semaine.
          </strong>{" "}
          {projection.onTrack && projection.projectedDate ? (
            <>Au rythme actuel, la cible de {client.targetWeightKg} kg serait atteinte vers le <strong>{fmtDate(projection.projectedDate)}</strong> (≈ {projection.weeksNeeded} semaine(s)).</>
          ) : (
            <>La tendance actuelle ne va pas vers la cible de {client.targetWeightKg} kg — un ajustement (macros, séances) mérite d&apos;être envisagé.</>
          )}
          {projection.atDeadlineKg != null && (
            <> Poids projeté à l&apos;échéance : <strong>{projection.atDeadlineKg} kg</strong>.</>
          )}
        </div>
      )}

      <div className="grid grid-2">
        {/* 1RM estimés */}
        <div>
          <h4>Records — 1RM estimé</h4>
          {oneRms.length === 0 ? (
            <p className="muted">Aucune charge enregistrée pour l&apos;instant.</p>
          ) : (
            <table className="table">
              <thead><tr><th>Exercice</th><th>1RM est.</th><th>Base</th></tr></thead>
              <tbody>
                {oneRms.slice(0, 6).map((r) => (
                  <tr key={r.exerciseId}>
                    <td>{r.name}</td>
                    <td><strong>{r.oneRm} kg</strong></td>
                    <td className="muted small">{r.weightKg} kg × {r.reps} · {fmtWeek(r.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="muted small">Formule d&apos;Epley — indicatif au-delà de 10 répétitions.</p>
        </div>

        {/* Volume hebdomadaire */}
        <div>
          <h4>Volume d&apos;entraînement (kg / semaine)</h4>
          {volumes.length === 0 ? (
            <p className="muted">Le volume apparaîtra dès les premières charges saisies en séance.</p>
          ) : (
            <LineChart
              points={volumes.map((v) => ({ label: fmtWeek(v.weekStart), value: v.volume }))}
              color="var(--accent)"
              unit="kg"
            />
          )}
        </div>
      </div>

      {/* Moyenne mobile du poids : la tendance sans le bruit des pesées. */}
      {smoothWeight.length >= 3 && (
        <div className="mt">
          <h4>Poids lissé (moyenne mobile 3 semaines)</h4>
          <LineChart points={smoothWeight} color="var(--blue)" unit="kg" />
        </div>
      )}
    </div>
  );
}
