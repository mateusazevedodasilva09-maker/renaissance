"use client";

/**
 * Pipeline CRM : obligations journalières (prospects à appeler aujourd'hui,
 * triés par priorité), vue kanban par statut (drag & drop natif), recherche,
 * création de prospect et gestion des statuts de pipeline.
 */
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import { SOURCES, PRIORITIES } from "./ProspectFile";

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

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) : "—";

export default function CrmBoard({ initialProspects, initialStatuses, goals = [], obligations = [] }) {
  const router = useRouter();
  const [prospects, setProspects] = useState(initialProspects);
  const [statuses, setStatuses] = useState(initialStatuses);
  const [search, setSearch] = useState("");
  const [dragOver, setDragOver] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [showStatuses, setShowStatuses] = useState(false);
  const [error, setError] = useState(null);
  // Distingue un vrai clic (ouvrir la fiche) d'un glisser-déposer (changer de
  // statut) : sans ça, le <div draggable> avale le clic du lien et la fiche
  // « ne s'affiche pas directement ».
  const draggingId = useRef(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return prospects;
    return prospects.filter((p) =>
      `${p.firstName} ${p.lastName} ${p.email} ${p.phone} ${p.generalNote || ""}`.toLowerCase().includes(q)
    );
  }, [prospects, search]);

  async function moveProspect(prospectId, statusId) {
    const prospect = prospects.find((p) => p.id === prospectId);
    if (!prospect || prospect.statusId === statusId) return;
    // Optimiste : on met à jour l'affichage immédiatement.
    const status = statuses.find((s) => s.id === statusId);
    setProspects((ps) => ps.map((p) => (p.id === prospectId ? { ...p, statusId, status } : p)));
    try {
      await api(`/api/prospects/${prospectId}`, "PATCH", { statusId });
    } catch (err) { console.error(err);
      setError(err.message);
      setProspects((ps) => ps.map((p) => (p.id === prospectId ? prospect : p)));
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>CRM & Pipeline</h1>
          <div className="subtitle">{prospects.length} prospect(s) — glissez une carte pour changer de statut.</div>
        </div>
        <div className="flex wrap">
          <button className="btn" onClick={() => setShowStatuses(true)}><Icon name="settings" /> Statuts</button>
          <button className="btn btn-primary" onClick={() => setShowNew(true)}>+ Nouveau prospect</button>
        </div>
      </div>

      {error && <div className="alert alert-error" onClick={() => setError(null)}>{error} (cliquer pour fermer)</div>}

      {obligations.length > 0 && (
        <div className="card mb" style={{ borderColor: "var(--accent)" }}>
          <h3><Icon name="clipboard" /> Obligations journalières — {obligations.length} prospect(s) à contacter aujourd&apos;hui</h3>
          <table className="table">
            <thead>
              <tr><th>Priorité</th><th>Prospect</th><th>Action</th><th>Échéance</th><th>Statut</th></tr>
            </thead>
            <tbody>
              {obligations.map((o) => (
                <tr key={o.id}>
                  <td style={{ color: PRIORITIES[o.priority]?.color }}>{PRIORITIES[o.priority]?.label || o.priority}</td>
                  <td><Link href={`/admin/crm/${o.id}`} style={{ fontWeight: 600 }}>{o.firstName} {o.lastName}</Link></td>
                  <td>{o.nextActionLabel || "Contacter"}</td>
                  <td>{o.nextActionAt ? new Date(o.nextActionAt).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                  <td><span className="badge"><span className="dot" style={{ background: o.status?.color }} />{o.status?.label}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <input
        className="input mb"
        placeholder="Rechercher un prospect (nom, e-mail, téléphone, note…)"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="kanban">
        {statuses.map((status) => {
          const cards = filtered.filter((p) => p.statusId === status.id);
          return (
            <div
              key={status.id}
              className={`kanban-col${dragOver === status.id ? " drag-over" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(status.id);
              }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(null);
                moveProspect(e.dataTransfer.getData("text/plain"), status.id);
              }}
            >
              <div className="kanban-col-header">
                <span className="badge">
                  <span className="dot" style={{ background: status.color }} />
                  {status.label}
                </span>
                <span className="muted">{cards.length}</span>
              </div>
              {cards.map((p) => (
                <div
                  key={p.id}
                  className="kanban-card"
                  role="button"
                  tabIndex={0}
                  style={{ cursor: "pointer" }}
                  draggable
                  onDragStart={(e) => {
                    draggingId.current = p.id;
                    e.dataTransfer.setData("text/plain", p.id);
                  }}
                  onDragEnd={() => { draggingId.current = null; }}
                  onClick={(e) => {
                    // Ne pas naviguer si le clic vient d'un contrôle interne
                    // (sélecteur de statut, lien) ou si un drag vient d'avoir lieu.
                    if (draggingId.current) return;
                    if (e.target.closest("select, a, button")) return;
                    router.push(`/admin/crm/${p.id}`);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") router.push(`/admin/crm/${p.id}`);
                  }}
                >
                  <Link href={`/admin/crm/${p.id}`} style={{ fontWeight: 600 }} onClick={(e) => e.stopPropagation()}>
                    {p.firstName} {p.lastName}
                  </Link>
                  <div className="muted small">
                    1er contact : {fmtDate(p.firstContactAt)} · dernier : {fmtDate(p.lastContactAt)}
                  </div>
                  <div className="small" style={{ marginTop: 4, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                    {p.priority && p.priority !== "NORMAL" && (
                      <span style={{ color: PRIORITIES[p.priority]?.color, fontWeight: 600 }}>{PRIORITIES[p.priority]?.label}</span>
                    )}
                    {p.goal && <span><Icon name="target" /> {p.goal.label}</span>}
                  </div>
                  {p.nextActionAt && (
                    <div className="small muted" style={{ marginTop: 4 }}>
                      <Icon name="clock" /> {p.nextActionLabel || "Action"} · {fmtDate(p.nextActionAt)}
                    </div>
                  )}
                  <div className="mt" style={{ marginTop: 8 }}>
                    <select
                      className="input"
                      style={{ padding: "4px 8px", fontSize: 12 }}
                      value={p.statusId}
                      onChange={(e) => moveProspect(p.id, e.target.value)}
                    >
                      {statuses.map((s) => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
              {cards.length === 0 && <div className="muted small" style={{ textAlign: "center", padding: 12 }}>—</div>}
            </div>
          );
        })}
      </div>

      {showNew && (
        <NewProspectModal
          goals={goals}
          onClose={() => setShowNew(false)}
          onCreated={(p) => {
            setProspects([p, ...prospects]);
            setShowNew(false);
          }}
        />
      )}
      {showStatuses && (
        <StatusesModal
          statuses={statuses}
          onClose={() => setShowStatuses(false)}
          onChange={setStatuses}
        />
      )}
    </div>
  );
}

/* --- Modale : nouveau prospect ------------------------------------------------ */

function NewProspectModal({ goals = [], onClose, onCreated }) {
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    goalId: "", priority: "NORMAL", generalNote: "",
  });
  const [error, setError] = useState(null);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    try {
      onCreated(await api("/api/prospects", "POST", form));
    } catch (err) { console.error(err);
      setError(err.message);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Nouveau prospect</h3>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={submit}>
          <div className="form-row">
            <div className="field"><label>Prénom *</label><input className="input" required value={form.firstName} onChange={set("firstName")} /></div>
            <div className="field"><label>Nom *</label><input className="input" required value={form.lastName} onChange={set("lastName")} /></div>
          </div>
          <div className="form-row">
            <div className="field"><label>E-mail *</label><input className="input" type="email" required value={form.email} onChange={set("email")} /></div>
            <div className="field"><label>Téléphone *</label><input className="input" required value={form.phone} onChange={set("phone")} /></div>
          </div>
          <div className="form-row">
            <div className="field">
              <label>Objectif</label>
              <select className="input" value={form.goalId} onChange={set("goalId")}>
                <option value="">— À définir —</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>{g.label}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Priorité</label>
              <select className="input" value={form.priority} onChange={set("priority")}>
                {Object.entries(PRIORITIES).map(([v, p]) => (
                  <option key={v} value={v}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="field"><label>Note générale</label><textarea className="input" value={form.generalNote} onChange={set("generalNote")} /></div>
          <div className="flex">
            <button type="button" className="btn" onClick={onClose}>Annuler</button>
            <button className="btn btn-primary">Créer</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* --- Modale : gestion des statuts de pipeline ---------------------------------- */

function StatusesModal({ statuses, onClose, onChange }) {
  const [label, setLabel] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [error, setError] = useState(null);

  async function addStatus(e) {
    e.preventDefault();
    try {
      const created = await api("/api/pipeline/statuses", "POST", { label, color });
      onChange([...statuses, created]);
      setLabel("");
    } catch (err) { console.error(err);
      setError(err.message);
    }
  }

  async function removeStatus(s) {
    try {
      await api(`/api/pipeline/statuses/${s.id}`, "DELETE");
      onChange(statuses.filter((x) => x.id !== s.id));
    } catch (err) { console.error(err);
      setError(err.message);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Statuts de la pipeline</h3>
        <p className="muted small">
          Ajoutez ou supprimez des statuts. Un statut utilisé par des prospects
          ne peut pas être supprimé.
        </p>
        {error && <div className="alert alert-error">{error}</div>}
        {statuses.map((s) => (
          <div key={s.id} className="flex-between" style={{ padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
            <span className="badge">
              <span className="dot" style={{ background: s.color }} />
              {s.label}
              {s.isWon && " · conversion"}
              {s.isLost && " · terminal"}
            </span>
            <button className="btn btn-sm btn-danger" onClick={() => removeStatus(s)}><Icon name="x" /></button>
          </div>
        ))}
        <form onSubmit={addStatus} className="flex mt wrap">
          <input className="input" style={{ flex: 2, minWidth: 140 }} placeholder="Nouveau statut…" required value={label} onChange={(e) => setLabel(e.target.value)} />
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ width: 44, height: 40, border: "none", background: "none", cursor: "pointer" }} />
          <button className="btn btn-primary btn-sm">Ajouter</button>
        </form>
        <button className="btn mt" onClick={onClose}>Fermer</button>
      </div>
    </div>
  );
}
