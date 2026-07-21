"use client";

/**
 * Affichage dédié « séances du jour » de l'espace coach — volontairement
 * distinct du planning hebdomadaire : chaque séance d'aujourd'hui est une carte
 * proéminente (horaire, groupe, effectif, personnes à entraîner avec leur
 * niveau), et un bouton ouvre le contenu de la séance (exercices + paramètres).
 */
import { useState } from "react";
import { WEEKDAY_LABELS } from "@/lib/dates";
import Icon from "@/components/Icon";
import ExerciseThumb from "@/components/ExerciseThumb";

/** Groupes concernés par un créneau : placement explicite prioritaire, sinon
 *  repli par objectif (créneau ouvert à tous si la séance n'a pas d'objectif). */
function attendingGroups(slot, groups) {
  if (slot.groupId) return groups.filter((g) => g.id === slot.groupId);
  const goalIds = new Set((slot.sessionType?.goalLinks || []).map((l) => l.goalId));
  if (goalIds.size === 0) return groups;
  return groups.filter((g) => g.goalId && goalIds.has(g.goalId));
}

export default function TodaySessions({ dayView }) {
  const { weekday, slots = [], groups = [] } = dayView || {};
  const [openSlot, setOpenSlot] = useState(null);
  const dayLabel = WEEKDAY_LABELS[weekday] || "";

  return (
    <section className="mb">
      <div className="flex-between wrap mb">
        <h2 style={{ margin: 0 }}>
          <Icon name="flame" size={20} /> Séances du jour — {dayLabel.toLowerCase()}
        </h2>
        <span className="badge">
          <span className="dot" style={{ background: slots.length ? "var(--accent)" : "var(--text-dim)" }} />
          {slots.length} séance{slots.length > 1 ? "s" : ""}
        </span>
      </div>

      {slots.length === 0 ? (
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>
            Aucune séance planifiée aujourd&apos;hui pour vos groupes. Profitez-en pour préparer la semaine.
          </p>
        </div>
      ) : (
        <div className="grid grid-2">
          {slots.map((slot) => {
            const type = slot.sessionType;
            const attend = attendingGroups(slot, groups);
            const roster = attend.flatMap((g) => g.clients.map((c) => ({ ...c, groupName: g.name })));
            const count = type?.exercises?.length || 0;
            return (
              <article
                key={slot.id}
                className="card"
                style={{ borderLeft: `4px solid ${type?.color || "var(--accent)"}`, padding: 18 }}
              >
                <div className="flex-between wrap" style={{ alignItems: "flex-start" }}>
                  <div>
                    <h3 style={{ margin: 0 }}>{type?.name}</h3>
                    <div className="muted small" style={{ marginTop: 2 }}>
                      <Icon name="clock" /> {slot.startTime} – {slot.endTime}
                      {slot.location && <> · <Icon name="pin" /> {slot.location}</>}
                    </div>
                  </div>
                  <span className="badge"><Icon name="users" /> {roster.length} inscrit{roster.length > 1 ? "s" : ""}</span>
                </div>

                {/* Groupe(s) concerné(s) */}
                <div className="flex wrap" style={{ gap: 6, marginTop: 10 }}>
                  {attend.length === 0 ? (
                    <span className="muted small">Aucun groupe rattaché.</span>
                  ) : (
                    attend.map((g) => (
                      <span key={g.id} className="badge">
                        {g.name}{g.goal ? ` · ${g.goal.label}` : ""}
                      </span>
                    ))
                  )}
                </div>

                {/* Personnes à entraîner (nom + niveau). */}
                {roster.length > 0 && (
                  <div style={{ display: "grid", gap: 4, marginTop: 12 }}>
                    {roster.map((c) => (
                      <div
                        key={c.id}
                        className="flex-between"
                        style={{ padding: "6px 10px", borderRadius: 10, background: "var(--panel-2)" }}
                      >
                        <span style={{ fontWeight: 500 }}>{c.user.firstName} {c.user.lastName}</span>
                        <span className="badge" title="Niveau de progression">Niv. {c.level ?? 1}/5</span>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  className="btn btn-primary btn-sm"
                  style={{ marginTop: 14 }}
                  onClick={() => setOpenSlot(slot)}
                >
                  <Icon name="dumbbell" /> Voir la séance{count > 0 ? ` · ${count} exercice${count > 1 ? "s" : ""}` : ""}
                </button>
              </article>
            );
          })}
        </div>
      )}

      {/* Contenu de la séance (exercices + paramètres + description). */}
      {openSlot && <SessionContentModal slot={openSlot} onClose={() => setOpenSlot(null)} />}
    </section>
  );
}

/** Modale du contenu type d'une séance — même présentation que SessionSlotCard,
 *  mais déclenchée depuis les cartes « du jour » (affichage dédié). */
function SessionContentModal({ slot, onClose }) {
  const type = slot.sessionType;
  const items = type?.exercises || [];
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex-between mb">
          <h3 style={{ margin: 0 }}>
            <span className="dot" style={{ background: type?.color }} /> {type?.name}
          </h3>
          <button className="btn btn-sm" onClick={onClose}><Icon name="x" /></button>
        </div>
        <p className="muted small">
          <Icon name="clock" /> {slot.startTime} – {slot.endTime}
          {slot.location && <> · <Icon name="pin" /> {slot.location}</>}
        </p>
        {type?.description && <p className="muted">{type.description}</p>}

        {items.length === 0 ? (
          <p className="muted">Le contenu de cette séance n&apos;a pas encore été défini.</p>
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
                {it.exercise.description && (
                  <p className="muted small" style={{ margin: "6px 0 0 28px" }}>{it.exercise.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
