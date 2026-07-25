"use client";

/**
 * Bouton + fenêtre « Ajouter un client 1v1 » (suivi individuel).
 * Crée d'un coup : le compte client, un groupe personnel d'une place relié au
 * coach choisi, et la fiche client. À l'enregistrement, on ouvre sa fiche.
 * Réservé à l'admin (les coachs, eux, ne créent pas de comptes).
 */
import { useState } from "react";
import { useRouter } from "next/navigation";

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

export default function SoloClientButton({ coaches = [] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="btn btn-primary" onClick={() => setOpen(true)}>+ Ajouter un client 1v1</button>
      {open && (
        <SoloClientModal
          coaches={coaches}
          onClose={() => setOpen(false)}
          onCreated={(client) => {
            setOpen(false);
            router.push(`/admin/clients/${client.id}`);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function SoloClientModal({ coaches, onClose, onCreated }) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    coachId: coaches.length === 1 ? coaches[0].id : "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { client } = await api("/api/clients", "POST", {
        ...form,
        coachId: form.coachId || null,
      });
      onCreated(client);
    } catch (err) {
      // Détail technique complet en console uniquement ; l'UI ne montre qu'un
      // message court et sûr (jamais d'info technique ni sensible à l'écran).
      console.error("[SoloClient] création échouée:", err);
      setError("Impossible de créer le client. Vérifiez les champs et réessayez.");
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Ajouter un client en suivi 1v1</h3>
        <p className="muted small">
          Crée son compte et un groupe personnel (une place) relié à son coach.
          Il pourra se connecter avec l&apos;identifiant qui lui sera attribué et le mot de passe choisi ici.
        </p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={submit}>
          <div className="form-row">
            <div className="field"><label>Prénom *</label><input className="input" required value={form.firstName} onChange={set("firstName")} /></div>
            <div className="field"><label>Nom *</label><input className="input" required value={form.lastName} onChange={set("lastName")} /></div>
          </div>
          <div className="form-row">
            <div className="field"><label>E-mail *</label><input className="input" type="email" required value={form.email} onChange={set("email")} /></div>
            <div className="field"><label>Téléphone</label><input className="input" value={form.phone} onChange={set("phone")} /></div>
          </div>
          <div className="form-row">
            <div className="field">
              <label>Mot de passe (min. 8) *</label>
              <input className="input" required minLength={8} value={form.password} onChange={set("password")} />
            </div>
            <div className="field">
              <label>Coach assigné</label>
              <select className="input" value={form.coachId} onChange={set("coachId")}>
                <option value="">— À définir —</option>
                {coaches.map((c) => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
              </select>
            </div>
          </div>
          <p className="muted small">L&apos;objectif et le programme se règlent ensuite sur sa fiche.</p>
          <div className="flex">
            <button type="button" className="btn" onClick={onClose}>Annuler</button>
            <button className="btn btn-primary" disabled={saving}>{saving ? "Création…" : "Créer le client"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
