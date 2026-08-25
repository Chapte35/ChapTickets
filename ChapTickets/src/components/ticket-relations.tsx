"use client";

import { useActionState, useState, useTransition, useRef, useEffect } from "react";
import { Link2, X, Plus, Search, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  TICKET_STATUT_LABELS,
  ticketStatutBadgeVariant,
  formatRefTicket,
  type TicketStatut,
  type TicketPriorite,
} from "@/lib/types";
import { PrioriteBadge } from "@/components/priorite-badge";
import {
  ajouterRelation,
  supprimerRelation,
  rechercherTicketsPourRelation,
} from "@/lib/actions/ticket-relations";

export type TicketRelation = {
  id: string;
  rang_projet: number;
  titre: string;
  statut: TicketStatut;
  priorite: TicketPriorite;
  code_court: string | null;
  lien: string; // /admin/tickets/[id] ou /dashboard/tickets/[id]
};

type FormState = { error: string | null };
const initialState: FormState = { error: null };

type ResultatRecherche = {
  id: string;
  rang_projet: number;
  titre: string;
  code_court: string | null;
};

// ── Chip ticket lié ───────────────────────────────────────────────────────────

function ChipRelation({
  ticketId,
  relation,
}: {
  ticketId: string;
  relation: TicketRelation;
}) {
  const [state, formAction, isPending] = useActionState(supprimerRelation, initialState);
  const ref = formatRefTicket(relation.rang_projet, relation.code_court);

  return (
    <div className={cn(
      "group flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm transition-colors hover:border-muted-foreground/40",
      isPending && "opacity-50"
    )}>
      <a
        href={relation.lien}
        className="flex items-center gap-2 flex-1 min-w-0 hover:underline underline-offset-2"
      >
        <Link2 className="size-3 text-muted-foreground shrink-0" />
        <span className="font-mono text-xs text-muted-foreground">{ref}</span>
        <span className="font-medium truncate">{relation.titre}</span>
        <PrioriteBadge priorite={relation.priorite} />
        <Badge variant={ticketStatutBadgeVariant(relation.statut)} className="text-xs shrink-0">
          {TICKET_STATUT_LABELS[relation.statut]}
        </Badge>
      </a>
      <form action={formAction}>
        <input type="hidden" name="ticket_id" value={ticketId} />
        <input type="hidden" name="ticket_cible_id" value={relation.id} />
        <button
          type="submit"
          disabled={isPending}
          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
          aria-label="Retirer la relation"
        >
          {isPending ? <Loader2 className="size-3 animate-spin" /> : <X className="size-3" />}
        </button>
      </form>
      {state.error && <p className="text-xs text-destructive">{state.error}</p>}
    </div>
  );
}

// ── Picker de recherche ───────────────────────────────────────────────────────

function RelationPicker({
  ticketId,
  onAdded,
}: {
  ticketId: string;
  onAdded: () => void;
}) {
  const [query, setQuery] = useState("");
  const [resultats, setResultats] = useState<ResultatRecherche[]>([]);
  const [searching, startSearch] = useTransition();
  const [state, formAction, isPending] = useActionState(ajouterRelation, initialState);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResultats([]); return; }
    startSearch(async () => {
      const res = await rechercherTicketsPourRelation(ticketId, query);
      setResultats(res);
    });
  }, [query, ticketId]);

  // Reset et notifie le parent après ajout réussi
  useEffect(() => {
    if (!isPending && !state.error && state.error === null) {
      // On vérifie si un ajout vient d'avoir lieu (state fraîchement résolu)
    }
  }, [isPending, state.error]);

  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher par titre ou ref (ex: CHAP#12)…"
          className="pl-8 text-sm"
        />
        {searching && (
          <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 animate-spin text-muted-foreground" />
        )}
      </div>

      {resultats.length > 0 && (
        <ul className="flex flex-col gap-1">
          {resultats.map((t) => {
            const ref = formatRefTicket(t.rang_projet, t.code_court);
            return (
              <li key={t.id}>
                <form action={formAction} onSubmit={() => { setQuery(""); setResultats([]); onAdded(); }}>
                  <input type="hidden" name="ticket_id" value={ticketId} />
                  <input type="hidden" name="ticket_cible_id" value={t.id} />
                  <button
                    type="submit"
                    disabled={isPending}
                    className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left hover:bg-accent transition-colors"
                  >
                    <span className="font-mono text-xs text-muted-foreground">{ref}</span>
                    <span className="truncate">{t.titre}</span>
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}

      {query.trim() && !searching && resultats.length === 0 && (
        <p className="text-xs text-muted-foreground px-1">Aucun ticket trouvé.</p>
      )}

      {state.error && (
        <p className="text-xs text-destructive">{state.error}</p>
      )}
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

export function TicketRelations({
  ticketId,
  relationsInitiales,
}: {
  ticketId: string;
  relationsInitiales: TicketRelation[];
}) {
  const [pickerOuvert, setPickerOuvert] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 className="size-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            Relations ({relationsInitiales.length})
          </span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-xs gap-1"
          onClick={() => setPickerOuvert((v) => !v)}
        >
          <Plus className="size-3" />
          Lier un ticket
        </Button>
      </div>

      {pickerOuvert && (
        <RelationPicker
          ticketId={ticketId}
          onAdded={() => setPickerOuvert(false)}
        />
      )}

      {relationsInitiales.length === 0 && !pickerOuvert && (
        <p className="text-xs text-muted-foreground italic">
          Aucune relation pour l&apos;instant.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {relationsInitiales.map((r) => (
          <ChipRelation key={r.id} ticketId={ticketId} relation={r} />
        ))}
      </div>
    </div>
  );
}
