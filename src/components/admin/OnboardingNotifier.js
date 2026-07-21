"use client";

/**
 * Notifie le staff quand un client vient de remplir ses métriques (inscription
 * à valider). Sonde /api/clients/pending-validation toutes les ~25 s ; à
 * l'apparition d'un NOUVEAU client (jamais annoncé sur cet appareil), joue un
 * petit bruit (WebAudio, sans fichier) et affiche un toast. Un badge flottant
 * persiste tant qu'il reste des inscriptions à valider.
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

const SEEN_KEY = "renaissance-onboarding-seen";
const POLL_MS = 25000;

// Petit « ding » à deux notes, généré à la volée (aucun asset).
function playChime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const notes = [880, 1174];
    notes.forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.type = "sine";
      o.frequency.value = freq;
      const t = ctx.currentTime + i * 0.16;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.16, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
      o.start(t);
      o.stop(t + 0.36);
    });
  } catch {
    /* audio indisponible (pas d'interaction utilisateur) — silencieux */
  }
}

export default function OnboardingNotifier() {
  const [pending, setPending] = useState([]);
  const [toast, setToast] = useState(null);
  const seenRef = useRef(new Set());

  useEffect(() => {
    try {
      seenRef.current = new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || "[]"));
    } catch {
      seenRef.current = new Set();
    }
    let stopped = false;

    async function poll() {
      try {
        const res = await fetch("/api/clients/pending-validation");
        const json = await res.json();
        if (stopped || !json.ok) return;
        const list = json.data || [];
        setPending(list);
        const fresh = list.filter((c) => !seenRef.current.has(c.id));
        if (fresh.length > 0) {
          playChime();
          setToast(fresh[0]);
          fresh.forEach((c) => seenRef.current.add(c.id));
          try { localStorage.setItem(SEEN_KEY, JSON.stringify([...seenRef.current])); } catch {}
          setTimeout(() => setToast(null), 9000);
        }
      } catch {
        /* réseau : on réessaiera au prochain tick */
      }
    }

    poll();
    const iv = setInterval(poll, POLL_MS);
    return () => { stopped = true; clearInterval(iv); };
  }, []);

  if (pending.length === 0 && !toast) return null;
  const name = (c) => `${c.user.firstName} ${c.user.lastName}`;

  return (
    <>
      {pending.length > 0 && (
        <Link href={`/admin/clients/${pending[0].id}`} className="notif-badge" title="Inscriptions à valider">
          <Icon name="warning" size={15} /> {pending.length} inscription{pending.length > 1 ? "s" : ""} à valider
        </Link>
      )}
      {toast && (
        <div className="notif-toast" role="status">
          <div>
            <strong>{name(toast)}</strong> a rempli ses métriques.
            <div className="muted small">{toast.group?.name || "Sans groupe"}</div>
          </div>
          <Link href={`/admin/clients/${toast.id}`} className="btn btn-sm btn-primary" onClick={() => setToast(null)}>
            Valider
          </Link>
        </div>
      )}
    </>
  );
}
