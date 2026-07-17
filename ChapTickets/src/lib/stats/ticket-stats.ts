import { TICKET_STATUTS, TICKET_PRIORITES, type TicketStatut, type TicketPriorite } from "@/lib/types";
import type { PointTemporel } from "@/components/charts/tickets-over-time-chart";

export type TicketPourStats = {
  id: string;
  statut: TicketStatut;
  priorite: TicketPriorite;
  created_at: string;
  updated_at: string;
};

export type TicketStats = {
  total: number;
  ticketsParStatut: Record<TicketStatut, number>;
  ticketsParPriorite: Record<TicketPriorite, number>;
  overTime: PointTemporel[];
  ouvertsNonResolus: number;
  urgentsNonResolus: number;
  resolusCetteSemaine: number;
  dureeMoyenneResolutionJours: number | null;
};

const STATUTS_NON_RESOLUS: TicketStatut[] = ["ouvert", "en_cours", "en_attente_client"];

export function buildTicketStats(tickets: TicketPourStats[], joursHistorique = 14): TicketStats {
  const ticketsParStatut = Object.fromEntries(
    TICKET_STATUTS.map((s) => [s, tickets.filter((t) => t.statut === s).length])
  ) as Record<TicketStatut, number>;

  const ticketsParPriorite = Object.fromEntries(
    TICKET_PRIORITES.map((p) => [p, tickets.filter((t) => t.priorite === p).length])
  ) as Record<TicketPriorite, number>;

  // Fenêtre glissante de `joursHistorique` jours, un point par jour — même
  // les jours sans ticket créé apparaissent (à 0), pour un graphique
  // continu plutôt que des trous illisibles.
  const aujourdHui = new Date();
  aujourdHui.setHours(0, 0, 0, 0);
  const overTime: PointTemporel[] = [];
  for (let i = joursHistorique - 1; i >= 0; i--) {
    const jour = new Date(aujourdHui);
    jour.setDate(jour.getDate() - i);
    const lendemain = new Date(jour);
    lendemain.setDate(lendemain.getDate() + 1);

    const nombre = tickets.filter((t) => {
      const d = new Date(t.created_at);
      return d >= jour && d < lendemain;
    }).length;

    overTime.push({
      date: jour.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
      nombre,
    });
  }

  const ouvertsNonResolus = tickets.filter((t) => STATUTS_NON_RESOLUS.includes(t.statut)).length;
  const urgentsNonResolus = tickets.filter(
    (t) => t.priorite === "urgente" && STATUTS_NON_RESOLUS.includes(t.statut)
  ).length;

  const septJoursAgo = new Date();
  septJoursAgo.setDate(septJoursAgo.getDate() - 7);
  const resolusCetteSemaine = tickets.filter(
    (t) =>
      (t.statut === "resolu" || t.statut === "ferme") && new Date(t.updated_at) >= septJoursAgo
  ).length;

  const resolus = tickets.filter((t) => t.statut === "resolu" || t.statut === "ferme");
  const dureeMoyenneResolutionJours =
    resolus.length > 0
      ? resolus.reduce((somme, t) => {
          const duree =
            (new Date(t.updated_at).getTime() - new Date(t.created_at).getTime()) /
            (1000 * 60 * 60 * 24);
          return somme + duree;
        }, 0) / resolus.length
      : null;

  return {
    total: tickets.length,
    ticketsParStatut,
    ticketsParPriorite,
    overTime,
    ouvertsNonResolus,
    urgentsNonResolus,
    resolusCetteSemaine,
    dureeMoyenneResolutionJours,
  };
}
