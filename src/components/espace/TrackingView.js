"use client";

/**
 * Suivi complet du client :
 * - sélecteur de période (semaine / mois / trimestre / année) ;
 * - poids, énergie ;
 * - force : charge soulevée et répétitions par exercice, records (★) sur le graphe ;
 * - cardio : distance, allure, fréquence cardiaque ;
 * - présence / absence aux séances ;
 * - bilans du coach et conseil de la semaine ;
 * - saisie de la mesure de la semaine.
 */
import { useMemo, useState } from "react";
import LineChart from "@/components/charts/LineChart";
import Icon from "@/components/Icon";

const fmtWeek = (d) => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
const fmtDate = (d) => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });

const PERIODS = {
  week: { label: "Semaine", days: 7 },
  month: { label: "Mois", days: 31 },
  quarter: { label: "Trimestre", days: 92 },
  year: { label: "Année", days: 365 },
};

export default function TrackingView({ initialMetrics, strengthLogs = [], cardioLogs = [], attendances = [], presenceRate = null, advice = null, nutrition = null, readOnly = false }) {
  const [metrics, setMetrics] = useState(initialMetrics);
  const [period, setPeriod] = useState("quarter");
  const [exerciseId, setExerciseId] = useState("");
  const [chart, setChart] = useState("poids"); // schéma affiché (un seul à la fois)

  // --- Période sélectionnée -----------------------------------------------------
  const since = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - PERIODS[period].days);
    return d;
  }, [period]);
  const inPeriod = (d) => new Date(d) >= since;

  const periodMetrics = metrics.filter((m) => inPeriod(m.weekStart));
  const periodCardio = cardioLogs.filter((l) => inPeriod(l.date));
  const periodAttendances = attendances.filter((a) => inPeriod(a.date));

  // --- Force : par exercice ------------------------------------------------------
  const exercises = useMemo(() => {
    const map = {};
    strengthLogs.forEach((l) => {
      if (l.exercise) map[l.exercise.id] = l.exercise.name;
    });
    return Object.entries(map).map(([id, name]) => ({ id, name }));
  }, [strengthLogs]);
  const activeExercise = exerciseId || exercises[0]?.id || "";
  const periodStrength = strengthLogs.filter((l) => l.exerciseId === activeExercise && inPeriod(l.date));

  // --- Présence -------------------------------------------------------------------
  const periodPresence = useMemo(() => {
    const total = periodAttendances.length;
    if (!total) return null;
    const present = periodAttendances.filter((a) => a.present).length;
    return { rate: Math.round((present / total) * 100), present, total };
  }, [periodAttendances]);

  // --- Tendance vs période précédente (pour les badges ↑ / ↓) -------------------
  const prevSince = useMemo(() => {
    const d = new Date(since);
    d.setDate(d.getDate() - PERIODS[period].days);
    return d;
  }, [since, period]);
  const inPrev = (d) => {
    const t = new Date(d);
    return t >= prevSince && t < since;
  };
  const trends = useMemo(() => {
    const prevAtt = attendances.filter((a) => inPrev(a.date));
    const prevRate = prevAtt.length ? Math.round((prevAtt.filter((a) => a.present).length / prevAtt.length) * 100) : null;
    const curRate = periodPresence ? periodPresence.rate : null;
    const presence = curRate !== null && prevRate !== null ? curRate - prevRate : null;

    const records =
      strengthLogs.filter((l) => l.isPR && inPeriod(l.date)).length -
      strengthLogs.filter((l) => l.isPR && inPrev(l.date)).length;

    const curDist = periodCardio.reduce((s, l) => s + (l.distanceKm || 0), 0);
    const prevDist = cardioLogs.filter((l) => inPrev(l.date)).reduce((s, l) => s + (l.distanceKm || 0), 0);
    const distance = Math.round((curDist - prevDist) * 10) / 10;

    return { presence, records, distance };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attendances, strengthLogs, cardioLogs, periodPresence, periodCardio, since, prevSince]);

  const coachComments = [...periodMetrics].reverse().filter((m) => m.coachComment);

  // --- Schémas disponibles (un seul affiché à la fois, au choix du client) ------
  const CHARTS = {
    poids: {
      label: "Poids (kg)", color: "var(--accent)", unit: "kg", isStrength: false,
      points: periodMetrics.map((m) => ({ label: fmtWeek(m.weekStart), value: m.weightKg })),
    },
    energie: {
      label: "Énergie (1-10)", color: "var(--blue)", isStrength: false,
      points: periodMetrics.map((m) => ({ label: fmtWeek(m.weekStart), value: m.energyLevel })),
    },
    force_charge: {
      label: "Force — charge soulevée (kg)", color: "var(--accent)", unit: "kg", isStrength: true,
      points: periodStrength.map((l) => ({ label: fmtDate(l.date), value: l.weightKg, pr: l.isPR })),
    },
    force_reps: {
      label: "Force — répétitions", color: "var(--violet)", isStrength: true,
      points: periodStrength.map((l) => ({ label: fmtDate(l.date), value: l.reps, pr: l.isPR })),
    },
    cardio_distance: {
      label: "Cardio — distance (km)", color: "var(--green)", unit: "km", isStrength: false,
      points: periodCardio.map((l) => ({ label: fmtDate(l.date), value: l.distanceKm })),
    },
    cardio_allure: {
      label: "Cardio — allure (min/km)", color: "var(--blue)", isStrength: false,
      points: periodCardio.map((l) => ({ label: fmtDate(l.date), value: l.paceMinPerKm })),
    },
    cardio_fc: {
      label: "Cardio — fréquence cardiaque (bpm)", color: "var(--red)", isStrength: false,
      points: periodCardio.map((l) => ({ label: fmtDate(l.date), value: l.avgHeartRate })),
    },
  };
  const current = CHARTS[chart] || CHARTS.poids;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Mon suivi</h1>
          <div className="subtitle">Votre progression, période par période.</div>
        </div>
        <div className="flex">
          {Object.entries(PERIODS).map(([k, p]) => (
            <button key={k} className={`btn btn-sm${period === k ? " btn-primary" : ""}`} onClick={() => setPeriod(k)}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conseil du coach de la semaine */}
      {advice && (
        <div className="card mb" style={{ borderColor: "var(--accent)", background: "var(--accent-soft)" }}>
          <h3><Icon name="bulb" /> Le conseil de votre coach cette semaine</h3>
          <p style={{ whiteSpace: "pre-wrap", marginBottom: 0 }}>{advice.content}</p>
        </div>
      )}

      {/* Cible nutrition du jour (macros), fixée par le coach — lecture seule. */}
      {nutrition && nutrition.calories && (
        <div className="card mb">
          <h3><Icon name="flame" /> Ma cible nutrition</h3>
          <div className="grid grid-4" style={{ gap: 10 }}>
            <div><div className="stat-value" style={{ fontSize: 20 }}>{nutrition.calories}</div><div className="stat-label">Calories (kcal/j)</div></div>
            <div><div className="stat-value" style={{ fontSize: 20 }}>{nutrition.proteinG ?? "—"}</div><div className="stat-label">Protéines (g/j)</div></div>
            <div><div className="stat-value" style={{ fontSize: 20 }}>{nutrition.carbG ?? "—"}</div><div className="stat-label">Glucides (g/j)</div></div>
            <div><div className="stat-value" style={{ fontSize: 20 }}>{nutrition.fatG ?? "—"}</div><div className="stat-label">Lipides (g/j)</div></div>
          </div>
          <p className="muted small" style={{ marginBottom: 0 }}>Cible fixée avec votre coach — priorité aux protéines, à répartir sur la journée.</p>
        </div>
      )}

      {/* Chiffres clés */}
      <div className="grid grid-4 mb">
        <div className="card">
          <div className="stat-value">{periodPresence ? `${periodPresence.rate} %` : presenceRate !== null ? `${presenceRate} %` : "—"}</div>
          <div className="stat-label">Taux de présence {periodPresence && `(${periodPresence.present}/${periodPresence.total})`}</div>
          <Trend delta={trends.presence} unit=" pts" />
        </div>
        <div className="card">
          <div className="stat-value">{periodPresence ? `${100 - periodPresence.rate} %` : "—"}</div>
          <div className="stat-label">Taux d&apos;absence</div>
        </div>
        <div className="card">
          <div className="stat-value">{strengthLogs.filter((l) => l.isPR && inPeriod(l.date)).length} <Icon name="trophy" /></div>
          <div className="stat-label">Records personnels</div>
          <Trend delta={trends.records} />
        </div>
        <div className="card">
          <div className="stat-value">{periodCardio.reduce((s, l) => s + (l.distanceKm || 0), 0).toFixed(1)} km</div>
          <div className="stat-label">Distance cardio</div>
          <Trend delta={trends.distance} unit=" km" />
        </div>
      </div>

      {/* Un seul espace graphique : le client choisit le schéma affiché. */}
      <div className="card mb">
        <div className="flex-between wrap mb" style={{ gap: 8 }}>
          <h3 style={{ margin: 0 }}>
            <Icon name="chart" /> {current.label}
            {current.isStrength && current.points.some((p) => p.pr) ? " · ★ = record personnel" : ""}
          </h3>
          <div className="flex wrap" style={{ gap: 8 }}>
            <select className="input" style={{ width: "auto" }} value={chart} onChange={(e) => setChart(e.target.value)}>
              <optgroup label="Général">
                <option value="poids">Poids</option>
                <option value="energie">Énergie</option>
              </optgroup>
              <optgroup label="Force">
                <option value="force_charge">Force — charge</option>
                <option value="force_reps">Force — répétitions</option>
              </optgroup>
              <optgroup label="Cardio">
                <option value="cardio_distance">Cardio — distance</option>
                <option value="cardio_allure">Cardio — allure</option>
                <option value="cardio_fc">Cardio — fréquence cardiaque</option>
              </optgroup>
            </select>
            {current.isStrength && exercises.length > 0 && (
              <select className="input" style={{ width: "auto" }} value={activeExercise} onChange={(e) => setExerciseId(e.target.value)}>
                {exercises.map((ex) => (
                  <option key={ex.id} value={ex.id}>{ex.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>
        {current.points.length === 0 ? (
          <p className="muted">Aucune donnée pour ce schéma sur la période sélectionnée.</p>
        ) : (
          <LineChart points={current.points} color={current.color} unit={current.unit} scale={0.8} />
        )}
      </div>

      {/* Bilans du coach */}
      <div className="card">
        <h3><Icon name="note" /> Les bilans de votre coach</h3>
        {coachComments.length === 0 && <p className="muted">Pas encore de bilan sur cette période.</p>}
        <ul className="timeline">
          {coachComments.map((m) => (
            <li key={m.id}>
              <div className="when">Semaine du {fmtWeek(m.weekStart)}</div>
              <div style={{ whiteSpace: "pre-wrap" }}>{m.coachComment}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/**
 * Badge de tendance à côté d'un chiffre clé : ↑ vert si en hausse, ↓ rouge si
 * en baisse, rien si stable ou non calculable. `delta` = variation vs la
 * période précédente.
 */
function Trend({ delta, unit = "" }) {
  if (delta === null || delta === undefined || Number.isNaN(delta) || delta === 0) return null;
  const up = delta > 0;
  const value = Math.abs(Math.round(delta * 10) / 10);
  return (
    <span className={`trend ${up ? "up" : "down"}`}>
      {up ? "↑" : "↓"} {up ? "+" : "−"}{value}{unit}
    </span>
  );
}
