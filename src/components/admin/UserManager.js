"use client";

/**
 * Gestion des comptes (admin) : rôle, activation / désactivation,
 * réinitialisation de mot de passe.
 */
import { useState } from "react";
import Link from "next/link";

const ROLES = { ADMIN: "Admin", COACH: "Coach", CLIENT: "Client" };

/** Génère un mot de passe fort et lisible (12 caractères, classes mélangées). */
function generatePassword() {
  const sets = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnpqrstuvwxyz", "23456789", "!@#$%&*?"];
  const all = sets.join("");
  const pick = (s) => s[Math.floor(Math.random() * s.length)];
  let out = sets.map(pick); // au moins un de chaque classe
  for (let i = out.length; i < 12; i++) out.push(pick(all));
  return out.sort(() => Math.random() - 0.5).join("");
}

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
  const [deleting, setDeleting] = useState(null); // compte en cours de suppression
  const [revealed, setRevealed] = useState(() => new Set()); // ids dont le mdp est affiché
  const [error, setError] = useState(null);

  const toggleReveal = (id) =>
    setRevealed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const visible = filter ? users.filter((u) => u.role === filter) : users;

  async function patch(u, data) {
    try {
      const updated = await api(`/api/users/${u.id}`, "PATCH", data);
      setUsers(users.map((x) => (x.id === u.id ? { ...x, ...updated } : x)));
    } catch (err) { console.error(err);
      setError(err.message);
    }
  }

  async function remove(u) {
    try {
      await api(`/api/users/${u.id}`, "DELETE");
      setUsers(users.filter((x) => x.id !== u.id));
      setDeleting(null);
    } catch (err) { console.error(err);
      setError(err.message);
      setDeleting(null);
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
            <tr><th>Nom</th><th>Identifiant</th><th>Rôle</th><th>Statut</th><th>Mot de passe</th><th>Groupes coachés</th><th>Actions</th></tr>
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
                <td>
                  {u.plainPassword ? (
                    <div className="flex" style={{ gap: 6 }}>
                      <code style={{ fontFamily: "monospace", fontSize: 13 }}>
                        {revealed.has(u.id) ? u.plainPassword : "••••••••"}
                      </code>
                      <button className="btn btn-sm" onClick={() => toggleReveal(u.id)}>
                        {revealed.has(u.id) ? "Masquer" : "Afficher"}
                      </button>
                      {revealed.has(u.id) && (
                        <button className="btn btn-sm" onClick={() => navigator.clipboard?.writeText(u.plainPassword)}>
                          Copier
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="muted small" title="Mot de passe défini avant cette fonction — réinitialisez-le pour pouvoir l'afficher.">
                      — (réinitialiser)
                    </span>
                  )}
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
                    <button
                      className="btn btn-sm btn-danger"
                      disabled={u.id === sessionUserId}
                      title={u.id === sessionUserId ? "Vous ne pouvez pas supprimer votre propre compte." : "Supprimer définitivement ce compte"}
                      onClick={() => setDeleting(u)}
                    >
                      Supprimer
                    </button>
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

      {deleting && (
        <DeleteModal
          user={deleting}
          onClose={() => setDeleting(null)}
          onConfirm={() => remove(deleting)}
        />
      )}
    </div>
  );
}

function DeleteModal({ user, onClose, onConfirm }) {
  const [confirm, setConfirm] = useState("");
  const fullName = `${user.firstName} ${user.lastName}`.trim();
  const canDelete = confirm.trim().toUpperCase() === "SUPPRIMER";
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Supprimer le compte — {fullName}</h3>
        <div className="alert alert-error" style={{ marginBottom: 12 }}>
          Cette action est <strong>définitive</strong> et irréversible.
        </div>
        <p className="muted small" style={{ marginTop: 0 }}>
          {user.role === "CLIENT"
            ? "La fiche client et toutes ses données (mesures, programmes, rapports…) seront effacées."
            : "Le compte sera effacé."}{" "}
          L'historique créé par cette personne (tâches, notes, événements CRM, groupes coachés…) est conservé, mais le nom de l'auteur est retiré.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (canDelete) onConfirm();
          }}
        >
          <div className="field">
            <label>Tapez <strong>SUPPRIMER</strong> pour confirmer</label>
            <input
              className="input"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="SUPPRIMER"
              autoFocus
            />
          </div>
          <div className="flex">
            <button type="button" className="btn" onClick={onClose}>Annuler</button>
            <button className="btn btn-danger" disabled={!canDelete}>Supprimer définitivement</button>
          </div>
        </form>
      </div>
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
            <div className="flex" style={{ gap: 8 }}>
              <input className="input" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Saisir ou générer…" />
              <button type="button" className="btn" onClick={() => setPassword(generatePassword())}>Générer</button>
            </div>
            <div className="muted small" style={{ marginTop: 6 }}>
              Le mot de passe restera visible dans la liste pour que vous puissiez le transmettre à la personne.
            </div>
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
