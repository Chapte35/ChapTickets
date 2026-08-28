"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { Paperclip, Download, ImageIcon, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToastOnSuccess } from "@/hooks/use-toast-on-success";
import { uploadAttachment, deleteAttachment, type ActionResult } from "@/lib/actions/attachments";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type AttachmentRow = {
  id: string;
  nom_fichier: string;
  taille_octets: number | null;
  url: string | null;
  type_mime: string | null;
  created_at: string;
};

const initialState: ActionResult = { error: null };

function formatTaille(octets: number | null): string {
  if (!octets) return "";
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(0)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
}

function estImage(typeMime: string | null, nomFichier: string): boolean {
  if (typeMime?.startsWith("image/")) return true;
  const ext = nomFichier.split(".").pop()?.toLowerCase();
  return ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext ?? "");
}

function AttachmentItem({
  attachment,
  ticketId,
  onDeleted,
}: {
  attachment: AttachmentRow;
  ticketId: string;
  onDeleted: (id: string) => void;
}) {
  const isImg = estImage(attachment.type_mime, attachment.nom_fichier);
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      // Auto-annuler la confirmation après 3s
      setTimeout(() => setConfirming(false), 3000);
      return;
    }
    startTransition(async () => {
      const result = await deleteAttachment(attachment.id, ticketId);
      if (result.error) {
        toast.error(result.error);
        setConfirming(false);
      } else {
        toast.success("Pièce jointe supprimée.");
        onDeleted(attachment.id);
      }
    });
  }

  return (
    <li className="flex flex-col gap-1.5">
      {/* Preview image si applicable */}
      {isImg && attachment.url && (
        <a
          href={attachment.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-md overflow-hidden border bg-muted/30 hover:opacity-90 transition-opacity"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={attachment.url}
            alt={attachment.nom_fichier}
            className="max-h-48 w-full object-contain"
            loading="lazy"
          />
        </a>
      )}

      {/* Ligne fichier */}
      <div className="flex items-center gap-2 text-sm">
        {isImg ? (
          <ImageIcon className="size-3.5 text-muted-foreground shrink-0" />
        ) : (
          <Paperclip className="size-3.5 text-muted-foreground shrink-0" />
        )}

        {attachment.url ? (
          <a
            href={attachment.url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-primary truncate"
          >
            {attachment.nom_fichier}
          </a>
        ) : (
          <span className="truncate">{attachment.nom_fichier}</span>
        )}

        <span className="text-xs text-muted-foreground shrink-0">
          {formatTaille(attachment.taille_octets)}
        </span>

        <div className="ml-auto flex items-center gap-1 shrink-0">
          {attachment.url && (
            <a
              href={attachment.url}
              download
              className="text-muted-foreground hover:text-foreground"
            >
              <Download className="size-3.5" />
            </a>
          )}
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className={cn(
              "text-xs px-1.5 py-0.5 rounded transition-colors",
              confirming
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : "text-muted-foreground hover:text-destructive"
            )}
            title={confirming ? "Cliquer pour confirmer" : "Supprimer"}
          >
            {isPending ? (
              <span className="text-xs">...</span>
            ) : confirming ? (
              <span className="text-xs font-medium">Confirmer</span>
            ) : (
              <Trash2 className="size-3.5" />
            )}
          </button>
        </div>
      </div>
    </li>
  );
}

export function AttachmentsPanel({
  ticketId,
  attachments: attachmentsInitiales,
}: {
  ticketId: string;
  attachments: AttachmentRow[];
}) {
  const [state, formAction, isPending] = useActionState(uploadAttachment, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  // Optimistic UI : on retire la PJ de la liste localement dès la suppression
  const [attachments, setAttachments] = useState(attachmentsInitiales);

  useToastOnSuccess(isPending, state.error, "Fichier envoyé.");

  function handleDeleted(id: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <div className="flex flex-col gap-3 border-t pt-4">
      <h2 className="text-sm font-semibold">Pièces jointes</h2>

      {attachments.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {attachments.map((a) => (
            <AttachmentItem key={a.id} attachment={a} ticketId={ticketId} onDeleted={handleDeleted} />
          ))}
        </ul>
      ) : (
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
