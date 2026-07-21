"use client";

/**
 * Groupes d'entraînement : composition automatique par objectif (max 7 par
 * défaut), assignation d'un coach par l'admin, conseil de la semaine.
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import LineChart from "@/components/charts/LineChart";

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

export default function GroupManager({ initialGroups, goals, staff, stats = {}, isAdmin }) {
  const [groups, setGroups] = useState(initialGroups);
  const [editing, setEditing] = useState(null); // groupe en cours d'édition
  const [creating, setCreating] = useState(false);
  const [advising, setAdvising] = useState(null); // groupe pour le conseil
  const [error, setError] = useState(null);

  const coaches = staff.filter((s) => s.role === "COACH" || s.role === "ADMIN");

  // Groupes rangés en colonnes par type (objectif commun).
  const columns = useMemo(() => {
    const map = new Map();
    for (const g of groups) {
      const key = g.goal?.label || "Sans objectif";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(g);
    }
    return [...map.entries()];
  }, [groups]);

  async function remove(g) {
    try {
      await api(`/api/groups/${g.id}`, "DELETE");
      setGroups(groups.filter((x) => x.id !== g.id));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Groupes d&apos;entraînement</h1>
          <div className="subtitle">
            Les nouveaux inscrits sont placés automatiquement dans un groupe de leur objectif (max. 7 par défaut).
          </div>
        </div>
        {isAdmin && <button className="btn btn-primary" onClick={() => setCreating(true)}>+ Nouveau groupe</button>}
      </div>
      {error && <div className="alert alert-error" onClick={() => setError(null)}>{error}</div>}

      {/* Colonnes par type de groupe (objectif commun). */}
      <div className="kanban">
        {columns.map(([label, cols]) => (
          <div key={label} className="kanban-col" style={{ minWidth: 300, width: 300 }}>
            <div className="kanban-col-header"><Icon name="target" /> {label}</div>
            {cols.map((g) => (
              <GroupCard
                key={g.id}
                group={g}
                stat={stats[g.id]}
                isAdmin={isAdmin}
                onAdvise={() => setAdvising(g)}
                onEdit={() => setEditing(g)}
                onRemove={() => remove(g)}
              />
            ))}
          </div>
        ))}
        {groups.length === 0 && (
          <div className="card"><p className="muted">Aucun groupe. Ils se créent automatiquement à l&apos;inscription des clients, ou manuellement.</p></div>
        )}
      </div>

      {(creating || editing) && (
        <GroupModal
          group={editing}
          goals={goals}
          coaches={coaches}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={(g) => {
            setGroups(editing ? groups.map((x) => (x.id === g.id ? g : x)) : [...groups, g]);
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
      {advising && <AdviceModal group={advising} onClose={() => setAdvising(null)} />}
    </div>
  );
}

/* --- Carte d'un groupe ----------------------------------------------------------- */

/**
 * Carte d'un groupe : caractéristiques (nom, objectif, coach, effectif) puis,
 * au clic, les performances moyennes du groupe en petit juste en dessous
 * (niveau moyen + courbe du poids moyen). Le bouton « Conseil de la semaine »
 * passe en vert quand un conseil a déjà été envoyé pour la semaine en cours.
 */
function GroupCard({ group: g, stat, isAdmin, onAdvise, onEdit, onRemove }) {
  const [open, setOpen] = useState(false);
  const sent = stat?.hasAdviceThisWeek;

  return (
    <div className="kanban-card" style={{ cursor: "default", padding: 12 }}>
      <div
        className="flex-between"
        style={{ cursor: "pointer", alignItems: "flex-start" }}
        onClick={() => setOpen(!open)}
        title="Voir les performances moyennes"
      >
        <div>
          <strong>{g.name}</strong>
          <div className="muted small">
            <Icon name="user" /> {g.coach ? `${g.coach.firstName} ${g.coach.lastName}` : "Coach —"}
          </div>
        </div>
        <span className="badge">{g._count?.clients ?? g.clients.length} / {g.capacity}</span>
      </div>

      {/* Performances moyennes, en petit, sous les caractéristiques du groupe. */}
      {open && (
        <div className="mt" style={{ borderTop: "1px solid var(--border)", paddingTop: 8 }}>
          <div className="flex wrap mb" style={{ gap: 12 }}>
            <div><div className="stat-value" style={{ fontSize: 18 }}>{stat?.avgLevel ?? "—"}</div><div className="stat-label">Niveau moyen</div></div>
            <div><div className="stat-value" style={{ fontSize: 18 }}>{stat?.memberCount ?? g.clients.length}</div><div className="stat-label">Membres</div></div>
          </div>
          {stat?.weightSeries?.length > 0 ? (
            <>
              <div className="muted small">Poids moyen du groupe</div>
              <LineChart points={stat.weightSeries} color="var(--accent)" unit="kg" height={120} />
            </>
          ) : (
            <p className="muted small" style={{ margin: 0 }}>Pas encore assez de données de suivi pour tracer la moyenne.</p>
          )}
        </div>
      )}

      {g.clients.length === 0 && <p className="muted small" style={{ marginTop: 8 }}>Aucun inscrit pour le moment.</p>}
      {g.clients.map((c) => (
        <div key={c.id} style={{ padding: "4px 0", borderBottom: "1px solid var(--border)" }}>
          <Link href={`/admin/clients/${c.id}`}>{c.user?.firstName} {c.user?.lastName}</Link>
        </div>
      ))}

      <div className="flex wrap mt">
        <button
          className="btn btn-sm"
          onClick={onAdvise}
          style={sent ? { borderColor: "var(--green)", color: "var(--green)" } : undefined}
        >
          <Icon name={sent ? "check" : "bulb"} /> {sent ? "Conseil envoyé" : "Conseil de la semaine"}
        </button>
        {isAdmin && <button className="btn btn-sm" onClick={onEdit}>Modifier</button>}
        {isAdmin && g.clients.length === 0 && (
          <button className="btn btn-sm btn-danger" onClick={onRemove}>Supprimer</button>
        )}
      </div>
    </div>
  );
}

/* --- Création / édition d'un groupe --------------------------------------------- */

function GroupModal({ group, goals, coaches, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: group?.name || "",
    goalId: group?.goalId || "",
    coachId: group?.coachId || "",
    capacity: group?.capacity ?? 7,
    isActive: group?.isActive ?? true,
  });
  const [error, setError] = useState(null);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    try {
      const saved = group
        ? await api(`/api/groups/${group.id}`, "PATCH", form)
        : await api("/api/groups", "POST", form);
      onSaved(saved);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{group ? `Modifier — ${group.name}` : "Nouveau groupe"}</h3>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={submit}>
          <div className="field"><label>Nom *</label><input className="input" required value={form.name} onChange={set("name")} /></div>
          <div className="form-row">
            <div className="field">
              <label>Objectif commun</label>
              <select className="input" value={form.goalId} onChange={set("goalId")}>
                <option value="">— Aucun —</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>{g.label}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Coach assigné</label>
              <select className="input" value={form.coachId} onChange={set("coachId")}>
                <option value="">— Aucun —</option>
                {coaches.map((c) => (
                  <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label>Capacité (max. d&apos;inscrits)</label>
            <input className="input" type="number" min={1} value={form.capacity} onChange={set("capacity")} />
          </div>
          <div className="flex">
            <button type="button" className="btn" onClick={onClose}>Annuler</button>
            <button className="btn btn-primary">{group ? "Enregistrer" : "Créer"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* --- Conseil de la semaine ------------------------------------------------------- */

function AdviceModal({ group, onClose }) {
  const [content, setContent] = useState("");
  const [history, setHistory] = useState(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api(`/api/advice?groupId=${group.id}`, "GET")
      .then((h) => {
        setHistory(h);
        const now = new Date();
        const current = h.find((a) => {
          const d = new Date(a.weekStart);
          return now - d < 7 * 24 * 3600 * 1000 && now >= d;
        });
        if (current) setContent(current.content);
      })
      .catch(() => setHistory([]));
  }, [group.id]);

  async function submit(e) {
    e.preventDefault();
    try {
      await api("/api/advice", "POST", { content, groupId: group.id });
      setSaved(true);
      setTimeout(onClose, 900);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3><Icon name="bulb" /> Conseil de la semaine — {group.name}</h3>
        <p className="muted small">Visible par tous les inscrits du groupe dans leur espace.</p>
        {error && <div className="alert alert-error">{error}</div>}
        {saved && <div className="alert alert-success">✓ Conseil enregistré</div>}
        <form onSubmit={submit}>
          <div className="field">
            <textarea className="input" required rows={4} placeholder="Votre conseil pour cette semaine…" value={content} onChange={(e) => setContent(e.target.value)} />
          </div>
          <div className="flex">
            <button type="button" className="btn" onClick={onClose}>Fermer</button>
            <button className="btn btn-primary">Publier</button>
          </div>
        </form>
        {history?.length > 0 && (
          <div className="mt">
            <div className="section-label" style={{ padding: 0 }}>Historique</div>
            {history.map((a) => (
              <div key={a.id} className="small" style={{ padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                <span className="muted">Semaine du {new Date(a.weekStart).toLocaleDateString("fr-FR")} :</span> {a.content}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
