"use client";

import { useActionState, useRef } from "react";
import { Paperclip, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToastOnSuccess } from "@/hooks/use-toast-on-success";
import { uploadAttachment, type ActionResult } from "@/lib/actions/attachments";

export type AttachmentRow = {
  id: string;
  nom_fichier: string;
  taille_octets: number | null;
  url: string | null;
  created_at: string;
};

const initialState: ActionResult = { error: null };

function formatTaille(octets: number | null): string {
  if (!octets) return "";
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(0)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
}

export function AttachmentsPanel({
  ticketId,
  attachments,
}: {
  ticketId: string;
  attachments: AttachmentRow[];
}) {
  const [state, formAction, isPending] = useActionState(uploadAttachment, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useToastOnSuccess(isPending, state.error, "Fichier envoyé.");

  return (
    <div className="flex flex-col gap-3 border-t pt-4">
      <h2 className="text-sm font-semibold">Pièces jointes</h2>

      {attachments.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {attachments.map((a) => (
            <li key={a.id} className="flex items-center gap-2 text-sm">
              <Paperclip className="size-3.5 text-muted-foreground shrink-0" />
              {a.url ? (
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-primary truncate"
                >
                  {a.nom_fichier}
                </a>
              ) : (
                <span className="truncate">{a.nom_fichier}</span>
              )}
              <span className="text-xs text-muted-foreground shrink-0">
                {formatTaille(a.taille_octets)}
              </span>
              {a.url && (
                <a href={a.url} download className="ml-auto text-muted-foreground hover:text-foreground">
                  <Download className="size-3.5" />
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
      {attachments.length === 0 && (
        <p className="text-sm text-muted-foreground">Aucune pièce jointe.</p>
      )}

      <form
        ref={formRef}
        action={async (formData) => {
          await formAction(formData);
          formRef.current?.reset();
        }}
        className="flex items-center gap-2"
      >
        <input type="hidden" name="ticket_id" value={ticketId} />
        <input
          type="file"
          name="file"
          required
          className="text-xs file:mr-2 file:rounded-md file:border file:bg-secondary file:px-2 file:py-1 file:text-xs file:font-medium file:text-secondary-foreground"
        />
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Envoi..." : "Envoyer"}
        </Button>
      </form>
      <p className="text-xs text-muted-foreground">Max 10 Mo par fichier.</p>
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
    </div>
  );
}
