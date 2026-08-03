"use client";

/**
 * Tunnel d'onboarding du client (avant accès au dashboard).
 * Vue unique à plusieurs étapes, pilotée en local :
 *   - « hub »      : deux choix — réserver un appel OU envoyer ses mesures ;
 *   - « call »     : petit calendrier de réservation d'appel avec le coach ;
 *   - « fiche »    : profil + bilan initial + premières mesures.
 * Une fois les mesures envoyées, le client passe en attente de validation
 * (paiement + inscription par le coach). Le gating serveur reste la source de
 * vérité : ce composant n'accorde jamais d'accès, il ne fait que collecter.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import LogoutButton from "@/components/LogoutButton";
import GradientBackground from "@/components/GradientBackground";
import Logo from "@/components/Logo";

const PROFILE_FIELDS = [
  ["gender", "Sexe", "text"],
  ["age", "Âge", "number"],
  ["heightCm", "Taille (cm)", "number"],
  ["lifestyle", "Style de vie", "text"],
  ["activityLevel", "Niveau d'activité", "text"],
  ["sportLevel", "Niveau sportif", "text"],
];
const BILAN_FIELDS = [
  ["injuries", "Blessures / zones sensibles"],
  ["medicalNotes", "Antécédents médicaux"],
  ["availability", "Disponibilités (jours, horaires)"],
  ["experienceNote", "Expérience sportive"],
];
const MEASURE_FIELDS = [
  ["weightKg", "Poids", "kg", true],
  ["waistCm", "Tour de taille", "cm"],
  ["hipsCm", "Tour de hanches", "cm"],
  ["chestCm", "Tour de poitrine", "cm"],
  ["armCm", "Tour de bras", "cm"],
  ["thighCm", "Tour de cuisse", "cm"],
  ["calfCm", "Tour de mollet", "cm"],
  ["shouldersCm", "Tour d'épaules", "cm"],
];

/** Créneaux proposés : 5 prochains jours ouvrés, quelques heures fixes. */
function buildSlots() {
  const hours = [9, 11, 14, 16, 18];
  const slots = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  let added = 0;
  let cursor = 1;
  while (added < 5) {
    const day = new Date(d);
    day.setDate(d.getDate() + cursor);
    cursor++;
    const dow = day.getDay();
    if (dow === 0) continue; // pas le dimanche
    slots.push({
      label: day.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }),
      day,
      hours,
    });
    added++;
  }
  return slots;
}

function Shell({ children, wide }) {
  return (
    <div className="public-wrap">
      <GradientBackground />
      <div className="public-card" style={{ maxWidth: wide ? 620 : 480 }}>
        <div className="card">{children}</div>
      </div>
    </div>
  );
}

export default function OnboardingFlow({ firstName, measurementsDone, appointment, profile }) {
  const router = useRouter();
  const [view, setView] = useState("hub");

  // Si les mesures sont déjà envoyées → attente de validation (paiement + coach).
  if (measurementsDone) return <WaitingView firstName={firstName} appointment={appointment} />;

  if (view === "call") return <CallView firstName={firstName} appointment={appointment} onBack={() => setView("hub")} router={router} />;
  if (view === "fiche") return <FicheView profile={profile} onBack={() => setView("hub")} router={router} />;

  return (
    <Shell>
      <div className="flex mb" style={{ gap: 12 }}>
        <div className="brand-badge"><Logo /></div>
        <div>
          <h2 style={{ marginBottom: 2 }}>Bienvenue{firstName ? `, ${firstName}` : ""} !</h2>
          <div className="muted small">Comment souhaitez-vous démarrer ?</div>
        </div>
      </div>
      <p className="muted">
        Vous pouvez réserver un appel découverte avec le coach, ou envoyer directement
        vos informations et vos mesures pour lancer votre suivi.
      </p>
      {appointment?.scheduledAt && (
        <div className="alert" style={{ background: "rgba(16,185,129,.12)", borderColor: "rgba(16,185,129,.4)" }}>
          <Icon name="calendar" /> Appel réservé le {new Date(appointment.scheduledAt).toLocaleString("fr-FR")}.
        </div>
      )}
      <div className="mt" style={{ display: "grid", gap: 12 }}>
        <button className="btn btn-primary" style={{ padding: "16px" }} onClick={() => setView("call")}>
          <Icon name="calendar" /> Réserver un appel avec le coach
        </button>
        <button className="btn" style={{ padding: "16px" }} onClick={() => setView("fiche")}>
          <Icon name="target" /> Envoyer mes informations et mes mesures
        </button>
      </div>
      <div className="mt" style={{ textAlign: "center" }}>
        <LogoutButton />
      </div>
    </Shell>
  );
}

function WaitingView({ firstName, appointment }) {
  const router = useRouter();
  return (
    <Shell>
      <div style={{ textAlign: "center" }}>
        <div className="brand-badge" style={{ margin: "0 auto 14px" }}><Logo /></div>
        <h2>Merci{firstName ? `, ${firstName}` : ""} !</h2>
        <p className="muted">
          Vos informations sont bien enregistrées. Votre coach valide votre paiement puis
          votre inscription : vous aurez alors accès à votre espace complet (séances,
          programme, suivi).
        </p>
        {appointment?.scheduledAt && (
          <div className="muted small mt">
            <Icon name="calendar" /> Appel prévu le {new Date(appointment.scheduledAt).toLocaleString("fr-FR")}.
          </div>
        )}
        <div className="flex" style={{ justifyContent: "center", marginTop: 12 }}>
          <button className="btn" onClick={() => router.refresh()}>
            <Icon name="activity" /> Vérifier maintenant
          </button>
          <LogoutButton />
        </div>
      </div>
    </Shell>
  );
}

function CallView({ firstName, appointment, onBack, router }) {
  const [slots] = useState(buildSlots);
  const [selected, setSelected] = useState(null); // Date complète
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(!!appointment?.scheduledAt);

  async function book() {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/me/appointment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt: selected.toISOString() }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setDone(true);
      router.refresh();
    } catch (err) { console.error(err);
      setError(err.message);
      setSaving(false);
    }
  }

  if (done) {
    return (
      <Shell>
        <div style={{ textAlign: "center" }}>
          <div className="brand-badge" style={{ margin: "0 auto 14px" }}><Logo /></div>
          <h2>Appel réservé !</h2>
          <p className="muted">Votre coach vous rappellera au créneau choisi. Vous pouvez aussi envoyer vos mesures dès maintenant.</p>
          <button className="btn mt" onClick={onBack}><Icon name="arrow-left" /> Retour</button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell wide>
      <button className="btn btn-sm" style={{ marginBottom: 10 }} onClick={onBack}><Icon name="arrow-left" /> Retour</button>
      <h2 style={{ marginBottom: 2 }}>Réserver un appel</h2>
      <p className="muted small">Choisissez un créneau : il apparaîtra dans l&apos;agenda de votre coach.</p>
      {error && <div className="alert alert-error" onClick={() => setError(null)}>{error}</div>}
      <div className="mt" style={{ display: "grid", gap: 12 }}>
        {slots.map((s) => (
          <div key={s.label}>
            <div className="small" style={{ textTransform: "capitalize", fontWeight: 600, marginBottom: 6 }}>{s.label}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {s.hours.map((h) => {
                const dt = new Date(s.day);
                dt.setHours(h, 0, 0, 0);
                const isSel = selected && selected.getTime() === dt.getTime();
                return (
                  <button
                    key={h}
                    className={`btn ${isSel ? "btn-primary" : ""}`}
                    style={{ padding: "8px 14px" }}
                    onClick={() => setSelected(dt)}
                  >
                    {String(h).padStart(2, "0")}:00
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <button className="btn btn-primary mt" style={{ width: "100%" }} disabled={!selected || saving} onClick={book}>
        <Icon name="check" /> {saving ? "Réservation…" : "Confirmer le créneau"}
      </button>
    </Shell>
  );
}

function FicheView({ profile, onBack, router }) {
  const [form, setForm] = useState(() => {
    const base = {};
    for (const [k] of PROFILE_FIELDS) base[k] = profile?.[k] ?? "";
    for (const [k] of BILAN_FIELDS) base[k] = profile?.[k] ?? "";
    for (const [k] of MEASURE_FIELDS) base[k] = "";
    return base;
  });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      // 1) Profil + bilan initial (allowlist stricte côté serveur).
      const profilePayload = {};
      for (const [k] of PROFILE_FIELDS) profilePayload[k] = form[k];
      for (const [k] of BILAN_FIELDS) profilePayload[k] = form[k];
      const r1 = await fetch("/api/me/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profilePayload),
      });
      const j1 = await r1.json();
      if (!j1.ok) throw new Error(j1.error);

      // 2) Premières mesures → marque l'étape faite + tâche de validation staff.
      const measurePayload = {};
      for (const [k] of MEASURE_FIELDS) measurePayload[k] = form[k];
      const r2 = await fetch("/api/me/measurements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(measurePayload),
      });
      const j2 = await r2.json();
      if (!j2.ok) throw new Error(j2.error);

      router.refresh(); // gating serveur → écran d'attente de validation
    } catch (err) { console.error(err);
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <Shell wide>
      <button className="btn btn-sm" style={{ marginBottom: 10 }} onClick={onBack}><Icon name="arrow-left" /> Retour</button>
      <h2 style={{ marginBottom: 2 }}>Vos informations</h2>
      <p className="muted small">Pour que votre coach prépare un suivi adapté. Seul le poids est obligatoire.</p>
      {error && <div className="alert alert-error" onClick={() => setError(null)}>{error}</div>}

      <form onSubmit={submit}>
        <div className="section-label mt">Profil</div>
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
          {PROFILE_FIELDS.map(([k, label, type]) => (
            <div key={k} className="field" style={{ margin: 0 }}>
              <label className="small">{label}</label>
              <input className="input" type={type} value={form[k]} onChange={set(k)} />
            </div>
          ))}
        </div>

        <div className="section-label mt">Bilan initial</div>
        <div style={{ display: "grid", gap: 12 }}>
          {BILAN_FIELDS.map(([k, label]) => (
            <div key={k} className="field" style={{ margin: 0 }}>
              <label className="small">{label}</label>
              <textarea className="input" rows={2} value={form[k]} onChange={set(k)} />
            </div>
          ))}
        </div>

        <div className="section-label mt">Premières mesures</div>
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
          {MEASURE_FIELDS.map(([k, label, unit, required]) => (
            <div key={k} className="field" style={{ margin: 0 }}>
              <label className="small">{label} ({unit}){required ? " *" : ""}</label>
              <input
                className="input"
                type="number"
                step="0.1"
                inputMode="decimal"
                required={!!required}
                value={form[k]}
                onChange={set(k)}
                placeholder={unit}
              />
            </div>
          ))}
        </div>

        <button className="btn btn-primary mt" style={{ width: "100%" }} disabled={saving}>
          <Icon name="check" /> {saving ? "Envoi…" : "Envoyer mes informations"}
        </button>
      </form>
    </Shell>
  );
}
