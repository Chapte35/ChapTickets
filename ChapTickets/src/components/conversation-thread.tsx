"use client";

import {
  MessageForm,
  MessageBubbleList,
  type MessageRow,
  type MessageThreadContext,
  type PostMessageAction,
} from "@/components/message-thread";

/**
 * Contrairement à MessageThread (fil embarqué dans une Card qui grandit
 * avec son contenu, sur la fiche ticket), ce composant est pensé pour
 * occuper toute la hauteur disponible de son conteneur parent (lui-même
 * dimensionné par le layout messagerie) : header fixe, liste de messages
 * qui scrolle seule au milieu, formulaire d'envoi fixe en bas — le pattern
 * "conversation plein écran" classique (Instagram, Messenger...).
 */
export function ConversationThread({
  title,
  subtitle,
  context,
  messages,
  currentUserId,
  action,
}: {
  title: string;
  subtitle?: string | null;
  context: MessageThreadContext;
  messages: MessageRow[];
  currentUserId: string;
  action: PostMessageAction;
}) {
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="border-b px-6 py-4 shrink-0">
        <h1 className="font-semibold">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
        <MessageBubbleList messages={messages} currentUserId={currentUserId} />
      </div>

      <div className="border-t px-6 py-4 shrink-0">
        <MessageForm context={context} action={action} />
      </div>
    </div>
  );
}
