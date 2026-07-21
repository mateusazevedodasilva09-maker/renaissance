/**
 * Domaine SUIVI — cockpit coach « qui a besoin de moi ».
 *
 * Analyse tous les clients actifs et remonte ceux qui présentent un signal
 * de risque (désengagement, stagnation, problème non traité). Objectif :
 * 2 minutes le matin pour savoir qui rattraper — un abonnement sauvé vaut
 * mieux qu'un prospect à convertir.
 *
 * Les règles sont regroupées dans RISK_RULES : en ajouter une = ajouter une
 * entrée (aucune modification d'interface, l'écran se construit tout seul).
 */
import prisma from "@/lib/prisma";

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n) => new Date(Date.now() - n * DAY);

/**
 * Chaque règle reçoit le client (avec ses données récentes) et retourne
 * null (rien à signaler) ou { label, detail } décrivant le problème.
 * `severity` : "high" (rouge) ou "medium" (orange) — pilote l'affichage.
 */
const RISK_RULES = [
  {
    key: "absence",
    severity: "high",
    icon: "warning",
    check(client) {
      // Aucune présence enregistrée depuis 10 jours, alors que le client
      // en avait auparavant (sinon : simplement pas encore suivi).
      const presences = client.attendances.filter((a) => a.present);
      if (presences.length === 0) return null;
      const last = presences[presences.length - 1];
      const days = Math.floor((Date.now() - new Date(last.date)) / DAY);
      if (days < 10) return null;
      return { label: "Absent depuis " + days + " jours", detail: "Dernière présence : " + fmt(last.date) };
    },
  },
  {
    key: "plateau",
    severity: "medium",
    icon: "chart",
    check(client) {
      // Objectif de poids actif mais poids stable (< 0,4 kg d'écart) sur les
      // 3 dernières mesures hebdomadaires : la stratégie mérite un ajustement.
      if (!client.targetWeightKg || !client.weeklyRateKg) return null;
      const weights = client.metrics.filter((m) => m.weightKg != null).slice(-3);
      if (weights.length < 3) return null;
      const values = weights.map((m) => m.weightKg);
      const spread = Math.max(...values) - Math.min(...values);
      if (spread >= 0.4) return null;
      return { label: "Plateau de poids", detail: "3 semaines autour de " + values[values.length - 1] + " kg malgré un objectif de " + client.weeklyRateKg + " kg/sem" };
    },
  },
  {
    key: "energie",
    severity: "medium",
    icon: "zap",
    check(client) {
      const last = [...client.metrics].reverse().find((m) => m.energyLevel != null);
      if (!last || last.energyLevel > 4) return null;
      return { label: "Énergie basse (" + last.energyLevel + "/10)", detail: "Semaine du " + fmt(last.weekStart) };
    },
  },
  {
    key: "sans-mesure",
    severity: "medium",
    icon: "clock",
    check(client) {
      // Aucune mesure hebdo depuis 14 jours : le suivi décroche.
      if (client.metrics.length === 0) {
        // Jamais mesuré et inscrit depuis plus de 14 jours.
        if (new Date(client.joinedAt) < daysAgo(14)) {
          return { label: "Aucune mesure hebdo", detail: "Inscrit le " + fmt(client.joinedAt) + ", jamais mesuré" };
        }
        return null;
      }
      const last = client.metrics[client.metrics.length - 1];
      if (new Date(last.weekStart) > daysAgo(14)) return null;
      return { label: "Pas de mesure récente", detail: "Dernière : semaine du " + fmt(last.weekStart) };
    },
  },
  {
    key: "echeance",
    severity: "high",
    icon: "target",
    check(client) {
      // Échéance dans moins de 30 jours avec plus de 2 kg d'écart à la cible.
      if (!client.objectiveDeadline || !client.targetWeightKg) return null;
      const daysLeft = Math.ceil((new Date(client.objectiveDeadline) - Date.now()) / DAY);
      if (daysLeft < 0 || daysLeft > 30) return null;
      const lastWeight = [...client.metrics].reverse().find((m) => m.weightKg != null)?.weightKg ?? client.manualWeightKg;
      if (lastWeight == null) return null;
      const gap = Math.abs(lastWeight - client.targetWeightKg);
      if (gap <= 2) return null;
      return { label: "Échéance dans " + daysLeft + " j — " + gap.toFixed(1) + " kg d'écart", detail: "Cible : " + client.targetWeightKg + " kg, actuel : " + lastWeight + " kg" };
    },
  },
  {
    key: "feedback",
    severity: "high",
    icon: "message",
    check(client) {
      const pending = client.feedbacks.filter((f) => !f.coachReply);
      if (pending.length === 0) return null;
      return { label: pending.length + " message(s) sans réponse", detail: "Le plus ancien : " + fmt(pending[pending.length - 1].createdAt) };
    },
  },
];

const fmt = (d) => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });

/**
 * Retourne les clients à risque, triés par gravité (nombre de signaux
 * « high » puis nombre total de signaux).
 * `coachUserId` : limite l'analyse aux membres des groupes de ce coach.
 */
export async function getClientsAtRisk({ coachUserId = null } = {}) {
  const clients = await prisma.client.findMany({
    where: {
      isActive: true,
      ...(coachUserId && { group: { coachId: coachUserId } }),
    },
    include: {
      user: { select: { firstName: true, lastName: true } },
      group: { select: { name: true } },
      metrics: { orderBy: { weekStart: "asc" } },
      attendances: { orderBy: { date: "asc" } },
      feedbacks: { orderBy: { createdAt: "desc" } },
    },
  });

  const results = [];
  for (const client of clients) {
    const alerts = [];
    for (const rule of RISK_RULES) {
      const hit = rule.check(client);
      if (hit) alerts.push({ key: rule.key, severity: rule.severity, icon: rule.icon, ...hit });
    }
    if (alerts.length > 0) {
      results.push({
        id: client.id,
        firstName: client.user.firstName,
        lastName: client.user.lastName,
        groupName: client.group?.name || null,
        alerts,
      });
    }
  }

  // Les cas les plus graves d'abord.
  results.sort((a, b) => {
    const highA = a.alerts.filter((x) => x.severity === "high").length;
    const highB = b.alerts.filter((x) => x.severity === "high").length;
    return highB - highA || b.alerts.length - a.alerts.length;
  });

  return { atRisk: results, totalClients: clients.length };
}
