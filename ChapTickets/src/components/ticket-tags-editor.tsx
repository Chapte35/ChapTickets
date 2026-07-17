"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { TAG_COLOR_CLASSES, type Tag } from "@/lib/types";
import { toggleTicketTag } from "@/lib/actions/ticket-extras";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function TicketTagsEditor({
  ticketId,
  tagsActuels,
  tousLesTags,
}: {
  ticketId: string;
  tagsActuels: Tag[];
  /** Tous les tags existants, pour proposer ceux qui ne sont pas encore posés. */
  tousLesTags: Tag[];
}) {
  const [isPending, startTransition] = useTransition();
  const [pickerOuvert, setPickerOuvert] = useState(false);

  const idsActuels = new Set(tagsActuels.map((t) => t.id));
  const tagsDisponibles = tousLesTags.filter((t) => !idsActuels.has(t.id));

  function retirer(tagId: string) {
    startTransition(() => {
      toggleTicketTag(ticketId, tagId, false);
    });
  }

  function ajouter(tagId: string) {
    startTransition(() => {
      toggleTicketTag(ticketId, tagId, true);
    });
    setPickerOuvert(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tagsActuels.map((tag) => (
        <span
          key={tag.id}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border pl-2 pr-1 py-0.5 text-xs font-medium",
            TAG_COLOR_CLASSES[tag.couleur]
          )}
        >
          {tag.nom}
          <button
            type="button"
            onClick={() => retirer(tag.id)}
            disabled={isPending}
            className="hover:opacity-70"
            aria-label={`Retirer ${tag.nom}`}
          >
            <X className="size-3" />
          </button>
        </span>
      ))}

      <div className="relative">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setPickerOuvert((v) => !v)}
              className="inline-flex items-center justify-center rounded-full border border-dashed size-6 text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
              aria-label="Ajouter un tag"
            >
              <Plus className="size-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Ajouter un tag</TooltipContent>
        </Tooltip>

        {pickerOuvert && (
          <div className="absolute z-10 top-8 left-0 flex flex-wrap gap-1.5 rounded-md border bg-popover p-2 shadow-md w-56">
            {tagsDisponibles.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Tous les tags existants sont déjà posés.
              </p>
            )}
            {tagsDisponibles.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => ajouter(tag.id)}
                className={cn(
                  "rounded-full border px-2 py-0.5 text-xs font-medium hover:opacity-70",
                  TAG_COLOR_CLASSES[tag.couleur]
                )}
              >
                {tag.nom}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
