"use client";

/**
 * Fiche prospect complète : informations éditables (objectif, source, priorité,
 * dates d'interaction, prochaine action planifiée, assignation), statut pipeline,
 * historique horodaté et conversion en client inscrit.
 */
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";

const EVENT_TYPES = {
  CALL: "Appel",
  EMAIL: "E-mail",
  MESSAGE: "Message",
  MEETING: "Rendez-vous",
  NOTE: "Note",
  DECISION: "Décision",
  STATUS_CHANGE: "Changement de statut",
  SYSTEM: "Automatique",
};

export const SOURCES = {
  SOCIAL_MEDIA: "Réseaux sociaux",
  WORD_OF_MOUTH: "Bouche à oreille",
  FLYER: "Flyers",
  FORM: "Formulaire en ligne",
  MANUAL: "Ajout manuel",
};

export const PRIORITIES = {
  URGENT: { label: "Urgent", color: "var(--red)" },
  HIGH: { label: "Haute", color: "var(--amber)" },
  NORMAL: { label: "Normale", color: "var(--blue)" },
  LOW: { label: "Basse", color: "var(--text-dim)" },
};

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

const fmtDT = (d) =>
  d ? new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

/** Date -> valeur pour <input type="datetime-local"> */
const toLocal = (d) => {
  if (!d) return "";
  const date = new Date(d);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};

export default function ProspectFile({ initialProspect, statuses, goals, staff }) {
  const router = useRouter();
  const [p, setP] = useState(initialProspect);
  const [form, setForm] = useState({
    firstName: p.firstName || "",
    lastName: p.lastName || "",
    email: p.email || "",
    phone: p.phone || "",
    generalNote: p.generalNote || "",
    goalId: p.goalId || "",
    source: p.source || "MANUAL",
    priority: p.priority || "NORMAL",
    assignedToId: p.assignedToId || "",
    firstContactAt: toLocal(p.firstContactAt),
    lastContactAt: toLocal(p.lastContactAt),
    nextActionLabel: p.nextActionLabel || "",
    nextActionAt: toLocal(p.nextActionAt),
  });
  const [event, setEvent] = useState({ type: "CALL", content: "" });
  const [convert, setConvert] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  async function saveProfile() {
    try {
      const updated = await api(`/api/prospects/${p.id}`, "PATCH", {
        ...form,
        firstContactAt: form.firstContactAt || null,
        lastContactAt: form.lastContactAt || null,
        nextActionAt: form.nextActionAt || null,
      });
      setP({ ...p, ...updated });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.message);
    }
  }

  async function changeStatus(statusId) {
    try {
      await api(`/api/prospects/${p.id}`, "PATCH", { statusId });
      router.refresh();
      const status = statuses.find((s) => s.id === statusId);
      setP({ ...p, statusId, status });
    } catch (err) {
      setError(err.message);
    }
  }

  async function addEvent(e) {
    e.preventDefault();
    try {
      const created = await api(`/api/prospects/${p.id}/events`, "POST", event);
      setP({ ...p, contactEvents: [created, ...p.contactEvents], lastContactAt: created.occurredAt });
      setEvent({ type: "CALL", content: "" });
    } catch (err) {
      setError(err.message);
    }
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div>
      <div className="page-header">
        <div>
          <Link href="/admin/crm" className="muted small"><Icon name="arrow-left" /> Retour au CRM</Link>
          <h1>{p.firstName} {p.lastName}</h1>
          <div className="subtitle">
            {p.email || "—"} · {p.phone || "—"} · Source : {SOURCES[p.source] || p.source}
          </div>
        </div>
        <div className="flex wrap">
          <span className="badge" style={{ color: PRIORITIES[p.priority]?.color }}>
            {PRIORITIES[p.priority]?.label || p.priority}
          </span>
          <select className="input" style={{ width: "auto" }} value={p.statusId} onChange={(e) => changeStatus(e.target.value)}>
            {statuses.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
          {p.client ? (
            <Link href={`/admin/clients/${p.client.id}`} className="btn btn-primary">
              Voir la fiche client →
            </Link>
          ) : (
            <button className="btn btn-primary" onClick={() => setConvert(true)}>
              Convertir en client inscrit
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error" onClick={() => setError(null)}>{error}</div>}

      <div className="grid grid-2">
        <div>
          <div className="card mb">
            <h3>Profil</h3>
            <div className="form-row">
              <div className="field">
                <label>Prénom</label>
                <input className="input" value={form.firstName} onChange={set("firstName")} />
              </div>
              <div className="field">
                <label>Nom</label>
                <input className="input" value={form.lastName} onChange={set("lastName")} />
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label>E-mail</label>
                <input className="input" type="email" value={form.email} onChange={set("email")} />
              </div>
              <div className="field">
                <label>Téléphone</label>
                <input className="input" value={form.phone} onChange={set("phone")} />
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label>Objectif</label>
                <select className="input" value={form.goalId} onChange={set("goalId")}>
                  <option value="">— Aucun —</option>
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>{g.label}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Source du prospect</label>
                <select className="input" value={form.source} onChange={set("source")}>
                  {Object.entries(SOURCES).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label>Priorité</label>
                <select className="input" value={form.priority} onChange={set("priority")}>
                  {Object.entries(PRIORITIES).map(([v, pr]) => (
                    <option key={v} value={v}>{pr.label}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Assigné à</label>
                <select className="input" value={form.assignedToId} onChange={set("assignedToId")}>
                  <option value="">— Personne —</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.role === "ADMIN" ? "Admin" : "Coach"})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label>Début d&apos;interaction</label>
                <input className="input" type="datetime-local" value={form.firstContactAt} onChange={set("firstContactAt")} />
              </div>
              <div className="field">
                <label>Fin d&apos;interaction (dernier contact)</label>
                <input className="input" type="datetime-local" value={form.lastContactAt} onChange={set("lastContactAt")} />
              </div>
            </div>
            <div className="field">
              <label>Note générale</label>
              <textarea className="input" value={form.generalNote} onChange={set("generalNote")} />
            </div>
            <div className="flex">
              <button className="btn btn-primary" onClick={saveProfile}>Enregistrer</button>
              {saved && <span style={{ color: "var(--green)" }}>✓ Enregistré</span>}
            </div>
          </div>

          <div className="card mb">
            <h3><Icon name="clock" /> Prochaine action à planifier</h3>
            <p className="muted small">Apparaît dans le calendrier de l&apos;agenda et dans les obligations journalières.</p>
            <div className="form-row">
              <div className="field">
                <label>Action</label>
                <input className="input" placeholder="Ex. : Rappeler pour proposer un appel" value={form.nextActionLabel} onChange={set("nextActionLabel")} />
              </div>
              <div className="field">
                <label>Échéance</label>
                <input className="input" type="datetime-local" value={form.nextActionAt} onChange={set("nextActionAt")} />
              </div>
            </div>
            <button className="btn btn-primary btn-sm" onClick={saveProfile}>Planifier</button>
          </div>

          {p.appointments?.length > 0 && (
            <div className="card">
              <h3>Appels & rendez-vous</h3>
              {p.appointments.map((a) => (
                <div key={a.id} className="flex-between" style={{ padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                  <span>{a.title}</span>
                  <span className="badge">{a.scheduledAt ? fmtDT(a.scheduledAt) : "À planifier"} · {a.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3>Historique</h3>
          <div className="muted small mb">
            1er contact : {fmtDT(p.firstContactAt)} · dernier contact : {fmtDT(p.lastContactAt)}
          </div>
          <form onSubmit={addEvent} className="mb">
            <div className="flex mb wrap">
              <select className="input" style={{ width: "auto" }} value={event.type} onChange={(e) => setEvent({ ...event, type: e.target.value })}>
                {["CALL", "EMAIL", "MESSAGE", "MEETING", "NOTE", "DECISION"].map((t) => (
                  <option key={t} value={t}>{EVENT_TYPES[t]}</option>
                ))}
              </select>
              <input
                className="input"
                style={{ flex: 1, minWidth: 180 }}
                placeholder="Que s'est-il passé ?"
                required
                value={event.content}
                onChange={(e) => setEvent({ ...event, content: e.target.value })}
              />
              <button className="btn btn-primary btn-sm">Ajouter</button>
            </div>
          </form>
          <ul className="timeline">
            {p.contactEvents.map((ev) => (
              <li key={ev.id}>
                <div className="when">{fmtDT(ev.occurredAt)} · {EVENT_TYPES[ev.type] || ev.type}</div>
                <div>{ev.content}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {convert && (
        <ConvertModal
          prospect={p}
          goals={goals}
          onClose={() => setConvert(false)}
          onConverted={() => {
            setConvert(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

/* --- Conversion prospect → client ---------------------------------------------- */

function ConvertModal({ prospect, goals, onClose, onConverted }) {
  const [password, setPassword] = useState("");
  const [goalIds, setGoalIds] = useState(prospect.goalId ? [prospect.goalId] : []);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  function toggleGoal(id) {
    setGoalIds((g) => (g.includes(id) ? g.filter((x) => x !== id) : [...g, id]));
  }

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await api(`/api/prospects/${prospect.id}/convert`, "POST", { password, goalIds });
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={result ? undefined : onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {result ? (
          <div>
            <h3><Icon name="check" /> Client inscrit !</h3>
            <p>
              L&apos;espace client de <strong>{prospect.firstName} {prospect.lastName}</strong> est activé
              et il a été placé automatiquement dans un groupe correspondant à son objectif.
              Transmettez-lui ses identifiants :
            </p>
            <div className="card mb">
              <div>Identifiant : <strong>{result.username}</strong></div>
              <div>Mot de passe : <strong>{password}</strong></div>
              <div className="muted small mt">Page de connexion : /connexion</div>
            </div>
            <button className="btn btn-primary" onClick={onConverted}>Terminer</button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <h3>Convertir {prospect.firstName} en client inscrit</h3>
            <p className="muted small">
              Le prospect passe au statut « Payé / Inscrit », sa fiche CRM et son
              historique sont conservés, son espace client est créé et il est placé
              automatiquement dans un groupe (max. 7) selon son objectif.
            </p>
            {error && <div className="alert alert-error">{error}</div>}
            <div className="field">
              <label>Mot de passe initial de son espace (min. 8 caractères) *</label>
              <input className="input" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="field">
              <label>Ses objectifs (déterminent les séances visibles et le groupe)</label>
              <div className="flex wrap">
                {goals.map((g) => (
                  <label key={g.id} className="badge" style={{ cursor: "pointer", borderColor: goalIds.includes(g.id) ? "var(--accent)" : "var(--border)" }}>
                    <input
                      type="checkbox"
                      checked={goalIds.includes(g.id)}
                      onChange={() => toggleGoal(g.id)}
                      style={{ marginRight: 6 }}
                    />
                    {g.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex">
              <button type="button" className="btn" onClick={onClose}>Annuler</button>
              <button className="btn btn-primary" disabled={loading}>
                {loading ? "Conversion…" : "Convertir"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
