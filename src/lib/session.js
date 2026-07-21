/**
 * Gestion des sessions utilisateur côté serveur (cookies httpOnly).
 * La partie cryptographique (JWT) vit dans token.js, partagée avec le
 * middleware Edge.
 */
import { cookies } from "next/headers";
import { COOKIE_NAME, SESSION_DURATION_S, signSessionToken, verifyToken } from "@/lib/token";

/** Crée le cookie de session pour un utilisateur authentifié. */
export async function createSession(user) {
  const token = await signSessionToken({
    sub: user.id,
    role: user.role,
    name: `${user.firstName} ${user.lastName}`,
    username: user.username,
  });

  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION_S,
    path: "/",
  });
}

export function destroySession() {
  cookies().delete(COOKIE_NAME);
}

/** Retourne { userId, role, name, username } ou null. */
export async function getSession() {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;
  return {
    userId: payload.sub,
    role: payload.role,
    name: payload.name,
    username: payload.username,
  };
}
