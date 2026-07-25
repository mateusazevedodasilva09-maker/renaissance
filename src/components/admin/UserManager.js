"use client";

/**
 * Gestion des comptes (admin) : rôle, activation / désactivation,
 * réinitialisation de mot de passe.
 */
import { useState } from "react";
import Link from "next/link";

const ROLES = { ADMIN: "Admin", COACH: "Coach", CLIENT: "Client" };

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

export default function UserManager({ initialUsers, sessionUserId }) {
  const [users, setUsers] = useState(initialUsers);
  const [filter, setFilter] = useState("");
  const [resetting, setResetting] = useState(null);
  const [error, setError] = useState(null);

  const visible = filter ? users.filter((u) => u.role === filter) : users;

  async function patch(u, data) {
    try {
      const updated = await api(`/api/users/${u.id}`, "PATCH", data);
      setUsers(users.map((x) => (x.id === u.id ? { ...x, ...updated } : x)));
    } catch (err) { console.error(err);
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Utilisateurs</h1>
          <div className="subtitle">{users.length} compte(s) — statut, rôle et mot de passe.</div>
        </div>
        <select className="input" style={{ width: "auto" }} value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">Tous les rôles</option>
          {Object.entries(ROLES).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>
      {error && <div className="alert alert-error" onClick={() => setError(null)}>{error}</div>}

      <div className="card">
        <table className="table">
          <thead>
            <tr><th>Nom</th><th>Identifiant</th><th>Rôle</th><th>Statut</th><th>Groupes coachés</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {visible.map((u) => (
              <tr key={u.id} style={{ opacity: u.isActive ? 1 : 0.55 }}>
                <td>
                  <strong>{u.firstName} {u.lastName}</strong>
                  {u.client && (
                    <div><Link href={`/admin/clients/${u.client.id}`} className="muted small">Fiche client →</Link></div>
                  )}
                </td>
                <td className="muted">{u.username}<div className="small">{u.email}</div></td>
                <td>
                  <select
                    className="input"
                    style={{ width: "auto", padding: "4px 8px" }}
                    value={u.role}
                    disabled={u.id === sessionUserId}
                    onChange={(e) => patch(u, { role: e.target.value })}
                  >
                    {Object.entries(ROLES).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <span className="badge">
                    <span className="dot" style={{ background: u.isActive ? "var(--green)" : "var(--red)" }} />
                    {u.isActive ? "Actif" : "Désactivé"}
                  </span>
                </td>
                <td className="small muted">
                  {u.groupsCoached?.length ? u.groupsCoached.map((g) => g.name).join(", ") : "—"}
                </td>
                <td>
                  <div className="flex wrap">
                    <button
                      className={`btn btn-sm${u.isActive ? " btn-danger" : ""}`}
                      disabled={u.id === sessionUserId}
                      onClick={() => patch(u, { isActive: !u.isActive })}
                    >
                      {u.isActive ? "Désactiver" : "Réactiver"}
                    </button>
                    <button className="btn btn-sm" onClick={() => setResetting(u)}>Mot de passe</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {resetting && (
        <ResetModal
          user={resetting}
          onClose={() => setResetting(null)}
          onSave={async (password) => {
            await patch(resetting, { password });
            setResetting(null);
          }}
        />
      )}
    </div>
  );
}

function ResetModal({ user, onClose, onSave }) {
  const [password, setPassword] = useState("");
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Nouveau mot de passe — {user.firstName} {user.lastName}</h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave(password);
          }}
        >
          <div className="field">
            <label>Mot de passe (min. 8 caractères) *</label>
            <input className="input" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="flex">
            <button type="button" className="btn" onClick={onClose}>Annuler</button>
            <button className="btn btn-primary">Enregistrer</button>
          </div>
        </form>
      </div>
    </div>
  );
}
