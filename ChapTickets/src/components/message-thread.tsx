"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type MessageFormState = { error: string | null };

export type MessageRow = {
  id: string;
  contenu: string;
  created_at: string;
  auteur_id: string;
  profiles: {
    role: "admin" | "client";
    full_name: string | null;
    email: string | null;
  } | null;
};

type PostMessageAction = (
  prevState: MessageFormState,
  formData: FormData
) => Promise<MessageFormState>;

const initialState: MessageFormState = { error: null };

function MessageForm({
  ticketId,
  action,
}: {
  ticketId: string;
  action: PostMessageAction;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  // Vide le textarea après un envoi réussi. useActionState ne redirige pas
  // ici (on reste sur la page), donc pas de reset automatique du formulaire
  // par Next.js — on le fait à la main en détectant la transition
  // pending -> pas pending sans erreur.
  useEffect(() => {
    if (wasPending.current && !isPending && !state.error) {
      formRef.current?.reset();
    }
    wasPending.current = isPending;
  }, [isPending, state.error]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="ticket_id" value={ticketId} />
      <Textarea
        name="contenu"
        placeholder="Écrire un message..."
        rows={3}
        required
      />
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <Button type="submit" size="sm" disabled={isPending} className="self-start">
        {isPending ? "Envoi..." : "Envoyer"}
      </Button>
    </form>
  );
}

export function MessageThread({
  ticketId,
  messages,
  currentUserId,
  action,
}: {
  ticketId: string;
  messages: MessageRow[];
  currentUserId: string;
  action: PostMessageAction;
}) {
  return (
    <div className="flex flex-col gap-4 border-t pt-4">
      <h2 className="text-sm font-semibold">Messages</h2>

      {messages.length === 0 && (
        <p className="text-sm text-muted-foreground">Aucun message pour l&apos;instant.</p>
      )}

      <ul className="flex flex-col gap-3">
        {messages.map((m) => {
          const isMine = m.auteur_id === currentUserId;
          const isAdmin = m.profiles?.role === "admin";
          return (
            <li
              key={m.id}
              className={cn("flex flex-col gap-1", isMine ? "items-end" : "items-start")}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
                  isMine
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                )}
              >
                {m.contenu}
              </div>
              <span className="text-xs text-muted-foreground px-1">
                {isAdmin ? "Admin" : m.profiles?.full_name || m.profiles?.email || "Client"}
                {" · "}
                {new Date(m.created_at).toLocaleString("fr-FR", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </li>
          );
        })}
      </ul>

      <MessageForm ticketId={ticketId} action={action} />
    </div>
  );
}
