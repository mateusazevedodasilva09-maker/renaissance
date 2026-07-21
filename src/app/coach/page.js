/**
 * Accueil de l'espace coach : les séances du jour (affichage dédié) et les
 * personnes qui ont besoin du coach (4 signaux), plus des raccourcis.
 *
 * Encapsulation : un COACH est borné à lui-même ; un ADMIN peut observer un
 * coach donné via ?coach=, la donnée restant bornée à ce coach.
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { listCoaches, getClientsNeedingAttention } from "@/modules/coach/coach.service";
import { getCoachDayView } from "@/modules/sessions/schedule.service";
import TodaySessions from "@/components/coach/TodaySessions";
import AttentionList from "@/components/coach/AttentionList";
import CoachPicker from "@/components/coach/CoachPicker";
import Icon from "@/components/Icon";

export const dynamic = "force-dynamic";

const SHORTCUTS = [
  { href: "/coach/planning", label: "Planning de la semaine", desc: "Vos coachings, jour par jour", icon: "calendar" },
  { href: "/coach/groupes", label: "Mes groupes", desc: "Envoyer le message de la semaine", icon: "users" },
  { href: "/coach/messages", label: "Messages", desc: "Répondre aux inscrits", icon: "message" },
  { href: "/coach/agenda", label: "Agenda & tâches", desc: "Vos rappels et suivis", icon: "clipboard" },
];

export default async function CoachHomePage({ searchParams }) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "COACH")) {
    redirect("/connexion");
  }

  const isAdmin = session.role === "ADMIN";
  const coaches = isAdmin ? await listCoaches() : [];
  const selectedCoachId = isAdmin ? (searchParams?.coach || coaches[0]?.id || null) : session.userId;

  const [dayView, attention] = selectedCoachId
    ? await Promise.all([
        getCoachDayView(selectedCoachId),
        getClientsNeedingAttention(selectedCoachId),
      ])
    : [{ weekday: null, slots: [], groups: [] }, []];

  const q = isAdmin && selectedCoachId ? `?coach=${selectedCoachId}` : "";
  const firstName = session.name ? session.name.split(" ")[0] : null;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Bonjour{firstName ? `, ${firstName}` : ""}</h1>
          <div className="subtitle">Vos séances du jour et les personnes qui ont besoin de vous.</div>
        </div>
        {isAdmin && <CoachPicker coaches={JSON.parse(JSON.stringify(coaches))} selectedCoachId={selectedCoachId} />}
      </div>

      {!selectedCoachId ? (
        <div className="card"><p className="muted" style={{ margin: 0 }}>Aucun coach à afficher.</p></div>
      ) : (
        <>
          <TodaySessions dayView={JSON.parse(JSON.stringify(dayView))} />
          <AttentionList clients={JSON.parse(JSON.stringify(attention))} />

          <div className="grid grid-4">
            {SHORTCUTS.map((s) => (
              <Link key={s.href} href={`${s.href}${q}`} className="card" style={{ display: "block" }}>
                <Icon name={s.icon} size={20} />
                <div style={{ fontWeight: 600, marginTop: 8 }}>{s.label}</div>
                <div className="muted small">{s.desc}</div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
