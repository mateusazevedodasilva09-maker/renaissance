"use client";

/**
 * Vignette d'exercice cliquable : affiche la miniature, et au clic
 * ouvre une fiche avec le GIF animé du mouvement + les infos.
 * Réutilisée dans le programme client, les séances et la fiche client admin.
 */
import { useState } from "react";
import Icon from "@/components/Icon";

export default function ExerciseThumb({ exercise, size = 44 }) {
  const [open, setOpen] = useState(false);
  if (!exercise) return null;
  const hasMedia = exercise.imageUrl || exercise.gifUrl;

  return (
    <>
      <span
        style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: hasMedia ? "pointer" : "default" }}
        onClick={() => hasMedia && setOpen(true)}
        title={hasMedia ? "Voir l'animation" : undefined}
      >
        {exercise.imageUrl ? (
          <img
            src={exercise.imageUrl}
            alt={exercise.name}
            loading="lazy"
            style={{ width: size, height: size, objectFit: "cover", borderRadius: 8, background: "#fff", flexShrink: 0 }}
          />
        ) : (
          <span style={{ width: size, height: size, borderRadius: 8, background: "var(--bg)", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon name="dumbbell" size={28} style={{ color: "var(--text-dim)" }} />
          </span>
        )}
      </span>

      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <div className="flex-between mb">
              <h3 style={{ margin: 0 }}>{exercise.name}</h3>
              <button className="btn btn-sm" onClick={() => setOpen(false)}><Icon name="x" /></button>
            </div>
            {exercise.gifUrl ? (
              <img src={exercise.gifUrl} alt={`Animation : ${exercise.name}`} style={{ width: "100%", borderRadius: 10, background: "#fff" }} />
            ) : exercise.imageUrl ? (
              <img src={exercise.imageUrl} alt={exercise.name} style={{ width: "100%", borderRadius: 10, background: "#fff" }} />
            ) : null}
            <div className="flex wrap mt">
              {exercise.muscleGroup && <span className="badge"><Icon name="dumbbell" /> {exercise.muscleGroup}</span>}
              {exercise.target && <span className="badge"><Icon name="target" /> {exercise.target}</span>}
              {exercise.equipment && <span className="badge"><Icon name="briefcase" /> {exercise.equipment}</span>}
            </div>
            {exercise.description && (
              <p className="muted small mt" style={{ whiteSpace: "pre-wrap", marginBottom: 0 }}>
                {exercise.description}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
