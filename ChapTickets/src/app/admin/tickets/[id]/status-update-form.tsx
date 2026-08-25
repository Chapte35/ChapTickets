"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { TICKET_STATUTS, TICKET_STATUT_LABELS, type TicketStatut } from "@/lib/types";
import { useToastOnSuccess } from "@/hooks/use-toast-on-success";
import {
  updateTicketStatus,
  updateTicketStatusEtAssignation,
  type FormState,
} from "../actions";
import type { ClientOption } from "@/lib/queries/tickets";

const initialState: FormState = { error: null };
const NON_ASSIGNE = "__aucun__";

/**
 * Formulaire de changement de statut.
 * Cas spécial : quand l'admin passe en "en_attente_client", une modal
 * s'ouvre pour lui proposer d'assigner le ticket à un client spécifique.
 * Le champ assigne_a bascule alors sur l'uuid client — jusqu'à ce qu'il
 * valide ou réouvre, auquel cas il repasse sur le dev.
 */
export function StatusUpdateForm({
  ticketId,
  currentStatut,
  clientsDuProjet,
  clientIdActuel,
}: {
  ticketId: string;
  currentStatut: TicketStatut;
  /** Clients rattachés au projet — pour pré-peupler la modal d'assignation. */
  clientsDuProjet: ClientOption[];
  /** client_id du ticket — pré-sélectionné dans la modal. */
  clientIdActuel: string | null;
}) {
  const [state, formAction, isPending] = useActionState(updateTicketStatus, initialState);
  const [assignationState, assignationAction, assignationPending] = useActionState(
    updateTicketStatusEtAssignation,
    initialState
  );

  useToastOnSuccess(isPending, state.error, "Statut mis à jour.");
  useToastOnSuccess(assignationPending, assignationState.error, "Statut et assignation mis à jour.");

  // Statut sélectionné en local — on intercepte avant de soumettre
  const [statutChoisi, setStatutChoisi] = useState<TicketStatut>(currentStatut);
  const [modalOuverte, setModalOuverte] = useState(false);
  const [clientChoisi, setClientChoisi] = useState<string>(clientIdActuel ?? NON_ASSIGNE);

  function handleStatutChange(val: string) {
    setStatutChoisi(val as TicketStatut);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Si l'admin passe en en_attente_client → ouvrir la modal d'assignation
    if (statutChoisi === "en_attente_client") {
      setClientChoisi(clientIdActuel ?? NON_ASSIGNE);
      setModalOuverte(true);
      return;
    }
    // Sinon soumettre normalement
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    formAction(fd);
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <input type="hidden" name="ticket_id" value={ticketId} />
        <Select name="statut" value={statutChoisi} onValueChange={handleStatutChange}>
          <SelectTrigger size="sm" className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TICKET_STATUTS.map((s) => (
              <SelectItem key={s} value={s}>
                {TICKET_STATUT_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" size="sm" disabled={isPending || assignationPending}>
          {isPending ? "..." : "Mettre à jour"}
        </Button>
        {state.error && (
          <p role="alert" className="text-sm text-destructive self-center">
            {state.error}
          </p>
        )}
      </form>

      {/* Modal assignation client — s'ouvre uniquement au passage en en_attente_client */}
      <Dialog open={modalOuverte} onOpenChange={setModalOuverte}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assigner à un client</DialogTitle>
            <DialogDescription>
              Ce ticket passe en attente de retour client. Choisissez à qui l&apos;assigner
              — il apparaîtra dans la vue &ldquo;Mes tickets&rdquo; du client sélectionné.
            </DialogDescription>
          </DialogHeader>

          <form
            action={assignationAction}
            onSubmit={() => setModalOuverte(false)}
            className="flex flex-col gap-4"
          >
            <input type="hidden" name="ticket_id" value={ticketId} />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Client assigné</label>
              <Select
                name="assigne_a"
                value={clientChoisi}
                onValueChange={setClientChoisi}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un client..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NON_ASSIGNE}>— Aucun (pas d&apos;assignation)</SelectItem>
                  {clientsDuProjet.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.full_name || c.email || c.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {assignationState.error && (
              <p className="text-sm text-destructive">{assignationState.error}</p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setModalOuverte(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={assignationPending}>
                {assignationPending ? "..." : "Confirmer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
