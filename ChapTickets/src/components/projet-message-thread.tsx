"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type ProjetMessageFormState = { error: string | null };

export type ProjetMessageRow = {
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

type PostProjetMessageAction = (
  prevState: ProjetMessageFormState,
  formData: FormData
) => Promise<ProjetMessageFormState>;

const initialState: ProjetMessageFormState = { error: null };

export function ProjetMessageThread({
  projetId,
  messages,
  currentUserId,
  action,
}: {
  projetId: string;
  messages: ProjetMessageRow[];
  currentUserId: string;
  action: PostProjetMessageAction;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state.error) {
      formRef.current?.reset();
    }
    wasPending.current = isPending;
  }, [isPending, state.error]);

  return (
    <div className="flex flex-col gap-4">
      {messages.length === 0 && (
        <p className="text-sm text-muted-foreground py-6 text-center">
          Aucun message pour l&apos;instant. Lance la conversation.
        </p>
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
                  isMine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
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

      <form ref={formRef} action={formAction} className="flex flex-col gap-2">
        <input type="hidden" name="projet_id" value={projetId} />
        <Textarea name="contenu" placeholder="Écrire un message..." rows={3} required />
        {state.error && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}
        <Button type="submit" size="sm" disabled={isPending} className="self-start">
          {isPending ? "Envoi..." : "Envoyer"}
        </Button>
      </form>
    </div>
  );
}
