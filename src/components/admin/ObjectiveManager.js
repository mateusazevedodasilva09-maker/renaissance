"use client";

/**
 * « Objectif = groupe = programme ».
 * Pour chaque objectif : la liste des clients qui le partagent (le groupe) et
 * UN programme unique, désormais CONSTRUIT À LA MAIN par l'admin (plus de
 * génération automatique). Les coachs peuvent le modifier librement via le même
 * éditeur. Le programme de l'objectif est visible dans l'espace de tous ses
 * clients (un programme personnel reste prioritaire).
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import ProgramEditor from "@/components/admin/ProgramEditor";

export default function ObjectiveManager({ objectives, exercises = [] }) {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Objectifs & programmes</h1>
          <div className="subtitle">
            Chaque objectif porte un programme construit à la main. Il est visible par tous ses clients
            (un programme personnel reste prioritaire). Les coachs peuvent le modifier librement.
          </div>
        </div>
      </div>

      {objectives.length === 0 && (
        <div className="card"><p className="muted">Aucun objectif défini. Créez-en dans « Séances &amp; planning ».</p></div>
      )}

      <div className="grid">
        {objectives.map((o) => (
          <ObjectiveCard key={o.id} objective={o} exercises={exercises} />
        ))}
      </div>
    </div>
  );
}

function ObjectiveCard({ objective, exercises }) {
  const router = useRouter();
  const program = objective.program;

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

      {/* Programme de l'objectif : construction manuelle (jours + exercices via
          la silhouette), exactement comme la fiche client. Une création vierge
          ou l'application d'un modèle réinitialise l'éditeur. */}
      <div className="mt" style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
        <ProgramEditor
          key={program?.id || `blank-${objective.id}`}
          initialProgram={program || null}
          exercises={exercises}
          goalId={objective.id}
          onProgramReplaced={() => router.refresh()}
        />
      </div>
    </div>
  );
}
