"use client";

/**
 * Bascule thème sombre / jour. Le choix est mémorisé dans le navigateur.
 */
import { useEffect, useState } from "react";
import Icon from "@/components/Icon";

export default function ThemeToggle({ compact = false }) {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light");
  }, []);

  function toggle() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    if (next === "dark") document.documentElement.setAttribute("data-theme", "dark");
    else document.documentElement.removeAttribute("data-theme");
    try {
      localStorage.setItem("renaissance-theme", next);
    } catch {}
  }

  // Version compacte (icône seule) pour la barre supérieure mobile.
  if (compact) {
    return (
      <button type="button" className="btn btn-sm btn-icon" onClick={toggle} title="Changer de thème" aria-label="Changer de thème">
        {theme === "light" ? <Icon name="moon" /> : <Icon name="sun" />}
      </button>
    );
  }

  return (
    <button type="button" className="btn btn-sm" onClick={toggle} title="Changer de thème" style={{ width: "100%" }}>
      {theme === "light" ? <><Icon name="moon" /> Mode sombre</> : <><Icon name="sun" /> Mode jour</>}
    </button>
  );
}
