/**
 * Espace client — programme personnalisé actif.
 */
import { getSession } from "@/lib/session";
import { getClientByUserId } from "@/modules/clients/client.service";
import { getActiveProgramForClient } from "@/modules/programs/program.service";
import ProgramSessionCard from "@/components/espace/ProgramSessionCard";
import Icon from "@/components/Icon";

export const dynamic = "force-dynamic";

export default async function ProgrammePage() {
  const session = await getSession();
  const client = await getClientByUserId(session.userId);
  const program = await getActiveProgramForClient(client.id);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Mon programme</h1>
          <div className="subtitle">
            {program ? program.title : "Votre coach ne vous a pas encore attribué de programme."}
          </div>
        </div>
      </div>

      {!program ? (
        <div className="card">
          <p className="muted">
            Votre programme personnalisé apparaîtra ici dès que votre coach l&apos;aura généré.
          </p>
        </div>
      ) : (
        <div className="card">
          <p className="muted small"><Icon name="dumbbell" /> Cliquez sur une séance pour voir le détail de ses exercices.</p>
          <div className="kanban" style={{ flexWrap: "wrap" }}>
            {program.sessions.map((s) => (
              <div key={s.id} style={{ minWidth: 220, flex: "1 1 240px" }}>
                <ProgramSessionCard session={s} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
