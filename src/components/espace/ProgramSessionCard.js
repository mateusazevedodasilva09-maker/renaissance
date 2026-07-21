"use client";

/**
 * Carte cliquable d'une séance de PROGRAMME personnel (ProgramSession), côté
 * client. Au clic, un panneau s'ouvre avec le détail des exercices (vignette
 * animée, séries × répétitions, repos, note et description du mouvement).
 *
 * Pendant du composant SessionSlotCard (séances de groupe), mais pour les
 * séances du programme perso, afin d'offrir le même geste « je clique, je vois
 * le contenu » partout dans l'espace client.
 */
import { useState } from "react";
import Icon from "@/components/Icon";
import ExerciseThumb from "@/components/ExerciseThumb";

export default function ProgramSessionCard({ session, weekdayLabel = null }) {
  const [open, setOpen] = useState(false);
  const items = session.exercises || [];

  return (
    <>
      <div
        className="kanban-card"
        style={{ cursor: "pointer", borderLeft: "3px solid var(--violet)" }}
        onClick={() => setOpen(true)}
        title="Voir le contenu de la séance"
      >
        <strong><Icon name="dumbbell" /> {session.name}</strong>
        <div className="muted small">
          {items.length} exercice{items.length > 1 ? "s" : ""} · programme perso — voir le détail
        </div>
      </div>

      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <div className="flex-between mb">
              <h3 style={{ margin: 0 }}>
                <Icon name="dumbbell" /> {session.name}
              </h3>
              <button className="btn btn-sm" onClick={() => setOpen(false)}><Icon name="x" /></button>
            </div>
            {weekdayLabel && <p className="muted small">{weekdayLabel}</p>}

            {items.length === 0 ? (
              <p className="muted">Aucun exercice pour cette séance.</p>
            ) : (
              <div style={{ maxHeight: "55vh", overflowY: "auto" }}>
                {items.map((it, i) => (
                  <div key={it.id} style={{ padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span className="muted small" style={{ width: 18, textAlign: "right" }}>{i + 1}.</span>
                      <ExerciseThumb exercise={it.exercise} size={44} />
                      <div style={{ flex: 1 }}>
                        <strong>{it.exercise.name}</strong>
                        <div className="muted small">
                          {it.sets} × {it.reps}
                          {it.restSec ? ` · repos ${it.restSec} s` : ""}
                          {it.exercise.muscleGroup ? ` · ${it.exercise.muscleGroup}` : ""}
                        </div>
                      </div>
                    </div>
                    {it.notes && (
                      <p className="small" style={{ margin: "6px 0 0 28px" }}>{it.notes}</p>
                    )}
                    {it.exercise.description && (
                      <p className="muted small" style={{ margin: "6px 0 0 28px" }}>{it.exercise.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
