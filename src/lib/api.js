/**
 * Petits utilitaires partagés par toutes les routes API.
 * Les routes restent des adaptateurs fins : validation d'accès + délégation
 * aux services métier + sérialisation de la réponse.
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { hasPermission } from "@/modules/auth/permissions";

export function ok(data, init) {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(message, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

/**
 * Garde d'accès des routes API.
 * @param {object} options
 * @param {string[]} [options.roles]      rôles autorisés (ex. ["ADMIN"])
 * @param {string}   [options.permission] code de permission requis
 * @returns la session, ou une NextResponse d'erreur à retourner telle quelle.
 */
export async function requireAuth({ roles, permission } = {}) {
  const session = await getSession();
  if (!session) return { error: fail("Authentification requise.", 401) };
  if (roles && !roles.includes(session.role)) {
    return { error: fail("Accès refusé.", 403) };
  }
  if (permission && !(await hasPermission(session.role, permission))) {
    return { error: fail("Permission manquante.", 403) };
  }
  return { session };
}

/** Enveloppe un handler pour capturer proprement les erreurs métier. */
export function handle(fn) {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (err) {
      // Les erreurs de contrôle internes de Next.js (rendu dynamique,
      // redirections…) doivent remonter telles quelles.
      if (err?.digest) throw err;
      console.error("[API]", err);
      const status = err.status || 500;
      const message = err.expose ? err.message : "Erreur interne.";
      return fail(message, status);
    }
  };
}

/** Erreur métier exposable au client (message sûr). */
export class ApiError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
    this.expose = true;
  }
}
