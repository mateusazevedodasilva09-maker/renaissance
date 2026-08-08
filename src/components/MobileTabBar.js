"use client";

/**
 * Barre d'onglets fixée en bas de l'écran, façon application native — affichée
 * uniquement sur téléphone (masquée en desktop par CSS). L'onglet correspondant
 * à la page courante est surligné (accent).
 *
 * - `links`      : onglets principaux (idéalement 4, jamais plus de 5 avec le
 *                  bouton « Plus »). Chaque lien : { href, label, icon, exact? }.
 * - `moreLinks`  : liens secondaires accessibles via un bouton « Plus » qui
 *                  ouvre une feuille (utile pour l'admin qui a beaucoup de
 *                  sections). Optionnel.
 * - `preserveParam` : nom d'un paramètre d'URL à conserver d'un onglet à l'autre
 *                  (ex. "coach" quand l'admin observe un coach). Optionnel.
 *
 * Utilise useSearchParams → toujours enveloppé dans <Suspense> par l'appelant.
 */
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import Icon from "@/components/Icon";

export default function MobileTabBar({ links = [], moreLinks = [], preserveParam }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const [openMore, setOpenMore] = useState(false);

  const kept = preserveParam ? params.get(preserveParam) : null;
  const q = kept ? `?${preserveParam}=${encodeURIComponent(kept)}` : "";

  const isActive = (l) => (l.exact ? pathname === l.href : pathname.startsWith(l.href));
  const moreActive = moreLinks.some(isActive);

  return (
    <>
      {openMore && (
        <div className="tabbar-sheet-backdrop" onClick={() => setOpenMore(false)}>
          <div className="tabbar-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Plus de sections">
            <div className="tabbar-sheet-handle" aria-hidden="true" />
            <div className="tabbar-sheet-grid">
              {moreLinks.map((l) => (
                <Link
                  key={l.href}
                  href={`${l.href}${q}`}
                  className={`tabbar-sheet-link${isActive(l) ? " active" : ""}`}
                  onClick={() => setOpenMore(false)}
                >
                  <Icon name={l.icon} size={21} />
                  <span>{l.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      <nav className="mobile-tabbar" aria-label="Navigation principale">
        {links.map((l) => (
          <Link key={l.href} href={`${l.href}${q}`} className={`tabbar-link${isActive(l) ? " active" : ""}`}>
            <Icon name={l.icon} size={22} />
            <span>{l.label}</span>
          </Link>
        ))}
        {moreLinks.length > 0 && (
          <button
            type="button"
            className={`tabbar-link${moreActive || openMore ? " active" : ""}`}
            onClick={() => setOpenMore((v) => !v)}
            aria-label="Plus de sections"
          >
            <Icon name="menu" size={22} />
            <span>Plus</span>
          </button>
        )}
      </nav>
    </>
  );
}
