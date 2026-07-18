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
import {
  TICKET_PRIORITES,
  TICKET_PRIORITE_LABELS,
  type TicketPriorite,
  type Tag,
} from "@/lib/types";
import type { ProjetOption } from "@/lib/queries/tickets";
import { TagPicker } from "@/components/tag-picker";
import { TicketPreviewCard } from "@/components/ticket-preview-card";
import { createTicketClient, type FormState } from "../actions";

const initialState: FormState = { error: null };

export function CreateTicketClientForm({
  projets,
  tags,
  clientNom,
}: {
  projets: ProjetOption[];
  tags: Tag[];
  clientNom: string | null;
}) {
  const [state, formAction, isPending] = useActionState(
    createTicketClient,
    initialState
  );

  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [priorite, setPriorite] = useState<TicketPriorite>("normale");
  const [tagsSelectionnes, setTagsSelectionnes] = useState<Tag[]>([]);
  const [projetId, setProjetId] = useState<string>("");

  const projetNom = useMemo(
    () => projets.find((p) => p.id === projetId)?.nom ?? null,
    [projetId, projets]
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2 items-start">
      <form action={formAction} className="flex flex-col gap-4 min-w-0">
        <div className="flex flex-col gap-2">
          <Label htmlFor="titre">Titre</Label>
          <Input
            id="titre"
            name="titre"
            required
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Projet</Label>
          <Select name="projet_id" value={projetId} onValueChange={setProjetId} required>
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
        </div>

        <div className="flex flex-col gap-2">
          <Label>Priorité</Label>
          <Select
            name="priorite"
            value={priorite}
            onValueChange={(v) => setPriorite(v as TicketPriorite)}
          >
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
          <TagPicker tags={tags} onSelectionChange={setTagsSelectionnes} />
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

      <div className="lg:sticky lg:top-6 flex flex-col gap-2 min-w-0">
        <span className="text-xs text-muted-foreground">Aperçu</span>
        <TicketPreviewCard
          titre={titre}
          description={description}
          priorite={priorite}
          projetNom={projetNom}
          clientNom={clientNom}
          dateEcheance={null}
          tags={tagsSelectionnes}
        />
      </div>
    </div>
  );
}
