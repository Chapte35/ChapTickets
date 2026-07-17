"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { TAG_COLORS, TAG_COLOR_CLASSES } from "@/lib/types";
import { createTag, type FormState } from "./actions";

const initialState: FormState = { error: null };

export function CreateTagForm() {
  const [state, formAction, isPending] = useActionState(createTag, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4 max-w-sm">
      <div className="flex flex-col gap-2">
        <Label htmlFor="nom">Nom</Label>
        <Input id="nom" name="nom" required />
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
