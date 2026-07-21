/**
 * MOTEUR DE GÉNÉRATION DE PROGRAMMES — point d'extension central.
 *
 * Chaque stratégie de génération est un module qui s'enregistre ici avec :
 *   - key         : identifiant stable (stocké sur Program.generatorKey)
 *   - label       : nom affiché dans l'interface admin
 *   - paramsSchema: description des paramètres attendus (pilote le formulaire
 *                   admin, qui se construit dynamiquement à partir du schéma)
 *   - generate(params, ctx) : fonction pure qui retourne un "plan" :
 *       { title, sessions: [{ name, weekday?, exercises: [{ exerciseId,
 *         sets, reps, restSec?, tempo?, notes? }] }] }
 *
 * Pour ajouter demain un générateur plus sophistiqué (périodisation, charge
 * progressive, historique de mesures…) : créer un fichier dans ./generators,
 * l'enregistrer ci-dessous — rien d'autre à modifier. Le service
 * program.service.js persiste le plan et archive les paramètres d'entrée en
 * JSON sur le programme (traçabilité + regénération possible).
 */
import basicGenerator from "./generators/basic";

const registry = new Map();

export function registerGenerator(generator) {
  if (!generator?.key || typeof generator.generate !== "function") {
    throw new Error("Générateur invalide : { key, label, paramsSchema, generate } attendu.");
  }
  registry.set(generator.key, generator);
}

export function getGenerator(key) {
  return registry.get(key) || null;
}

export function listGenerators() {
  return [...registry.values()].map(({ key, label, paramsSchema }) => ({ key, label, paramsSchema }));
}

// --- Enregistrement des stratégies disponibles ------------------------------
registerGenerator(basicGenerator);
