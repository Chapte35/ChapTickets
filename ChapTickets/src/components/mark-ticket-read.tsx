"use client";

import { useEffect } from "react";
import { marquerTicketLu } from "@/lib/actions/lectures";

/**
 * Ne rend rien — sert juste à déclencher la Server Action au montage de la
 * page. Volontairement séparé plutôt que fait inline dans le Server
 * Component de la fiche ticket : une mutation ne devrait pas se cacher dans
 * le rendu d'un Server Component (effet de bord au moment du render, rejoué
 * à chaque navigation/prefetch de façon peu prévisible). Un vrai montage
 * client + useEffect est le point d'ancrage prévu pour ce genre d'effet.
 */
export function MarkTicketRead({ ticketId }: { ticketId: string }) {
  useEffect(() => {
    marquerTicketLu(ticketId);
  }, [ticketId]);

  return null;
}
