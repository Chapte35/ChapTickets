"use client";

import { useRef, useState, useTransition, useEffect, type KeyboardEvent } from "react";
import dynamic from "next/dynamic";

const RichTextEditor = dynamic(() => import("@/components/rich-text-editor").then(m => m.RichTextEditor), { ssr: false });
import { Pencil, Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

type FormState = { error: string | null };

/**
 * Champ click-to-edit inline avec icône crayon au hover.
 * Modes :
 *   "title"    — textarea auto-height stylée comme un titre (font-semibold),
 *                sauvegarde sur Entrée (Shift+Entrée = saut de ligne désactivé).
 *                Remplace l'ancien mode "input" qui était une ligne unique —
 *                problématique sur mobile où éditer le début du titre était galère.
 *   "textarea" — textarea multi-ligne classique, sauvegarde sur Ctrl+Entrée.
 *
 * L'action doit accepter (_prevState, formData) avec un champ "valeur"
 * et un champ "ticket_id". On passe ticketId ici pour l'injecter dans le
 * FormData sans exposer un hidden input visible dans le DOM.
 *
 * Échap → annule sans sauvegarder.
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
  mode: "title" | "textarea" | "richtext";
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize du textarea en fonction du contenu
  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  useEffect(() => {
    if (editing) {
      setTimeout(() => {
        textareaRef.current?.focus();
        // Place le curseur à la fin
        const len = textareaRef.current?.value.length ?? 0;
        textareaRef.current?.setSelectionRange(len, len);
        autoResize();
      }, 0);
    }
  }, [editing]);

  function commencerEdition() {
    setBrouillon(valeur);
    setErreur(null);
    setEditing(true);
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
    if (mode === "title" && e.key === "Enter" && !e.shiftKey) {
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
        {mode === "richtext" ? (
          <RichTextEditor
            ticketId={ticketId}
            valeurInitiale={brouillon}
            onChange={setBrouillon}
            placeholder={placeholderVide}
          />
        ) : (
          <Textarea
            ref={textareaRef}
            value={brouillon}
            onChange={(e) => {
              setBrouillon(e.target.value);
              autoResize();
            }}
            onKeyDown={handleKeyDown}
            disabled={isPending}
            placeholder={placeholderVide}
            rows={1}
            className={cn(
              "resize-none overflow-hidden",
              mode === "title"
                ? "text-base font-semibold leading-snug min-h-0 py-1"
                : "text-sm min-h-24"
            )}
          />
        )}
        {(mode === "textarea" || mode === "richtext") && (
          <p className="text-xs text-muted-foreground">Ctrl+Entrée pour sauvegarder · Échap pour annuler</p>
        )}
        {mode === "title" && (
          <p className="text-xs text-muted-foreground">Entrée pour sauvegarder · Échap pour annuler</p>
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
