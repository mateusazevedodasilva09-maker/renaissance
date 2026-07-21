/**
 * Middleware Edge — première barrière d'accès par zone :
 *   /admin/*  → ADMIN et COACH
 *   /coach/*  → ADMIN et COACH (interface dédiée coach ; encapsulée par coach)
 *   /espace/* → utilisateur connecté (les clients y voient leurs données)
 * Les routes API restent protégées individuellement via requireAuth().
 */
import { NextResponse } from "next/server";
import { COOKIE_NAME, verifyToken } from "@/lib/token";

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const payload = token ? await verifyToken(token) : null;

  const loginUrl = new URL("/connexion", request.url);

  // Zones réservées au staff (admin + coach).
  if (pathname.startsWith("/admin") || pathname.startsWith("/coach")) {
    if (!payload) return NextResponse.redirect(loginUrl);
    if (payload.role !== "ADMIN" && payload.role !== "COACH") {
      return NextResponse.redirect(new URL("/espace", request.url));
    }
  }

  if (pathname.startsWith("/espace")) {
    if (!payload) return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/coach/:path*", "/espace/:path*"],
};
