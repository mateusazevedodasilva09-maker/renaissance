/**
 * Signature / vérification des JWT de session.
 * Séparé de session.js car ce module doit rester compatible avec le
 * runtime Edge (middleware) : aucune dépendance à next/headers.
 */
import { SignJWT, jwtVerify } from "jose";

export const COOKIE_NAME = "renaissance_session";
export const SESSION_DURATION_S = 60 * 60 * 24 * 7; // 7 jours

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET manquant dans les variables d'environnement.");
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_S}s`)
    .sign(getSecret());
}

export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload;
  } catch {
    return null;
  }
}
