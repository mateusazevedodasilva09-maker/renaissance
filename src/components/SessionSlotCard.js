"use client";

/**
 * Carte d'un créneau de séance de groupe (WeeklySlot), cliquable : au clic,
 * un panneau s'ouvre avec le CONTENU TYPE de la thématique — les exercices
 * choisis par le coach dans la bibliothèque, avec leurs paramètres
 * (séries × répétitions, repos) et la description de chaque mouvement.
 *
 * Composant volontairement partagé entre les trois agendas qui affichent des
 * créneaux hebdomadaires, pour garantir un rendu et un comportement uniques :
 *   - l'espace client (« Mes séances de la semaine ») ;
 *   - le planning du coach (page /admin/agenda) ;
 *   - la configuration admin (/admin/seances) via la prop `footer`
 *     (qui permet d'injecter le bouton « Retirer » sans dupliquer la carte).
 *
 * Le créneau reçu doit embarquer `sessionType` avec ses `exercises`
 * (SessionTypeExercise[] triés par position, chacun avec son `exercise`) —
 * c'est la forme renvoyée par listSlots() de schedule.service.js.
 */
import { useState } from "react";
import Icon from "@/components/Icon";
import ExerciseThumb from "@/components/ExerciseThumb";

export default function SessionSlotCard({ slot, footer = null }) {
  const [open, setOpen] = useState(false);
  const type = slot.sessionType;
  const items = type.exercises || [];

  return (
    <>
      <div
        className="kanban-card"
        style={{ cursor: "pointer", borderLeft: `3px solid ${type.color}` }}
        onClick={() => setOpen(true)}
        title="Voir le contenu de la séance"
      >
        <strong>{type.name}</strong>
        <div className="muted small">{slot.startTime} – {slot.endTime}</div>
        {slot.location && <div className="muted small"><Icon name="pin" /> {slot.location}</div>}
        {/* Aperçu du contenu : incite au clic et évite d'ouvrir pour rien. */}
        <div className="muted small">
          <Icon name="dumbbell" />{" "}
          {items.length > 0
            ? `${items.length} exercice${items.length > 1 ? "s" : ""} — voir le détail`
            : "Contenu à venir"}
        </div>
        {footer}
      </div>

      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <div className="flex-between mb">
              <h3 style={{ margin: 0 }}>
                <span className="dot" style={{ background: type.color }} /> {type.name}
              </h3>
              <button className="btn btn-sm" onClick={() => setOpen(false)}><Icon name="x" /></button>
            </div>
            <p className="muted small">
              <Icon name="clock" /> {slot.startTime} – {slot.endTime}
              {slot.location && <> · <Icon name="pin" /> {slot.location}</>}
            </p>
            {type.description && <p className="muted">{type.description}</p>}

            {items.length === 0 ? (
              <p className="muted">
                Le contenu type de cette séance n&apos;a pas encore été défini par le coach.
              </p>
            ) : (
              // Un bloc par exercice : vignette cliquable (GIF animé via
              // ExerciseThumb), paramètres, puis description du mouvement.
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
                    {/* Description du mouvement, alignée sous le nom
                        (28px = largeur du numéro + gouttière). */}
                    {it.exercise.description && (
                      <p className="muted small" style={{ margin: "6px 0 0 28px" }}>
                        {it.exercise.description}
                      </p>
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
