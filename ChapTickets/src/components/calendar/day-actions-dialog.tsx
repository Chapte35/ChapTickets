"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProjetOption } from "@/lib/queries/tickets";

export type TicketAssignable = { id: string; titre: string; projet_nom: string };

type FormState = { error: string | null };

export function DayActionsDialog({
  open,
  onOpenChange,
  dateLabel,
  dateIso,
  projets,
  projetFiltre,
  ticketsAssignables,
  createReleaseAction,
  assignDateAction,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dateLabel: string;
  dateIso: string;
  projets: ProjetOption[];
  projetFiltre?: string;
  ticketsAssignables: TicketAssignable[];
  createReleaseAction: (prevState: FormState, formData: FormData) => Promise<FormState>;
  assignDateAction: (prevState: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [releaseState, releaseFormAction, releasePending] = useActionState(
    createReleaseAction,
    { error: null } as FormState
  );
  const [assignState, assignFormAction, assignPending] = useActionState(
    assignDateAction,
    { error: null } as FormState
  );
  const [ticketId, setTicketId] = useState("");

  // Ferme le dialog tout seul quand une des deux actions vient de réussir —
  // sinon rien n'indique visuellement que ça a marché à part le formulaire
  // qui reste planté là, silencieux.
  const releaseWasPending = useRef(false);
  const assignWasPending = useRef(false);
  useEffect(() => {
    if (releaseWasPending.current && !releasePending && !releaseState.error) {
      toast.success("Release créée.");
      onOpenChange(false);
    }
    releaseWasPending.current = releasePending;
  }, [releasePending, releaseState.error, onOpenChange]);
  useEffect(() => {
    if (assignWasPending.current && !assignPending && !assignState.error) {
      toast.success("Ticket assigné à cette date.");
      onOpenChange(false);
    }
    assignWasPending.current = assignPending;
  }, [assignPending, assignState.error, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="capitalize">{dateLabel}</DialogTitle>
          <DialogDescription>
            Crée une release ce jour-là, ou assigne un ticket existant à cette date.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 rounded-lg border p-3">
            <h3 className="text-sm font-semibold">Nouvelle release</h3>
            <form action={releaseFormAction} className="flex flex-col gap-3">
              <input type="hidden" name="date" value={dateIso} />
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="release-nom">Nom</Label>
                <Input id="release-nom" name="nom" placeholder="v1.2" required className="h-8 text-sm" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="release-projet">Projet</Label>
                <Select name="projet_id" defaultValue={projetFiltre}>
                  <SelectTrigger id="release-projet" className="w-full h-8 text-sm">
                    <SelectValue placeholder="Choisir un projet" />
                  </SelectTrigger>
                  <SelectContent>
                    {projets.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="release-description">Description (optionnel)</Label>
                <Textarea id="release-description" name="description" rows={2} className="text-sm" />
              </div>
              {releaseState.error && (
                <p role="alert" className="text-sm text-destructive">
                  {releaseState.error}
                </p>
              )}
              <Button type="submit" size="sm" disabled={releasePending} className="self-start">
                {releasePending ? "Création..." : "Créer la release"}
              </Button>
            </form>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border p-3">
            <h3 className="text-sm font-semibold">Assigner un ticket à cette date</h3>
            {ticketsAssignables.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun ticket ouvert à assigner (ou filtre un projet pour en voir).
              </p>
            ) : (
              <form action={assignFormAction} className="flex flex-col gap-3">
                <input type="hidden" name="ticket_id" value={ticketId} />
                <input type="hidden" name="date_prevue" value={dateIso} />
                <Select value={ticketId} onValueChange={setTicketId}>
                  <SelectTrigger className="w-full h-8 text-sm">
                    <SelectValue placeholder="Choisir un ticket" />
                  </SelectTrigger>
                  <SelectContent>
                    {ticketsAssignables.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.titre} — {t.projet_nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {assignState.error && (
                  <p role="alert" className="text-sm text-destructive">
                    {assignState.error}
                  </p>
                )}
                <Button
                  type="submit"
                  size="sm"
                  disabled={assignPending || !ticketId}
                  className="self-start"
                >
                  {assignPending ? "..." : "Assigner"}
                </Button>
              </form>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
