"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/connexion");
    router.refresh();
  }
  return (
    <button className="btn btn-sm" onClick={logout}>
      Déconnexion
    </button>
  );
}
