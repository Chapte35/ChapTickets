"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DEMANDE_REOUVERTURE_STATUT_LABELS } from "@/lib/types";
import { acknowledgerDemande } from "@/app/dashboard/tickets/actions";
import type { DemandeClient } from "./page";

const initialAck = { error: null };

function AckButton({ demandeId }: { demandeId: string }) {
  const [, formAction, isPending] = useActionState(acknowledgerDemande, initialAck);
  return (
    <form action={formAction}>
      <input type="hidden" name="demande_id" value={demandeId} />
      <Button type="submit" size="sm" variant="outline" disabled={isPending}>
        {isPending ? "..." : "J'ai pris note"}
      </Button>
    </form>
  );
}

export function DemandesReouvertureClientView({
  demandes,
}: {
  demandes: DemandeClient[];
}) {
  const enAttente = demandes.filter((d) => d.statut === "en_attente");

  // Traitées : non-ack en haut, ack en bas
  const traitees = demandes.filter((d) => d.statut !== "en_attente");
  const nonAck = traitees.filter((d) => !d.acknowledged_at);
  const ack = traitees.filter((d) => !!d.acknowledged_at);
  const traiteesSorted = [...nonAck, ...ack];

  function refTicket(d: DemandeClient) {
    const t = d.tickets;
    if (!t) return "—";
    return `${t.projets?.code_court ?? ""}#${t.rang_projet}`;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── Liste 1 : En attente ── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">
          En attente
          {enAttente.length > 0 && (
            <span className="ml-2 text-muted-foreground font-normal">({enAttente.length})</span>
          )}
        </h2>
        {enAttente.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            Aucune demande en attente de traitement.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {enAttente.map((d) => (
              <li key={d.id} className="flex items-start justify-between gap-4 rounded-md border p-3">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground shrink-0">{refTicket(d)}</span>
                    <span className="text-sm font-medium truncate">{d.tickets?.titre ?? "—"}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {d.tickets?.projets?.nom ?? "—"} ·{" "}
                    {new Date(d.created_at).toLocaleDateString("fr-FR", {
                      day: "2-digit", month: "2-digit", year: "numeric",
                    })}
                  </p>
                  {d.message && (
                    <p className="text-xs text-muted-foreground italic">{d.message}</p>
                  )}
                </div>
                <Badge>{DEMANDE_REOUVERTURE_STATUT_LABELS.en_attente}</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Liste 2 : Traitées (non-ack en haut, ack en bas) ── */}
      {traiteesSorted.length > 0 && (
        <section className="flex flex-col gap-3 border-t pt-4">
          <h2 className="text-sm font-semibold">
            Traitées
            <span className="ml-2 text-muted-foreground font-normal">({traiteesSorted.length})</span>
          </h2>
          <ul className="flex flex-col gap-2">
            {traiteesSorted.map((d, i) => {
              const isNonAck = !d.acknowledged_at;
              const isFirstAck = !isNonAck && i > 0 && !traiteesSorted[i - 1].acknowledged_at;

              return (
                <li key={d.id}>
                  {/* Séparateur entre non-ack et ack */}
                  {isFirstAck && nonAck.length > 0 && (
                    <div className="flex items-center gap-2 py-2">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-xs text-muted-foreground">Déjà pris en compte</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                  )}
                  <div
                    className={`flex items-start justify-between gap-4 rounded-md border p-3 transition-colors ${
                      isNonAck
                        ? "bg-muted/40 border-primary/20"
                        : "opacity-60"
                    }`}
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        {isNonAck && (
                          <span className="size-1.5 rounded-full bg-primary shrink-0" />
                        )}
                        <span className="font-mono text-xs text-muted-foreground shrink-0">{refTicket(d)}</span>
                        <span className="text-sm font-medium truncate">{d.tickets?.titre ?? "—"}</span>
                        <Badge variant={d.statut === "acceptee" ? "default" : "outline"} className="shrink-0">
                          {DEMANDE_REOUVERTURE_STATUT_LABELS[d.statut]}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {d.tickets?.projets?.nom ?? "—"} ·{" "}
                        {new Date(d.created_at).toLocaleDateString("fr-FR", {
                          day: "2-digit", month: "2-digit", year: "numeric",
                        })}
                      </p>
                      {d.statut === "refusee" && d.commentaire_refus && (
                        <p className="text-sm text-muted-foreground italic mt-1">
                          Motif du refus : {d.commentaire_refus}
                        </p>
                      )}
                      {d.statut === "acceptee" && d.nouveau_ticket_id && (
                        <Link
                          href={`/dashboard/tickets/${d.nouveau_ticket_id}`}
                          className="text-xs underline underline-offset-2 text-muted-foreground hover:text-foreground w-fit mt-1"
                        >
                          Voir le nouveau ticket →
                        </Link>
                      )}
                      {d.statut === "acceptee" && !d.nouveau_ticket_id && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Demande acceptée — le ticket a été rouvert.
                        </p>
                      )}
                    </div>
                    {isNonAck && (
                      <AckButton demandeId={d.id} />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {demandes.length === 0 && (
        <p className="text-sm text-muted-foreground py-4">
          Vous n&apos;avez pas encore fait de demande de réouverture.
        </p>
      )}
    </div>
  );
}
