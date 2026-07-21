/**
 * Domaine AUTH — système de permissions extensible.
 *
 * Les permissions sont stockées en base (Permission / RolePermission) et
 * chargées avec un petit cache mémoire. Pour ajouter un droit :
 *   1. insérer un code de permission (seed ou interface future),
 *   2. l'associer aux rôles voulus,
 *   3. protéger la route avec requireAuth({ permission: "mon.code" }).
 *
 * L'ADMIN possède implicitement toutes les permissions.
 */
import prisma from "@/lib/prisma";

let cache = null;
let cacheAt = 0;
const CACHE_TTL_MS = 60_000;

async function loadPermissionMap() {
  const now = Date.now();
  if (cache && now - cacheAt < CACHE_TTL_MS) return cache;
  const rows = await prisma.rolePermission.findMany({ include: { permission: true } });
  const map = {};
  for (const row of rows) {
    (map[row.role] ??= new Set()).add(row.permission.code);
  }
  cache = map;
  cacheAt = now;
  return map;
}

export async function hasPermission(role, code) {
  if (role === "ADMIN") return true;
  const map = await loadPermissionMap();
  return map[role]?.has(code) ?? false;
}

export function invalidatePermissionCache() {
  cache = null;
}
