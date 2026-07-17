"use client";

import { useActionState, useMemo, useState } from "react";
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
import { TICKET_PRIORITES, TICKET_PRIORITE_LABELS, type Tag } from "@/lib/types";
import type { ProjetOption, ClientOption } from "@/lib/queries/tickets";
import { TagPicker } from "@/components/tag-picker";
import { createTicketAdmin, type FormState } from "../actions";

const initialState: FormState = { error: null };

export function CreateTicketAdminForm({
  projets,
  clientsParProjet,
  tags,
}: {
  projets: ProjetOption[];
  clientsParProjet: Record<string, ClientOption[]>;
  tags: Tag[];
}) {
  const [state, formAction, isPending] = useActionState(
    createTicketAdmin,
    initialState
  );
  const [projetId, setProjetId] = useState<string>("");
  const [clientId, setClientId] = useState<string>("");

  const clientsDisponibles = useMemo(
    () => (projetId ? clientsParProjet[projetId] ?? [] : []),
    [projetId, clientsParProjet]
  );

  function handleProjetChange(value: string) {
    setProjetId(value);
    setClientId(""); // le client dépend du projet, on réinitialise
  }

  return (
    <form action={formAction} className="flex flex-col gap-4 max-w-lg">
      <div className="flex flex-col gap-2">
        <Label htmlFor="titre">Titre</Label>
        <Input id="titre" name="titre" required />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={4} />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Projet</Label>
        <Select value={projetId} onValueChange={handleProjetChange}>
          <SelectTrigger className="w-full">
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
        <input type="hidden" name="projet_id" value={projetId} />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Client</Label>
        <Select
          value={clientId}
          onValueChange={setClientId}
          disabled={!projetId}
        >
          <SelectTrigger className="w-full">
            <SelectValue
              placeholder={
                projetId ? "Choisir un client" : "Choisis d'abord un projet"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {clientsDisponibles.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.full_name || c.email || c.id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input type="hidden" name="client_id" value={clientId} />
        {projetId && clientsDisponibles.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Aucun client rattaché à ce projet pour l&apos;instant.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label>Priorité</Label>
        <Select name="priorite" defaultValue="normale">
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TICKET_PRIORITES.map((p) => (
              <SelectItem key={p} value={p}>
                {TICKET_PRIORITE_LABELS[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Tags</Label>
        <TagPicker tags={tags} />
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={isPending} className="mt-2 self-start">
        {isPending ? "Création..." : "Créer le ticket"}
      </Button>
    </form>
  );
}
