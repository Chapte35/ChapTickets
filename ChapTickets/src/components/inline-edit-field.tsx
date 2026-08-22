"use client";

import { useRef, useState, useTransition, type KeyboardEvent } from "react";
import { Pencil, Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type FormState = { error: string | null };

/**
 * Champ click-to-edit inline avec icône crayon au hover.
 * Supporte deux modes : "input" (ligne) et "textarea" (multi-ligne).
 *
 * L'action doit accepter (_prevState, formData) avec un champ "valeur"
 * et un champ "ticket_id". On passe ticketId ici pour l'injecter dans le
 * FormData sans exposer un hidden input visible dans le DOM.
 *
 * Échap → annule sans sauvegarder.
 * Pour "input" : Entrée → sauvegarde (Shift+Entrée désactivé).
 * Pour "textarea" : Ctrl+Entrée → sauvegarde.
 */
export function InlineEditField({
  ticketId,
  valeurInitiale,
  mode,
  action,
  className,
  placeholderVide,
  renderVide,
  renderRempli,
}: {
  ticketId: string;
  valeurInitiale: string;
  mode: "input" | "textarea";
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  className?: string;
  /** Texte affiché quand le champ est vide et qu'on survole. */
  placeholderVide?: string;
  /** Rendu en lecture quand la valeur est vide (ex : span italic). */
  renderVide?: React.ReactNode;
  /** Rendu en lecture quand la valeur est remplie (ex : <p className="...">). */
  renderRempli: (valeur: string) => React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [valeur, setValeur] = useState(valeurInitiale);
  const [brouillon, setBrouillon] = useState(valeurInitiale);
  const [erreur, setErreur] = useState<string | null>(null);
  const [hovered, setHovered] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  function commencerEdition() {
    setBrouillon(valeur);
    setErreur(null);
    setEditing(true);
    // Focus au prochain tick — le champ n'est pas encore dans le DOM
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function annuler() {
    setEditing(false);
    setErreur(null);
    setBrouillon(valeur);
  }

  function sauvegarder() {
    if (brouillon.trim() === valeur.trim()) {
      setEditing(false);
      return;
    }
    const fd = new FormData();
    fd.append("ticket_id", ticketId);
    fd.append("valeur", brouillon.trim());

    startTransition(async () => {
      const result = await action({ error: null }, fd);
      if (result.error) {
        setErreur(result.error);
      } else {
        setValeur(brouillon.trim());
        setEditing(false);
      }
    });
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      annuler();
      return;
    }
    if (mode === "input" && e.key === "Enter") {
      e.preventDefault();
      sauvegarder();
      return;
    }
    if (mode === "textarea" && e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      sauvegarder();
    }
  }

  if (editing) {
    return (
      <div className={cn("flex flex-col gap-1.5", className)}>
        {mode === "input" ? (
          <Input
            ref={inputRef as React.Ref<HTMLInputElement>}
            value={brouillon}
            onChange={(e) => setBrouillon(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isPending}
            className="text-sm font-semibold"
          />
        ) : (
          <Textarea
            ref={inputRef as React.Ref<HTMLTextAreaElement>}
            value={brouillon}
            onChange={(e) => setBrouillon(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isPending}
            className="text-sm min-h-24"
            placeholder={placeholderVide}
          />
        )}
        {mode === "textarea" && (
          <p className="text-xs text-muted-foreground">Ctrl+Entrée pour sauvegarder · Échap pour annuler</p>
        )}
        {erreur && <p className="text-xs text-destructive">{erreur}</p>}
        <div className="flex gap-1.5">
          <Button
            size="sm"
            variant="default"
            onClick={sauvegarder}
            disabled={isPending}
            className="h-7 px-2 gap-1.5"
          >
            {isPending ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Check className="size-3" />
            )}
            Sauvegarder
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={annuler}
            disabled={isPending}
            className="h-7 px-2 gap-1.5"
          >
            <X className="size-3" />
            Annuler
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn("group relative cursor-pointer", className)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={commencerEdition}
      role="button"
      tabIndex={0}
      aria-label="Cliquer pour modifier"
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") commencerEdition();
      }}
    >
      {/* Crayon au hover */}
      <span
        className={cn(
          "absolute -top-1 -right-1 flex items-center justify-center rounded-full bg-muted p-0.5 shadow-sm transition-opacity",
          hovered ? "opacity-100" : "opacity-0"
        )}
        aria-hidden
      >
        <Pencil className="size-2.5 text-muted-foreground" />
      </span>

      {/* Contenu lu */}
      <div className={cn("rounded transition-colors", hovered && "bg-muted/50")}>
        {valeur ? renderRempli(valeur) : renderVide}
      </div>
    </div>
  );
}
