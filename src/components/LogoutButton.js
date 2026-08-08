"use client";

import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";

export default function LogoutButton({ compact = false }) {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/connexion");
    router.refresh();
  }
  // Version compacte (icône seule) pour la barre supérieure mobile.
  if (compact) {
    return (
      <button className="btn btn-sm btn-icon" onClick={logout} title="Déconnexion" aria-label="Déconnexion">
        <Icon name="logout" />
      </button>
    );
  }
  return (
    <button className="btn btn-sm" onClick={logout}>
      Déconnexion
    </button>
  );
}
