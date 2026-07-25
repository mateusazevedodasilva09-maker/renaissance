"use client";

/**
 * « Objectif = groupe = programme ».
 * Pour chaque objectif : la liste des clients qui le partagent (le groupe) et
 * UN programme unique généré pour l'objectif. Le programme devient visible dans
 * l'espace de tous les clients de l'objectif (sauf ceux ayant un programme
 * personnel, qui prime).
 */
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import ExerciseThumb from "@/components/ExerciseThumb";
import { mapGoalToGenerator } from "@/lib/goalMap";

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

export default function ObjectiveManager({ objectives, generators }) {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Objectifs & programmes</h1>
          <div className="subtitle">
            Un objectif regroupe les clients qui le partagent et porte un programme unique.
            Le programme d&apos;un objectif est visible par tous ses clients (un programme personnel reste prioritaire).
          </div>
        </div>
      </div>

      {objectives.length === 0 && (
        <div className="card"><p className="muted">Aucun objectif défini. Créez-en dans « Séances &amp; planning ».</p></div>
      )}

      <div className="grid grid-2">
        {objectives.map((o) => (
          <ObjectiveCard key={o.id} objective={o} generators={generators} />
        ))}
      </div>
    </div>
  );
}

function ObjectiveCard({ objective, generators }) {
  const router = useRouter();
  const [generatorKey, setGeneratorKey] = useState(generators[0]?.key || "");
  const [params, setParams] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generator = generators.find((g) => g.key === generatorKey);
  const program = objective.program;
  // L'objectif pilote la génération : le coach ne saisit que le niveau / les jours.
  const mappedGoal = mapGoalToGenerator(objective.label);
  const coachParams = (generator?.paramsSchema || []).filter((f) => f.name !== "goal");

  async function generate(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const finalParams = { ...params, goal: mappedGoal };
      await api("/api/programs", "POST", { goalId: objective.id, generatorKey, params: finalParams });
      router.refresh();
    } catch (err) { console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <div className="flex-between mb">
        <h3 style={{ margin: 0 }}><Icon name="target" /> {objective.label}</h3>
        <span className="badge"><Icon name="users" /> {objective.members.length} client{objective.members.length > 1 ? "s" : ""}</span>
      </div>
      {objective.description && <p className="muted small">{objective.description}</p>}

      {/* Le « groupe » : les clients de cet objectif. */}
      {objective.members.length === 0 ? (
        <p className="muted small">Aucun client sur cet objectif pour l&apos;instant.</p>
      ) : (
        <div className="flex wrap mb">
          {objective.members.map((m) => (
            <Link key={m.id} href={`/admin/clients/${m.id}`} className="badge" style={{ cursor: "pointer" }}>{m.name}</Link>
          ))}
        </div>
      )}

      {/* Générateur du programme de l'objectif : l'objectif est déjà connu,
          le coach ne renseigne que le niveau / le nombre de jours. */}
      <form onSubmit={generate} className="flex wrap mt" style={{ alignItems: "flex-end" }}>
        {coachParams.map((f) => (
          <div key={f.name} className="field" style={{ margin: 0 }}>
            <label className="small">{f.label}</label>
            <input
              className="input"
              style={{ width: 110 }}
              type="number"
              min={f.min}
              max={f.max}
              value={params[f.name] ?? f.default ?? ""}
              onChange={(e) => setParams({ ...params, [f.name]: e.target.value })}
            />
          </div>
        ))}
        {generators.length > 1 && (
          <div className="field" style={{ margin: 0 }}>
            <label className="small">Stratégie</label>
            <select className="input" style={{ width: "auto" }} value={generatorKey} onChange={(e) => setGeneratorKey(e.target.value)}>
              {generators.map((g) => (<option key={g.key} value={g.key}>{g.label}</option>))}
            </select>
          </div>
        )}
        <button className="btn btn-primary btn-sm" disabled={loading}>
          {loading ? "Génération…" : program ? "Regénérer" : "Générer le programme"}
        </button>
      </form>
      {error && <div className="alert alert-error mt" onClick={() => setError(null)}>{error}</div>}

      {/* Programme actif de l'objectif. */}
      {program ? (
        <div className="mt">
          <div className="flex-between mb">
            <strong>{program.title}</strong>
            <span className="badge"><span className="dot" style={{ background: "var(--green)" }} /> Actif — visible par le groupe</span>
          </div>
          {program.sessions.map((s) => (
            <div key={s.id} className="card" style={{ background: "var(--bg-soft)", marginBottom: 8 }}>
              <h4 style={{ marginBottom: 8 }}>{s.name}</h4>
              {/* Conteneur défilable : évite que le tableau déborde et casse la
                  mise en page de la carte étroite (grille 2 colonnes). */}
              <div style={{ overflowX: "auto" }}>
                <table className="table">
                  <thead><tr><th>Exercice</th><th>Séries</th><th>Reps</th><th>Repos</th></tr></thead>
                  <tbody>
                    {s.exercises.map((ex) => (
                      <tr key={ex.id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <ExerciseThumb exercise={ex.exercise} size={30} />
                            {ex.exercise.name}
                          </div>
                        </td>
                        <td>{ex.sets}</td>
                        <td>{ex.reps}</td>
                        <td>{ex.restSec ? `${ex.restSec}s` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted small mt">Aucun programme pour cet objectif. Générez-en un ci-dessus.</p>
      )}
    </div>
  );
}
