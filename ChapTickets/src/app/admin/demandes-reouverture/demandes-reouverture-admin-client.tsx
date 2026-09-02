"use client";

import { useState, useActionState, useRef, useEffect } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DEMANDE_REOUVERTURE_STATUT_LABELS } from "@/lib/types";
import { traiterDemandeReouverture } from "@/app/admin/tickets/actions";
import type { DemandeAdmin } from "./page";

const initialState = { error: null };

/**
 * Formulaire de décision inline dans le modal tunnel.
 * Accepter → soumis directement.
 * Refuser → affiche un textarea pour le motif, puis soumet.
 */
function TunnelDecisionForm({
  demande,
  onTraitee,
}: {
  demande: DemandeAdmin;
  onTraitee: () => void;
}) {
  const [showRefus, setShowRefus] = useState(false);
  const [state, formAction, isPending] = useActionState(
    async (prev: { error: string | null }, fd: FormData) => {
      const result = await traiterDemandeReouverture(prev, fd);
      if (!result.error) onTraitee();
      return result;
    },
    initialState
  );

  // Reset du mode refus quand on change de demande (navigation tunnel)
  const demandeIdRef = useRef(demande.id);
  useEffect(() => {
    if (demandeIdRef.current !== demande.id) {
      demandeIdRef.current = demande.id;
      setShowRefus(false);
    }
  }, [demande.id]);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="ticket_id" value={demande.ticket_id} />
      <input type="hidden" name="demande_id" value={demande.id} />

      {showRefus && (
        <Textarea
          name="commentaire_refus"
          placeholder="Motif du refus (optionnel, visible par le client)"
          rows={3}
          autoFocus
        />
      )}

      {state.error && (
        <p role="alert" className="text-sm text-destructive">{state.error}</p>
      )}

      <div className="flex gap-2 flex-wrap">
        {!showRefus ? (
          <>
            <Button type="submit" name="decision" value="acceptee" disabled={isPending}>
              ✓ Accepter
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowRefus(true)}
            >
              ✕ Refuser
            </Button>
          </>
        ) : (
          <>
            <Button type="submit" name="decision" value="refusee" variant="destructive" disabled={isPending}>
              Confirmer le refus
            </Button>
            <Button type="button" variant="ghost" onClick={() => setShowRefus(false)}>
              Annuler
            </Button>
          </>
        )}
      </div>
    </form>
  );
}

/**
 * Modal tunnel — affiche une demande à la fois, boutons Précédent/Suivant,
 * passe automatiquement à la suivante après traitement.
 */
function TunnelModal({
  demandes,
  indexInitial,
  onClose,
}: {
  demandes: DemandeAdmin[];
  indexInitial: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(indexInitial);
  const [traitees, setTraitees] = useState<Set<string>>(new Set());

  const demande = demandes[index];
  const total = demandes.length;
  const dejaTraitee = traitees.has(demande.id);

  function onTraitee() {
    setTraitees((prev) => new Set([...prev, demande.id]));
    // Passe automatiquement à la suivante non traitée
    const suivante = demandes.findIndex(
      (d, i) => i > index && !traitees.has(d.id)
    );
    if (suivante !== -1) {
      setIndex(suivante);
    }
  }

  const ticket = demande.tickets;
  const ref = ticket
    ? `${ticket.projets?.code_court ?? ""}#${ticket.rang_projet}`
    : "—";
  const client = demande.profiles?.full_name || demande.profiles?.email || "Client";

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Demande {index + 1}/{total}</span>
            <Badge variant="secondary">{ref}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Info ticket */}
          <div className="rounded-md border p-3 bg-muted/30">
            <p className="text-sm font-medium">{ticket?.titre ?? "Ticket introuvable"}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {ticket?.projets?.nom ?? "—"} · Demandé par {client}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(demande.created_at).toLocaleDateString("fr-FR", {
                day: "2-digit", month: "2-digit", year: "numeric",
              })}
            </p>
          </div>

          {/* Message du client */}
          {demande.message ? (
            <div className="flex flex-col gap-1">
              <p className="text-xs text-muted-foreground font-medium">Message</p>
              <p className="text-sm">{demande.message}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">Pas de message.</p>
          )}

          {/* Lien vers le ticket */}
          <Link
            href={`/admin/tickets/${demande.ticket_id}`}
            className="text-xs underline underline-offset-2 text-muted-foreground hover:text-foreground w-fit"
            target="_blank"
          >
            Voir le ticket →
          </Link>

          {/* Décision */}
          {dejaTraitee ? (
            <p className="text-sm text-muted-foreground italic">✓ Demande traitée dans cette session.</p>
          ) : (
            <TunnelDecisionForm demande={demande} onTraitee={onTraitee} />
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between border-t pt-3">
            <Button
              variant="ghost"
              size="sm"
              disabled={index === 0}
              onClick={() => setIndex((i) => i - 1)}
            >
              ← Précédent
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={index === total - 1}
              onClick={() => setIndex((i) => i + 1)}
            >
              Suivant →
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function DemandesReouvertureAdminClient({
  demandes,
}: {
  demandes: DemandeAdmin[];
}) {
  const [tunnelOpen, setTunnelOpen] = useState(false);
  const [tunnelIndex, setTunnelIndex] = useState(0);

  const enAttente = demandes.filter((d) => d.statut === "en_attente");
  const traitees = demandes.filter((d) => d.statut !== "en_attente");

  function ouvrirTunnel(index: number) {
    setTunnelIndex(index);
    setTunnelOpen(true);
  }

  return (
    <>
      {tunnelOpen && enAttente.length > 0 && (
        <TunnelModal
          demandes={enAttente}
          indexInitial={tunnelIndex}
          onClose={() => setTunnelOpen(false)}
        />
      )}

      {/* Section en attente */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            En attente
            {enAttente.length > 0 && (
              <span className="ml-2 text-muted-foreground font-normal">({enAttente.length})</span>
            )}
          </h2>
          {enAttente.length > 0 && (
            <Button size="sm" onClick={() => ouvrirTunnel(0)}>
              Mode tunnel ({enAttente.length})
            </Button>
          )}
        </div>

        {enAttente.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            Aucune demande en attente de traitement.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {enAttente.map((d, i) => {
              const ticket = d.tickets;
              const ref = ticket
                ? `${ticket.projets?.code_court ?? ""}#${ticket.rang_projet}`
                : "—";
              const client = d.profiles?.full_name || d.profiles?.email || "Client";

              return (
                <li key={d.id} className="flex items-center justify-between gap-4 rounded-md border p-3">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground shrink-0">{ref}</span>
                      <span className="text-sm font-medium truncate">{ticket?.titre ?? "—"}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {client} · {ticket?.projets?.nom ?? "—"} ·{" "}
                      {new Date(d.created_at).toLocaleDateString("fr-FR", {
                        day: "2-digit", month: "2-digit", year: "numeric",
                      })}
                    </p>
                    {d.message && (
                      <p className="text-xs text-muted-foreground italic truncate max-w-sm">{d.message}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link href={`/admin/tickets/${d.ticket_id}`}>
                      <Button size="sm" variant="ghost">Voir →</Button>
                    </Link>
                    <Button size="sm" onClick={() => ouvrirTunnel(i)}>
                      Traiter
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Section traitées */}
      {traitees.length > 0 && (
        <div className="flex flex-col gap-3 border-t pt-4">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Traitées ({traitees.length})
          </h2>
          <ul className="flex flex-col gap-2">
            {traitees.map((d) => {
              const ticket = d.tickets;
              const ref = ticket
                ? `${ticket.projets?.code_court ?? ""}#${ticket.rang_projet}`
                : "—";
              const client = d.profiles?.full_name || d.profiles?.email || "Client";

              return (
                <li key={d.id} className="flex items-center justify-between gap-4 rounded-md border border-border/50 p-3 opacity-70">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground shrink-0">{ref}</span>
                      <span className="text-sm truncate">{ticket?.titre ?? "—"}</span>
                      <Badge variant={d.statut === "acceptee" ? "default" : "outline"} className="shrink-0">
                        {DEMANDE_REOUVERTURE_STATUT_LABELS[d.statut]}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {client} · {ticket?.projets?.nom ?? "—"}
                    </p>
                    {d.commentaire_refus && (
                      <p className="text-xs text-muted-foreground italic">
                        Motif : {d.commentaire_refus}
                      </p>
                    )}
                    {d.statut === "acceptee" && d.nouveau_ticket_id && (
                      <Link
                        href={`/admin/tickets/${d.nouveau_ticket_id}`}
                        className="text-xs underline underline-offset-2 text-muted-foreground hover:text-foreground w-fit"
                      >
                        Voir le nouveau ticket →
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}
