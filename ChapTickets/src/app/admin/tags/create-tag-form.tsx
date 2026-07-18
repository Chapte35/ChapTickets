"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { TAG_COLORS, TAG_COLOR_CLASSES, TAG_PORTEE_GENERIQUE } from "@/lib/types";
import type { ProjetOption } from "@/lib/queries/tickets";
import { useToastOnSuccess } from "@/hooks/use-toast-on-success";
import { createTag, type FormState } from "./actions";

const initialState: FormState = { error: null };

export function CreateTagForm({ projets }: { projets: ProjetOption[] }) {
  const [state, formAction, isPending] = useActionState(createTag, initialState);

  useToastOnSuccess(isPending, state.error, "Tag créé.");

  return (
    <form action={formAction} className="flex flex-col gap-4 max-w-sm">
      <div className="flex flex-col gap-2">
        <Label htmlFor="nom">Nom</Label>
        <Input id="nom" name="nom" required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="projet_id">Portée</Label>
        <Select name="projet_id" defaultValue={TAG_PORTEE_GENERIQUE}>
          <SelectTrigger id="projet_id" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TAG_PORTEE_GENERIQUE}>Générique (tous les projets)</SelectItem>
            {projets.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                Exclusif à {p.nom}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label>Couleur</Label>
        <div className="flex flex-wrap gap-2">
          {TAG_COLORS.map((c, i) => (
            <label key={c} className="cursor-pointer">
              <input
                type="radio"
                name="couleur"
                value={c}
                defaultChecked={i === TAG_COLORS.length - 1}
                className="peer sr-only"
              />
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium opacity-40 transition-opacity peer-checked:opacity-100",
                  TAG_COLOR_CLASSES[c]
                )}
              >
                {c}
              </span>
            </label>
          ))}
        </div>
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "Création..." : "Créer le tag"}
      </Button>
    </form>
  );
}
