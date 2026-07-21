"use client";

/**
 * Fiche client (admin & coach) : profil complet (IMC et métabolisme calculés),
 * objectif chiffré, groupe, programme, suivi hebdo avec bilan du coach,
 * performance (force avec PR, cardio, présence) et conseil individuel.
 */
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import LineChart from "@/components/charts/LineChart";
import ProgramEditor from "@/components/admin/ProgramEditor";
import { BilanCard, BodyTrackingCard } from "@/components/admin/BodyTracking";
import CoachNotes from "@/components/admin/CoachNotes";
import StatsCard from "@/components/admin/StatsCard";
import { ACTIVITY_FACTORS, computeMetabolism, computeMacroTargets, effectiveMacroTargets, explainMacroTargets } from "@/modules/clients/nutrition";
import Icon from "@/components/Icon";

async function api(path, method, body) {
  const res = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Erreur");
  return json.data;
}

const fmtWeek = (d) => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—");

// Calculs de métabolisme et de macros : source unique dans le module nutrition
// (partagé avec l'espace client — voir src/modules/clients/nutrition.js).

export default function ClientFile({ initialClient, goals, exercises = [], sessionTypes = [], generators }) {
  const router = useRouter();
  const [client, setClient] = useState(initialClient);
  const [error, setError] = useState(null);

  const activeProgram = client.programs?.find((p) => p.status === "ACTIVE");
  // Poids de référence : valeur forcée si renseignée, sinon dernier poids saisi,
  // sinon poids de départ.
  const lastWeight =
    client.manualWeightKg ??
    ([...(client.metrics || [])].reverse().find((m) => m.weightKg != null)?.weightKg ?? client.startWeightKg);

  async function toggleGoal(goalId) {
    const current = client.goals.map((g) => g.goal.id);
    const next = current.includes(goalId) ? current.filter((x) => x !== goalId) : [...current, goalId];
    try {
      const updated = await api(`/api/clients/${client.id}`, "PATCH", { goalIds: next });
      setClient({ ...client, goals: updated.goals });
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleActive() {
    const updated = await api(`/api/clients/${client.id}`, "PATCH", { isActive: !client.isActive });
    setClient({ ...client, isActive: updated.isActive });
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <Link href="/admin/clients" className="muted small"><Icon name="arrow-left" /> Clients</Link>
          <h1>{client.user.firstName} {client.user.lastName}</h1>
          <div className="subtitle">
            {client.user.email} · {client.user.phone} · identifiant : {client.user.username}
            {client.group && <> · <Icon name="users" /> {client.group.name}</>}
            {" · "}<span className="badge" title="Niveau de progression (évolue selon les rapports de séance)">Niveau {client.level ?? 1} / 5</span>
            {" · "}
            <span
              className="badge"
              title="Étape d'onboarding : mensurations renseignées par le client depuis son espace"
              style={client.onboardingMeasurementsDone
                ? { borderColor: "var(--green)", color: "var(--green)" }
                : { borderColor: "var(--amber)", color: "var(--amber)" }}
            >
              {client.onboardingMeasurementsDone
                ? <><Icon name="check" /> Mensurations complétées</>
                : <><Icon name="warning" /> Mensurations à remplir</>}
            </span>
            {client.prospect && (
              <> · <Link href={`/admin/crm/${client.prospect.id}`} style={{ color: "var(--accent)" }}>historique CRM →</Link></>
            )}
          </div>
        </div>
        <div className="flex">
          <Link href={`/admin/clients/${client.id}/apercu`} className="btn">
            <Icon name="eye" /> Voir comme le client
          </Link>
          <button className="btn" onClick={toggleActive}>
            {client.isActive ? "Désactiver l'espace" : "Réactiver l'espace"}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error" onClick={() => setError(null)}>{error}</div>}

      {/* Profil + cible nutrition (macros) */}
      <div className="grid grid-2 mb">
        <ProfileCard client={client} lastWeight={lastWeight} onSaved={(c) => setClient({ ...client, ...c })} />
        <NutritionCard client={client} lastWeight={lastWeight} onSaved={(c) => setClient({ ...client, ...c })} />
      </div>

      {/* Objectif chiffré + objectifs d'entraînement : côte à côte. */}
      <div className="grid grid-2 mb">
        <ObjectiveCard client={client} lastWeight={lastWeight} onSaved={(c) => setClient({ ...client, ...c })} />
        <div className="card">
          <h3><Icon name="target" /> Objectifs d&apos;entraînement</h3>
          <div className="flex wrap">
            {goals.map((g) => {
              const active = client.goals.some((cg) => cg.goal.id === g.id);
              return (
                <button
                  key={g.id}
                  className="badge"
                  style={{ cursor: "pointer", borderColor: active ? "var(--accent)" : "var(--border)", background: active ? "var(--accent-soft)" : undefined }}
                  onClick={() => toggleGoal(g.id)}
                >
                  {active ? <><Icon name="check" />{" "}</> : null}{g.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bilan initial (questionnaire d'entrée) + rapport de séance */}
      <div className="grid grid-2 mb">
        <BilanCard client={client} onSaved={(c) => setClient({ ...client, ...c })} />
        <SessionReportCard
          client={client}
          sessionTypes={sessionTypes}
          exercises={exercises}
          onUpdate={(patch) => setClient({ ...client, ...patch })}
        />
      </div>

      {/* Conseil individuel de la semaine (repositionné hors des objectifs) */}
      <div className="mb">
        <AdviceCard client={client} />
      </div>

      {/* Carnet de notes privé du coach (invisible côté client) */}
      <div className="mb">
        <CoachNotes client={client} onUpdate={(patch) => setClient({ ...client, ...patch })} />
      </div>

      {/* Suivi corporel : mensurations + photos avant / après */}
      <div className="mb">
        <BodyTrackingCard client={client} onUpdate={(patch) => setClient({ ...client, ...patch })} />
      </div>

      {/* Performance : force / cardio / présence */}
      <PerformanceCard client={client} exercises={exercises} onUpdate={(patch) => setClient({ ...client, ...patch })} />

      {/* Programme */}
      <div className="mt">
        <ProgramCard
          client={client}
          exercises={exercises}
          generators={generators}
          activeProgram={activeProgram}
          onGenerated={() => router.refresh()}
        />
      </div>

      {/* Stats enrichies : 1RM estimé, volume, projection, poids lissé */}
      <div className="mt">
        <StatsCard client={client} />
      </div>

      {/* Graphiques de suivi : regroupés dans une seule carte, alignés. */}
      <div className="card mt">
        <h3><Icon name="chart" /> Graphiques de suivi</h3>
        <div className="grid grid-2">
          <div>
            <div className="muted small mb">Poids (kg) — ligne verte = objectif</div>
            <LineChart
              points={client.metrics.map((m) => ({ label: fmtWeek(m.weekStart), value: m.weightKg }))}
              color="var(--accent)"
              unit="kg"
              target={client.targetWeightKg}
              targetLabel="Cible"
            />
          </div>
          <div>
            <div className="muted small mb">Énergie (1-10)</div>
            <LineChart
              points={client.metrics.map((m) => ({ label: fmtWeek(m.weekStart), value: m.energyLevel }))}
              color="var(--blue)"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* --- Profil ---------------------------------------------------------------------- */

function ProfileCard({ client, lastWeight, onSaved }) {
  const [form, setForm] = useState({
    gender: client.gender || "",
    age: client.age ?? "",
    heightCm: client.heightCm ?? "",
    lifestyle: client.lifestyle || "",
    activityLevel: client.activityLevel || "",
    sportLevel: client.sportLevel || "",
    bodyType: client.bodyType || "",
    dietPreferences: client.dietPreferences || "",
    // Valeurs forcées manuellement (vides = automatique)
    manualWeightKg: client.manualWeightKg ?? "",
    manualBmi: client.manualBmi ?? "",
    manualBmr: client.manualBmr ?? "",
    manualTdee: client.manualTdee ?? "",
  });
  const [msg, setMsg] = useState(null);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  // Poids actuel effectif : valeur forcée si renseignée, sinon dernier poids saisi.
  const effWeight = form.manualWeightKg !== "" ? Number(form.manualWeightKg) : lastWeight;

  // IMC calculé — uniquement si la taille est plausible (100–250 cm), pour
  // éviter les valeurs aberrantes issues d'une saisie erronée.
  const h = Number(form.heightCm);
  const autoImc =
    h >= 100 && h <= 250 && effWeight
      ? (effWeight / Math.pow(h / 100, 2)).toFixed(1)
      : null;
  const autoMetab = computeMetabolism({
    gender: form.gender,
    age: Number(form.age),
    heightCm: h >= 100 && h <= 250 ? h : 0,
    weightKg: effWeight,
    activityLevel: form.activityLevel,
  });

  // Valeurs affichées : le manuel prime sur le calcul automatique.
  const dispWeight = form.manualWeightKg !== "" ? Number(form.manualWeightKg) : (lastWeight ?? null);
  const dispImc = form.manualBmi !== "" ? Number(form.manualBmi) : autoImc;
  const dispBmr = form.manualBmr !== "" ? Number(form.manualBmr) : autoMetab?.base ?? null;
  const dispTdee = form.manualTdee !== "" ? Number(form.manualTdee) : autoMetab?.active ?? null;
  const isManual = (k) => form[k] !== "" && form[k] !== null;

  async function save() {
    try {
      const updated = await api(`/api/clients/${client.id}`, "PATCH", form);
      onSaved(updated);
      setMsg("✓ Profil enregistré");
      setTimeout(() => setMsg(null), 2000);
    } catch (err) {
      setMsg(err.message);
    }
  }

  return (
    <div className="card">
      <h3><Icon name="user" /> Profil</h3>
      <div className="form-row">
        <div className="field">
          <label>Genre</label>
          <select className="input" value={form.gender} onChange={set("gender")}>
            <option value="">—</option>
            <option>Homme</option>
            <option>Femme</option>
          </select>
        </div>
        <div className="field"><label>Âge</label><input className="input" type="number" min={10} value={form.age} onChange={set("age")} /></div>
        <div className="field"><label>Taille (cm)</label><input className="input" type="number" min={100} value={form.heightCm} onChange={set("heightCm")} /></div>
      </div>
      <div className="form-row">
        <div className="field">
          <label>Niveau d&apos;activité</label>
          <select className="input" value={form.activityLevel} onChange={set("activityLevel")}>
            <option value="">—</option>
            {Object.keys(ACTIVITY_FACTORS).map((a) => <option key={a}>{a}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Niveau sportif</label>
          <select className="input" value={form.sportLevel} onChange={set("sportLevel")}>
            <option value="">—</option>
            <option>Débutant</option>
            <option>Intermédiaire</option>
            <option>Avancé</option>
          </select>
        </div>
        <div className="field">
          <label>Type de corps</label>
          <select className="input" value={form.bodyType} onChange={set("bodyType")}>
            <option value="">—</option>
            <option>Ectomorphe</option>
            <option>Mésomorphe</option>
            <option>Endomorphe</option>
          </select>
        </div>
      </div>
      <div className="field"><label>Style de vie</label><input className="input" placeholder="Ex. : travail de bureau, 2 enfants, sommeil 6 h…" value={form.lifestyle} onChange={set("lifestyle")} /></div>
      <div className="field"><label>Préférences alimentaires</label><input className="input" placeholder="Ex. : végétarien, sans lactose…" value={form.dietPreferences} onChange={set("dietPreferences")} /></div>

      <div className="grid grid-4 mb" style={{ gap: 10 }}>
        <div><div className="stat-value" style={{ fontSize: 20 }}>{dispWeight ?? "—"}</div><div className="stat-label">Poids actuel (kg){isManual("manualWeightKg") && " ·forcé"}</div></div>
        <div><div className="stat-value" style={{ fontSize: 20 }}>{dispImc ?? "—"}</div><div className="stat-label">IMC{isManual("manualBmi") && " ·forcé"}</div></div>
        <div><div className="stat-value" style={{ fontSize: 20 }}>{dispBmr ?? "—"}</div><div className="stat-label">Métab. base (kcal){isManual("manualBmr") && " ·forcé"}</div></div>
        <div><div className="stat-value" style={{ fontSize: 20 }}>{dispTdee ?? "—"}</div><div className="stat-label">Métab. actif (kcal){isManual("manualTdee") && " ·forcé"}</div></div>
      </div>

      {/* Forcer manuellement une valeur : laisser vide = calcul automatique. */}
      <details style={{ marginBottom: 10 }}>
        <summary className="muted small" style={{ cursor: "pointer" }}>Forcer ces valeurs manuellement (facultatif)</summary>
        <div className="grid grid-4 mt" style={{ gap: 10 }}>
          <div className="field" style={{ margin: 0 }}><label className="small">Poids (kg)</label><input className="input" type="number" step="0.1" placeholder="auto" value={form.manualWeightKg} onChange={set("manualWeightKg")} /></div>
          <div className="field" style={{ margin: 0 }}><label className="small">IMC</label><input className="input" type="number" step="0.1" placeholder="auto" value={form.manualBmi} onChange={set("manualBmi")} /></div>
          <div className="field" style={{ margin: 0 }}><label className="small">Métab. base</label><input className="input" type="number" placeholder="auto" value={form.manualBmr} onChange={set("manualBmr")} /></div>
          <div className="field" style={{ margin: 0 }}><label className="small">Métab. actif</label><input className="input" type="number" placeholder="auto" value={form.manualTdee} onChange={set("manualTdee")} /></div>
        </div>
        <p className="muted small mt">Une valeur saisie ici remplace le calcul automatique. Videz le champ pour revenir au calcul.</p>
      </details>

      <div className="flex">
        <button className="btn btn-primary btn-sm" onClick={save}>Enregistrer le profil</button>
        {msg && <span className="small">{msg}</span>}
      </div>
    </div>
  );
}

/* --- Objectif chiffré -------------------------------------------------------------- */

function ObjectiveCard({ client, lastWeight, onSaved }) {
  const toDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");
  const [form, setForm] = useState({
    objectiveDeadline: toDate(client.objectiveDeadline),
    startWeightKg: client.startWeightKg ?? "",
    targetWeightKg: client.targetWeightKg ?? "",
    weeklyRateKg: client.weeklyRateKg ?? "",
  });
  const [msg, setMsg] = useState(null);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const remaining =
    form.targetWeightKg && lastWeight ? (Number(form.targetWeightKg) - lastWeight).toFixed(1) : null;

  async function save() {
    try {
      const updated = await api(`/api/clients/${client.id}`, "PATCH", {
        ...form,
        objectiveDeadline: form.objectiveDeadline || null,
      });
      onSaved(updated);
      setMsg("✓ Objectif enregistré");
      setTimeout(() => setMsg(null), 2000);
    } catch (err) {
      setMsg(err.message);
    }
  }

  return (
    <div className="card">
      <h3><Icon name="pin" /> Objectif chiffré</h3>
      <div className="form-row">
        <div className="field"><label>Poids de départ (kg)</label><input className="input" type="number" step="0.1" value={form.startWeightKg} onChange={set("startWeightKg")} /></div>
        <div className="field"><label>Poids cible (kg)</label><input className="input" type="number" step="0.1" value={form.targetWeightKg} onChange={set("targetWeightKg")} /></div>
      </div>
      <div className="form-row">
        <div className="field">
          <label>Rythme hebdomadaire (kg / semaine)</label>
          <input className="input" type="number" step="0.1" placeholder="Ex. : -1" value={form.weeklyRateKg} onChange={set("weeklyRateKg")} />
        </div>
        <div className="field"><label>Échéance</label><input className="input" type="date" value={form.objectiveDeadline} onChange={set("objectiveDeadline")} /></div>
      </div>
      {remaining !== null && (
        <p className="muted small">
          Reste <strong>{remaining > 0 ? `+${remaining}` : remaining} kg</strong> pour atteindre la cible
          {form.objectiveDeadline && <> avant le {fmtDate(form.objectiveDeadline)}</>}.
        </p>
      )}
      <div className="flex">
        <button className="btn btn-primary btn-sm" onClick={save}>Enregistrer l&apos;objectif</button>
        {msg && <span className="small">{msg}</span>}
      </div>
    </div>
  );
}

/* --- Cible nutrition (macros) -------------------------------------------------------- */

function NutritionCard({ client, lastWeight, onSaved }) {
  const [form, setForm] = useState({
    calorieTarget: client.calorieTarget ?? "",
    proteinTargetG: client.proteinTargetG ?? "",
    carbTargetG: client.carbTargetG ?? "",
    fatTargetG: client.fatTargetG ?? "",
  });
  const [msg, setMsg] = useState(null);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  // TDEE effectif : valeur forcée si renseignée, sinon calcul Mifflin-St Jeor.
  // Le calcul repose sur le dernier poids saisi : la cible se met à jour toute
  // seule quand le poids change.
  const tdee =
    client.manualTdee ??
    computeMetabolism({
      gender: client.gender,
      age: client.age,
      heightCm: client.heightCm,
      weightKg: lastWeight,
      activityLevel: client.activityLevel,
    })?.active ?? null;

  const auto = computeMacroTargets({ tdee, weightKg: lastWeight, weeklyRateKg: client.weeklyRateKg });
  const eff = effectiveMacroTargets(client, auto);
  const explain = explainMacroTargets({ tdee, weightKg: lastWeight, weeklyRateKg: client.weeklyRateKg });
  const rate = Number(client.weeklyRateKg) || 0;

  async function save() {
    try {
      const updated = await api(`/api/clients/${client.id}`, "PATCH", form);
      onSaved(updated);
      setMsg("✓ Cible enregistrée");
      setTimeout(() => setMsg(null), 2000);
    } catch (err) {
      setMsg(err.message);
    }
  }

  const STATS = [
    ["calories", "Calories (kcal/j)", eff.calories],
    ["proteinG", "Protéines (g/j)", eff.proteinG],
    ["carbG", "Glucides (g/j)", eff.carbG],
    ["fatG", "Lipides (g/j)", eff.fatG],
  ];

  return (
    <div className="card">
      <h3><Icon name="flame" /> Cible nutrition (macros)</h3>
      {!auto && !eff.calories ? (
        <p className="muted small">
          Renseignez le profil (âge, taille, niveau d&apos;activité) et un poids pour calculer
          automatiquement la cible — ou forcez les valeurs ci-dessous.
        </p>
      ) : (
        <p className="muted small">
          Calculée depuis le métabolisme actif ({tdee ?? "—"} kcal)
          {rate !== 0 && <> et l&apos;objectif de <strong>{rate > 0 ? `+${rate}` : rate} kg/sem</strong></>},
          protéine en priorité. Elle se recalcule quand le poids change.
        </p>
      )}

      <div className="grid grid-4 mb" style={{ gap: 10 }}>
        {STATS.map(([k, label, value]) => (
          <div key={k}>
            <div className="stat-value" style={{ fontSize: 20 }}>{value ?? "—"}</div>
            <div className="stat-label">{label}{eff.manual[k] && " ·forcé"}</div>
          </div>
        ))}
      </div>

      {/* Détail du calcul : combien de calories par jour et comment se
          répartissent protéines / glucides / lipides sur une journée. */}
      {explain && (
        <details style={{ marginBottom: 10 }}>
          <summary className="muted small" style={{ cursor: "pointer" }}>Voir le détail du calcul (kcal/jour + répartition des macros)</summary>
          <table className="table" style={{ marginTop: 8 }}>
            <tbody>
              {explain.steps.map((s) => (
                <tr key={s.label}>
                  <td style={{ whiteSpace: "nowrap" }}><strong>{s.label}</strong></td>
                  <td className="muted small">{s.detail}</td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>{s.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted small mt" style={{ marginBottom: 0 }}>
            Répartition sur la journée : {explain.proteinG} g de protéines, {explain.carbG} g de glucides
            et {explain.fatG} g de lipides, pour un total de {explain.calories} kcal.
          </p>
        </details>
      )}

      {/* Ajustement manuel : vide = calcul automatique (même logique que le profil). */}
      <details style={{ marginBottom: 10 }}>
        <summary className="muted small" style={{ cursor: "pointer" }}>Ajuster la cible manuellement (facultatif)</summary>
        <div className="grid grid-4 mt" style={{ gap: 10 }}>
          <div className="field" style={{ margin: 0 }}><label className="small">kcal/j</label><input className="input" type="number" placeholder="auto" value={form.calorieTarget} onChange={set("calorieTarget")} /></div>
          <div className="field" style={{ margin: 0 }}><label className="small">Prot. (g)</label><input className="input" type="number" placeholder="auto" value={form.proteinTargetG} onChange={set("proteinTargetG")} /></div>
          <div className="field" style={{ margin: 0 }}><label className="small">Gluc. (g)</label><input className="input" type="number" placeholder="auto" value={form.carbTargetG} onChange={set("carbTargetG")} /></div>
          <div className="field" style={{ margin: 0 }}><label className="small">Lip. (g)</label><input className="input" type="number" placeholder="auto" value={form.fatTargetG} onChange={set("fatTargetG")} /></div>
        </div>
        <p className="muted small mt">Une valeur saisie ici remplace le calcul. Videz le champ pour revenir à l&apos;automatique.</p>
      </details>

      <div className="flex">
        <button className="btn btn-primary btn-sm" onClick={save}>Enregistrer la cible</button>
        {msg && <span className="small">{msg}</span>}
      </div>
    </div>
  );
}

/* --- Conseil individuel de la semaine ---------------------------------------------- */

function AdviceCard({ client }) {
  // Conseil déjà envoyé cette semaine (fourni par la fiche) : état « envoyé »
  // en vert, maintenu jusqu'à la semaine suivante (nouvelle weekStart).
  const existing = client.advices?.[0] || null;
  const [content, setContent] = useState(existing?.content || "");
  const [sent, setSent] = useState(!!existing);
  const [msg, setMsg] = useState(null);

  async function send(e) {
    e.preventDefault();
    try {
      await api("/api/advice", "POST", { content, clientId: client.id });
      setSent(true);
      setMsg("✓ Conseil envoyé (prioritaire sur celui du groupe)");
      setTimeout(() => setMsg(null), 2500);
    } catch (err) {
      setMsg(err.message);
    }
  }

  return (
    <div className="card" style={sent ? { borderColor: "var(--green)" } : undefined}>
      <div className="flex-between wrap">
        <h3 style={{ margin: 0 }}><Icon name="bulb" /> Conseil individuel de la semaine</h3>
        {sent && (
          <span className="badge" style={{ borderColor: "var(--green)", color: "var(--green)" }}>
            <Icon name="check" /> Envoyé cette semaine
          </span>
        )}
      </div>
      <form onSubmit={send} className="mt">
        <div className="field">
          <textarea
            className="input"
            rows={2}
            required
            placeholder="Conseil spécifique pour ce client…"
            value={content}
            onChange={(e) => { setContent(e.target.value); setSent(false); }}
          />
        </div>
        <div className="flex">
          <button className="btn btn-sm btn-primary">{sent ? "Mettre à jour" : "Envoyer"}</button>
          {msg && <span className="small">{msg}</span>}
        </div>
      </form>
    </div>
  );
}

/* --- Rapport de séance (ressenti coach) + PR optionnel + niveau --------------------- */

// Les trois ressentis possibles : clé technique → libellé + couleur.
const SESSION_RATINGS = [
  ["BON", "Bonne", "var(--green)"],
  ["NEUTRE", "Neutre", "var(--amber)"],
  ["MAUVAIS", "Mauvaise", "var(--red)"],
];
const RATING_LABELS = Object.fromEntries(SESSION_RATINGS.map(([k, l]) => [k, l]));
const RATING_COLORS = Object.fromEntries(SESSION_RATINGS.map(([k, , c]) => [k, c]));

function SessionReportCard({ client, sessionTypes = [], exercises = [], onUpdate }) {
  const [rating, setRating] = useState("BON");
  const [form, setForm] = useState({ date: "", sessionTypeId: "", note: "" });
  // PR facultatif, uniquement proposé quand la séance est « bonne ».
  const [pr, setPr] = useState({ exerciseId: "", weightKg: "", reps: "", rpe: "" });
  const [msg, setMsg] = useState(null);
  const reports = client.sessionReports || [];

  async function submit(e) {
    e.preventDefault();
    try {
      const payload = {
        date: form.date || undefined,
        rating,
        note: form.note || undefined,
        sessionTypeId: form.sessionTypeId || undefined,
      };
      // Le PR n'est transmis que si la séance est bonne et le formulaire rempli.
      if (rating === "BON" && pr.exerciseId && pr.weightKg && pr.reps) {
        payload.pr = {
          exerciseId: pr.exerciseId,
          weightKg: Number(pr.weightKg),
          reps: Number(pr.reps),
          rpe: pr.rpe === "" ? undefined : Number(pr.rpe),
        };
      }
      const { report, level } = await api(`/api/clients/${client.id}/session-reports`, "POST", payload);
      const patch = { sessionReports: [report, ...reports], level: level.level };
      // Un PR crée un StrengthLog : on l'ajoute pour rafraîchir le graphe de force.
      if (report.strengthLog) {
        patch.strengthLogs = [...(client.strengthLogs || []), report.strengthLog].sort(
          (a, b) => new Date(a.date) - new Date(b.date)
        );
      }
      onUpdate(patch);
      setForm({ date: "", sessionTypeId: "", note: "" });
      setPr({ exerciseId: "", weightKg: "", reps: "", rpe: "" });
      setMsg(
        `✓ Rapport enregistré — niveau ${level.level}/5` +
          (level.delta ? ` (${level.delta > 0 ? "+" : ""}${level.delta} · ${level.reason})` : "")
      );
      setTimeout(() => setMsg(null), 3500);
    } catch (err) {
      setMsg(err.message);
    }
  }

  async function remove(r) {
    if (!window.confirm("Supprimer ce rapport de séance ?")) return;
    try {
      const res = await api(`/api/session-reports/${r.id}`, "DELETE");
      onUpdate({ sessionReports: reports.filter((x) => x.id !== r.id), level: res.level });
    } catch (err) {
      setMsg(err.message);
    }
  }

  return (
    <div className="card">
      <div className="flex-between wrap mb">
        <h3 style={{ margin: 0 }}><Icon name="clipboard" /> Rapport de séance</h3>
        <span className="badge" title="Le niveau monte si toutes les séances de la semaine sont bonnes, baisse s'il y en a une mauvaise.">
          Niveau {client.level ?? 1} / 5
        </span>
      </div>
      <p className="muted small">Votre ressenti sur la séance de l&apos;apprenti. L&apos;ensemble de la semaine fait évoluer son niveau (objectif inchangé).</p>

      <form onSubmit={submit}>
        <div className="flex wrap mb" style={{ gap: 8 }}>
          {SESSION_RATINGS.map(([k, label, color]) => (
            <button
              type="button"
              key={k}
              className={`btn btn-sm${rating === k ? " btn-primary" : ""}`}
              style={rating === k ? { background: color, borderColor: color } : { borderColor: color, color }}
              onClick={() => setRating(k)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="form-row">
          <div className="field">
            <label>Date de la séance</label>
            <input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div className="field">
            <label>Séance</label>
            <select className="input" value={form.sessionTypeId} onChange={(e) => setForm({ ...form, sessionTypeId: e.target.value })}>
              <option value="">—</option>
              {sessionTypes.map((st) => <option key={st.id} value={st.id}>{st.name}</option>)}
            </select>
          </div>
        </div>
        <div className="field">
          <label>Note (optionnel)</label>
          <input className="input" placeholder="Ex. : bonne énergie, technique du squat à revoir…" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </div>

        {/* Espace PR : n'apparaît que si la séance est « bonne ». */}
        {rating === "BON" && (
          <div className="card" style={{ background: "var(--accent-soft)", padding: 12, marginBottom: 10 }}>
            <label className="small" style={{ display: "block", marginBottom: 6 }}>
              <Icon name="trophy" /> Nouveau record (optionnel) — alimente le graphe de force
            </label>
            <div className="flex wrap" style={{ gap: 8 }}>
              <select className="input" style={{ flex: 2, minWidth: 150 }} value={pr.exerciseId} onChange={(e) => setPr({ ...pr, exerciseId: e.target.value })}>
                <option value="">Exercice…</option>
                {exercises.map((ex) => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
              </select>
              <input className="input" style={{ width: 110 }} type="number" step="0.5" min={1} placeholder="Charge (kg)" value={pr.weightKg} onChange={(e) => setPr({ ...pr, weightKg: e.target.value })} />
              <input className="input" style={{ width: 90 }} type="number" min={1} placeholder="Reps" value={pr.reps} onChange={(e) => setPr({ ...pr, reps: e.target.value })} />
              <select className="input" style={{ width: 90 }} title="Effort ressenti (RPE)" value={pr.rpe} onChange={(e) => setPr({ ...pr, rpe: e.target.value })}>
                <option value="">RPE</option>
                {[5, 6, 7, 8, 9, 10].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <p className="muted small" style={{ margin: "6px 0 0" }}>Le record personnel (★) est détecté automatiquement si la charge dépasse le maximum précédent.</p>
          </div>
        )}

        <div className="flex">
          <button className="btn btn-primary btn-sm">Enregistrer le rapport</button>
          {msg && <span className="small">{msg}</span>}
        </div>
      </form>

      {/* Historique des séances de ce client. */}
      {reports.length > 0 && (
        <div style={{ overflowX: "auto", marginTop: 12 }}>
          <table className="table">
            <thead><tr><th>Date</th><th>Séance</th><th>Ressenti</th><th>Record</th><th></th></tr></thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id} title={r.note || ""}>
                  <td>{fmtDate(r.date)}</td>
                  <td>{r.sessionType?.name || "—"}</td>
                  <td>
                    <span className="badge" style={{ borderColor: RATING_COLORS[r.rating], color: RATING_COLORS[r.rating] }}>
                      {RATING_LABELS[r.rating]}
                    </span>
                  </td>
                  <td>
                    {r.strengthLog
                      ? <><Icon name="trophy" /> {r.strengthLog.exercise?.name} · {r.strengthLog.weightKg} kg</>
                      : "—"}
                  </td>
                  <td><button type="button" className="btn btn-sm btn-danger" onClick={() => remove(r)}><Icon name="x" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* --- Performance : force / cardio / présence ---------------------------------------- */

function PerformanceCard({ client, exercises, onUpdate }) {
  const [tab, setTab] = useState("force");
  const [error, setError] = useState(null);

  const rate = (() => {
    const total = client.attendances?.length || 0;
    if (!total) return null;
    const present = client.attendances.filter((a) => a.present).length;
    return Math.round((present / total) * 100);
  })();

  return (
    <div className="card">
      <div className="flex-between wrap mb">
        <h3 style={{ margin: 0 }}><Icon name="dumbbell" /> Performance</h3>
        <div className="flex">
          {[["force", "Force"], ["cardio", "Cardio"], ["presence", "Présence"]].map(([k, l]) => (
            <button key={k} className={`btn btn-sm${tab === k ? " btn-primary" : ""}`} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
      </div>
      {error && <div className="alert alert-error" onClick={() => setError(null)}>{error}</div>}

      {tab === "force" && <StrengthTab client={client} exercises={exercises} onUpdate={onUpdate} onError={setError} />}
      {tab === "cardio" && <CardioTab client={client} onUpdate={onUpdate} onError={setError} />}
      {tab === "presence" && <AttendanceTab client={client} rate={rate} onUpdate={onUpdate} onError={setError} />}
    </div>
  );
}

function StrengthTab({ client, exercises, onUpdate, onError }) {
  const [form, setForm] = useState({ exerciseId: "", date: "", weightKg: "", reps: "", rpe: "" });

  async function submit(e) {
    e.preventDefault();
    try {
      const log = await api(`/api/clients/${client.id}/strength-logs`, "POST", form);
      onUpdate({ strengthLogs: [...(client.strengthLogs || []), log].sort((a, b) => new Date(a.date) - new Date(b.date)) });
      setForm({ ...form, weightKg: "", reps: "" });
    } catch (err) {
      onError(err.message);
    }
  }

  async function remove(log) {
    await api(`/api/strength-logs/${log.id}`, "DELETE");
    onUpdate({ strengthLogs: client.strengthLogs.filter((l) => l.id !== log.id) });
  }

  return (
    <div>
      <form onSubmit={submit} className="flex wrap mb">
        <select className="input" style={{ flex: 2, minWidth: 160 }} required value={form.exerciseId} onChange={(e) => setForm({ ...form, exerciseId: e.target.value })}>
          <option value="" disabled>Exercice…</option>
          {exercises.map((ex) => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
        </select>
        <input className="input" style={{ width: 140 }} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        <input className="input" style={{ width: 110 }} type="number" step="0.5" min={1} required placeholder="Charge (kg)" value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: e.target.value })} />
        <input className="input" style={{ width: 90 }} type="number" min={1} required placeholder="Reps" value={form.reps} onChange={(e) => setForm({ ...form, reps: e.target.value })} />
        <select className="input" style={{ width: 90 }} title="Effort ressenti (RPE)" value={form.rpe} onChange={(e) => setForm({ ...form, rpe: e.target.value })}>
          <option value="">RPE</option>
          {[5, 6, 7, 8, 9, 10].map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
        <button className="btn btn-primary btn-sm">Ajouter</button>
      </form>
      <p className="muted small"><Icon name="trophy" /> Le record personnel (PR) est détecté automatiquement quand la charge dépasse le maximum précédent.</p>
      {(client.strengthLogs || []).length === 0 ? (
        <p className="muted">Aucune charge enregistrée.</p>
      ) : (
        <table className="table">
          <thead><tr><th>Date</th><th>Exercice</th><th>Charge</th><th>Reps</th><th>RPE</th><th>PR</th><th></th></tr></thead>
          <tbody>
            {[...client.strengthLogs].reverse().map((l) => (
              <tr key={l.id}>
                <td>{fmtDate(l.date)}</td>
                <td>{l.exercise?.name}</td>
                <td><strong>{l.weightKg} kg</strong></td>
                <td>{l.reps}</td>
                <td>{l.rpe ?? "—"}</td>
                <td>{l.isPR ? <Icon name="trophy" /> : ""}</td>
                <td><button className="btn btn-sm btn-danger" onClick={() => remove(l)}><Icon name="x" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function CardioTab({ client, onUpdate, onError }) {
  const [form, setForm] = useState({ date: "", distanceKm: "", paceMinPerKm: "", avgHeartRate: "" });

  async function submit(e) {
    e.preventDefault();
    try {
      const log = await api(`/api/clients/${client.id}/cardio-logs`, "POST", form);
      onUpdate({ cardioLogs: [...(client.cardioLogs || []), log].sort((a, b) => new Date(a.date) - new Date(b.date)) });
      setForm({ date: "", distanceKm: "", paceMinPerKm: "", avgHeartRate: "" });
    } catch (err) {
      onError(err.message);
    }
  }

  async function remove(log) {
    await api(`/api/cardio-logs/${log.id}`, "DELETE");
    onUpdate({ cardioLogs: client.cardioLogs.filter((l) => l.id !== log.id) });
  }

  return (
    <div>
      <form onSubmit={submit} className="flex wrap mb">
        <input className="input" style={{ width: 140 }} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        <input className="input" style={{ width: 120 }} type="number" step="0.1" placeholder="Distance (km)" value={form.distanceKm} onChange={(e) => setForm({ ...form, distanceKm: e.target.value })} />
        <input className="input" style={{ width: 130 }} type="number" step="0.1" placeholder="Allure (min/km)" value={form.paceMinPerKm} onChange={(e) => setForm({ ...form, paceMinPerKm: e.target.value })} />
        <input className="input" style={{ width: 110 }} type="number" placeholder="FC moy." value={form.avgHeartRate} onChange={(e) => setForm({ ...form, avgHeartRate: e.target.value })} />
        <button className="btn btn-primary btn-sm">Ajouter</button>
      </form>
      {(client.cardioLogs || []).length === 0 ? (
        <p className="muted">Aucune sortie cardio enregistrée.</p>
      ) : (
        <table className="table">
          <thead><tr><th>Date</th><th>Distance</th><th>Allure</th><th>FC moyenne</th><th></th></tr></thead>
          <tbody>
            {[...client.cardioLogs].reverse().map((l) => (
              <tr key={l.id}>
                <td>{fmtDate(l.date)}</td>
                <td>{l.distanceKm != null ? `${l.distanceKm} km` : "—"}</td>
                <td>{l.paceMinPerKm != null ? `${l.paceMinPerKm} min/km` : "—"}</td>
                <td>{l.avgHeartRate != null ? `${l.avgHeartRate} bpm` : "—"}</td>
                <td><button className="btn btn-sm btn-danger" onClick={() => remove(l)}><Icon name="x" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function AttendanceTab({ client, rate, onUpdate, onError }) {
  const [form, setForm] = useState({ date: "", present: "1", label: "" });

  async function submit(e) {
    e.preventDefault();
    try {
      const att = await api(`/api/clients/${client.id}/attendance`, "POST", {
        date: form.date,
        present: form.present === "1",
        label: form.label,
      });
      onUpdate({ attendances: [...(client.attendances || []), att].sort((a, b) => new Date(a.date) - new Date(b.date)) });
      setForm({ date: "", present: "1", label: "" });
    } catch (err) {
      onError(err.message);
    }
  }

  return (
    <div>
      {rate !== null && (
        <p><strong style={{ color: rate >= 70 ? "var(--green)" : "var(--amber)", fontSize: 22 }}>{rate} %</strong> de présence ({client.attendances.length} séance(s) enregistrée(s))</p>
      )}
      <form onSubmit={submit} className="flex wrap mb">
        <input className="input" style={{ width: 140 }} type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        <select className="input" style={{ width: "auto" }} value={form.present} onChange={(e) => setForm({ ...form, present: e.target.value })}>
          <option value="1">Présent</option>
          <option value="0">Absent</option>
        </select>
        <input className="input" style={{ flex: 1, minWidth: 140 }} placeholder="Séance (optionnel)" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
        <button className="btn btn-primary btn-sm">Enregistrer</button>
      </form>
      {(client.attendances || []).length === 0 ? (
        <p className="muted">Aucune présence enregistrée.</p>
      ) : (
        <div className="flex wrap">
          {[...client.attendances].reverse().slice(0, 30).map((a) => (
            <span key={a.id} className="badge" title={a.label || ""}>
              <span className="dot" style={{ background: a.present ? "var(--green)" : "var(--red)" }} />
              {fmtDate(a.date)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* --- Programme : génération + affichage ------------------------------------------ */

function ProgramCard({ client, exercises, activeProgram, onGenerated }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Objectif + niveau sportif du profil : ils construisent le programme
  // automatiquement, sans que le coach ait à cliquer sur « Générer ».
  const clientGoal = client.goals?.[0]?.goal || null;

  async function regenerate() {
    setLoading(true);
    setError(null);
    try {
      await api("/api/programs", "POST", { clientId: client.id, auto: true });
      onGenerated();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <div className="flex-between wrap mb">
        <h3 style={{ margin: 0 }}><Icon name="dumbbell" /> Programme personnalisé</h3>
        {clientGoal && (
          <button className="btn btn-sm" disabled={loading} onClick={regenerate}>
            {loading ? "Génération…" : "Regénérer"}
          </button>
        )}
      </div>

      {!clientGoal && (
        <div className="alert alert-error">
          Ce client n&apos;a pas encore d&apos;objectif. Attribuez-lui-en un dans « Objectifs d&apos;entraînement » ci-dessus : son programme sera alors généré automatiquement.
        </div>
      )}
      {error && <div className="alert alert-error">{error}</div>}

      {/* Sécurité : les blessures du bilan initial remontent ici pour que le
          coach les ait sous les yeux au moment d'ajuster le programme. */}
      {client.injuries && (
        <div className="alert" style={{ border: "1px solid var(--amber)", marginBottom: 12 }}>
          <Icon name="warning" /> <strong>Blessures / zones sensibles :</strong> {client.injuries}
        </div>
      )}

      {/* Édition manuelle : le brouillon généré s'ajuste ici (exercices, séries,
          jours…) et peut être enregistré comme modèle ou remplacé par un modèle.
          La `key` force la réinitialisation de l'éditeur quand le programme change
          (régénération ou application d'un modèle). */}
      <ProgramEditor
        key={activeProgram?.id || "none"}
        initialProgram={activeProgram || null}
        exercises={exercises}
        clientId={client.id}
        onProgramReplaced={onGenerated}
      />
    </div>
  );
}
