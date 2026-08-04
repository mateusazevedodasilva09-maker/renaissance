"use client";

/**
 * Navigation de l'espace coach. Onglet actif surligné selon l'URL courante.
 * Quand un ADMIN observe un coach (via ?coach=<id>), le paramètre est conservé
 * d'un onglet à l'autre pour rester sur le même coach.
 */
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import Icon from "@/components/Icon";

const LINKS = [
  { href: "/coach", label: "Mes coachés", icon: "dumbbell", exact: true },
  { href: "/coach/besoin", label: "Qui a besoin de moi", icon: "heart" },
  { href: "/coach/planning", label: "Mon planning", icon: "calendar" },
  { href: "/coach/taches", label: "Mes tâches", icon: "clipboard" },
];

export default function CoachNav() {
  const pathname = usePathname();
  const params = useSearchParams();
  const coach = params.get("coach");
  const query = coach ? `?coach=${coach}` : "";

  return (
    <>
      {LINKS.map((l) => {
        const active = l.exact ? pathname === l.href : pathname.startsWith(l.href);
        return (
          <Link key={l.href} href={`${l.href}${query}`} className={`nav-link${active ? " active" : ""}`}>
            <span><Icon name={l.icon} /></span> {l.label}
          </Link>
        );
      })}
    </>
  );
}
