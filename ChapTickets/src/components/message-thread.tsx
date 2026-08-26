"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Avatar, type AvatarCouleur } from "@/components/avatar";

export type MessageFormState = { error: string | null };

export type MessageRow = {
  id: string;
  contenu: string;
  created_at: string;
  auteur_id: string;
  profiles: {
    role: "admin" | "client";
    pseudo: string | null;
    full_name: string | null;
    email: string | null;
    avatar_couleur?: string | null;
    initiales?: string | null;
  } | null;
};

export type PostMessageAction = (
  prevState: MessageFormState,
  formData: FormData
) => Promise<MessageFormState>;

/**
 * Mécanisme générique de hidden field : `messages` sert à la fois aux fils
 * par ticket et aux conversations directes par client (cf. migration
 * 0010) — un message pointe soit vers un ticket, soit vers un client,
 * jamais les deux. `messages_projet` (conversations par projet) utilise le
 * même mécanisme avec son propre champ. Les composants restent génériques
 * sur ce point plutôt que d'exister en plusieurs copies quasi identiques —
 * seul le hidden field posté au serveur change.
 */
export type MessageThreadContext =
  | { field: "ticket_id"; value: string }
  | { field: "client_id"; value: string }
  | { field: "projet_id"; value: string };

const initialState: MessageFormState = { error: null };

/**
 * Formulaire d'envoi seul, exporté pour être réutilisé aussi bien dans le
 * fil "embarqué" d'une fiche ticket (MessageThread ci-dessous) que dans la
 * vue "conversation plein écran" façon Instagram (ConversationThread).
 */
export function MessageForm({
  context,
  action,
}: {
  context: MessageThreadContext;
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
      <input type="hidden" name={context.field} value={context.value} />
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

/** Liste des bulles de messages, exportée pour la même raison que MessageForm ci-dessus. */
export function MessageBubbleList({
  messages,
  currentUserId,
}: {
  messages: MessageRow[];
  currentUserId: string;
}) {
  if (messages.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Aucun message pour l&apos;instant.</p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {messages.map((m) => {
        const isMine = m.auteur_id === currentUserId;
        const isAdmin = m.profiles?.role === "admin";
        return (
          <li
            key={m.id}
            className={cn("flex gap-2 items-end", isMine ? "flex-row-reverse" : "flex-row")}
          >
            {/* Avatar de l'auteur */}
            <Avatar
              nom={m.profiles?.pseudo || m.profiles?.full_name || m.profiles?.email || (isAdmin ? "Admin" : "Client")}
              size="sm"
              couleur={(m.profiles?.avatar_couleur as AvatarCouleur | null) ?? null}
              initiales={m.profiles?.initiales ?? null}
            />

            <div className="flex flex-col gap-1 max-w-[75%]" style={{ alignItems: isMine ? "flex-end" : "flex-start" }}>
              <div
                className={cn(
                  "rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
                  isMine
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                )}
              >
                {m.contenu}
              </div>
              <span className="text-xs text-muted-foreground px-1">
                {isAdmin
                  ? `Admin : ${m.profiles?.pseudo || m.profiles?.full_name || m.profiles?.email || "Admin"}`
                  : `Client : ${m.profiles?.pseudo || m.profiles?.full_name || m.profiles?.email || "Client"}`}
                {" · "}
                {new Date(m.created_at).toLocaleString("fr-FR", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Fil "embarqué" : utilisé sur la fiche ticket (admin + client), au milieu
 * d'autres panneaux (checklist, PJ...) dans une Card qui grandit avec son
 * contenu. Pas de scroll interne ici, volontairement — cf. ConversationThread
 * pour la vue plein écran façon messagerie, dont les contraintes de hauteur
 * sont différentes.
 */
export function MessageThread({
  context,
  messages,
  currentUserId,
  action,
  title = "Messages",
}: {
  context: MessageThreadContext;
  messages: MessageRow[];
  currentUserId: string;
  action: PostMessageAction;
  title?: string | null;
}) {
  return (
    <div className="flex flex-col gap-4 border-t pt-4">
      {title && <h2 className="text-sm font-semibold">{title}</h2>}
      <MessageBubbleList messages={messages} currentUserId={currentUserId} />
      <MessageForm context={context} action={action} />
    </div>
  );
}
