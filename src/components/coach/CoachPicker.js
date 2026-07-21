"use client";

/**
 * Sélecteur réservé à l'ADMIN pour observer l'espace d'un coach donné. Conserve
 * la page courante et ne change que le paramètre ?coach=.
 */
import { usePathname, useRouter } from "next/navigation";

export default function CoachPicker({ coaches = [], selectedCoachId }) {
  const router = useRouter();
  const pathname = usePathname();
  if (!coaches.length) return null;
  return (
    <div className="field" style={{ margin: 0 }}>
      <label className="small">Observer le coach</label>
      <select
        className="input"
        value={selectedCoachId || ""}
        onChange={(e) => router.push(`${pathname}?coach=${e.target.value}`)}
      >
        {coaches.map((c) => (
          <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
        ))}
      </select>
    </div>
  );
}
