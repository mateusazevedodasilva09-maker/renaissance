"use client";

/**
 * Espace de création de programme (page Programmes, admin & coach).
 * On choisit un client dans la liste autorisée (pour un coach : ses clients
 * uniquement), puis on construit son programme à la main via l'éditeur complet
 * (jours + sélecteur d'exercices sur silhouette + modèles réutilisables).
 */
import { useState } from "react";
import ProgramEditor from "@/components/admin/ProgramEditor";
import Icon from "@/components/Icon";

async function api(path) {
  const res = await fetch(path);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Erreur");
  return json.data;
}

export default function ProgramBuilder({ clients = [], exercises = [] }) {
  const [clientId, setClientId] = useState("");
  const [program, setProgram] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function loadClient(id) {
    setClientId(id);
    setProgram(null);
    setLoaded(false);
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const client = await api(`/api/clients/${id}`);
      const active = client.programs?.find((p) => p.status === "ACTIVE") || null;
      setProgram(active);
      setLoaded(true);
    } catch (err) {
      console.error(err);
      setError("Impossible de charger ce client.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card mb">
      <h3><Icon name="dumbbell" /> Créer / modifier un programme</h3>
      <p className="muted small">
        Choisissez un client, puis construisez sa séance : ajoutez des jours et des exercices
        via la silhouette (cliquez un muscle pour filtrer). Vous pouvez enregistrer un programme
        comme modèle et l&apos;appliquer à d&apos;autres clients.
      </p>

      <div className="field" style={{ maxWidth: 380 }}>
        <label>Client à qui assigner le programme</label>
        <select className="input" value={clientId} onChange={(e) => loadClient(e.target.value)}>
          <option value="">— Choisir un client —</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {error && <div className="alert alert-error" onClick={() => setError(null)}>{error}</div>}
      {loading && <p className="muted">Chargement…</p>}

      {clientId && loaded && (
        <div className="mt" style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
          <ProgramEditor
            key={program?.id || `blank-${clientId}`}
            initialProgram={program}
            exercises={exercises}
            clientId={clientId}
            onProgramReplaced={() => loadClient(clientId)}
          />
        </div>
      )}
    </div>
  );
}
