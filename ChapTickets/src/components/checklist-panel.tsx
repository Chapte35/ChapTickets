"use client";

import { useActionState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  createChecklistItem,
  deleteChecklistItem,
  toggleChecklistItem,
  type ActionResult,
} from "@/lib/actions/ticket-extras";

export type ChecklistItemRow = {
  id: string;
  contenu: string;
  complete: boolean;
};

const initialState: ActionResult = { error: null };

function ChecklistItemRowView({
  item,
  ticketId,
}: {
  item: ChecklistItemRow;
  ticketId: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <li className="flex items-center gap-2 group">
      <input
        type="checkbox"
        checked={item.complete}
        disabled={isPending}
        onChange={(e) =>
          startTransition(() => {
            toggleChecklistItem(item.id, ticketId, e.target.checked);
          })
        }
        className="size-4 rounded border-input accent-primary cursor-pointer"
      />
      <span
        className={cn(
          "text-sm flex-1",
          item.complete && "line-through text-muted-foreground"
        )}
      >
        {item.contenu}
      </span>
      <form action={deleteChecklistItem} className="opacity-0 group-hover:opacity-100 transition-opacity">
        <input type="hidden" name="item_id" value={item.id} />
        <input type="hidden" name="ticket_id" value={ticketId} />
        <button type="submit" className="text-muted-foreground hover:text-destructive" aria-label="Supprimer">
          <Trash2 className="size-3.5" />
        </button>
      </form>
    </li>
  );
}

export function ChecklistPanel({
  ticketId,
  items,
}: {
  ticketId: string;
  items: ChecklistItemRow[];
}) {
  const [state, formAction, isPending] = useActionState(createChecklistItem, initialState);
  const total = items.length;
  const faites = items.filter((i) => i.complete).length;
  const pct = total > 0 ? Math.round((faites / total) * 100) : 0;

  return (
    <div className="flex flex-col gap-3 border-t pt-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Checklist</h2>
        {total > 0 && (
          <span className="text-xs text-muted-foreground">
            {faites}/{total}
          </span>
        )}
      </div>

      {total > 0 && (
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {items.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {items.map((item) => (
            <ChecklistItemRowView key={item.id} item={item} ticketId={ticketId} />
          ))}
        </ul>
      )}

      <form action={formAction} className="flex gap-2">
        <input type="hidden" name="ticket_id" value={ticketId} />
        <Input name="contenu" placeholder="Ajouter un élément..." className="h-8 text-sm" required />
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "..." : "Ajouter"}
        </Button>
      </form>
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
    </div>
  );
}
