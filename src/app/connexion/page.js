"use client";

/** Page de connexion (admin, coach, client). */
import { useState } from "react";
import { useRouter } from "next/navigation";
import GradientBackground from "@/components/GradientBackground";
import Logo from "@/components/Logo";

export default function ConnexionPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: "", password: "" });
  const [state, setState] = useState({ loading: false, error: null });

  async function submit(e) {
    e.preventDefault();
    setState({ loading: true, error: null });
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Connexion impossible.");
      router.push(json.data.role === "CLIENT" ? "/espace" : "/admin");
      router.refresh();
    } catch (err) {
      setState({ loading: false, error: err.message });
    }
  }

  return (
    <div className="public-wrap">
      <GradientBackground />
      <div className="public-card">
        <div className="card">
          <div className="flex mb">
            <div className="brand-badge"><Logo /></div>
            <div>
              <h2 style={{ marginBottom: 0 }}>Connexion</h2>
              <span className="muted" style={{ display: "block", textTransform: "uppercase", letterSpacing: "0.18em", fontSize: 10.5, fontWeight: 300, marginTop: 3 }}>
                A força vem de dentro
              </span>
            </div>
          </div>
          {state.error && <div className="alert alert-error">{state.error}</div>}
          <form onSubmit={submit}>
            <div className="field">
              <label>Identifiant ou e-mail</label>
              <input
                className="input"
                required
                autoComplete="username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Mot de passe</label>
              <input
                className="input"
                type="password"
                required
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <button className="btn btn-primary" style={{ width: "100%" }} disabled={state.loading}>
              {state.loading ? "Connexion…" : "Se connecter"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
