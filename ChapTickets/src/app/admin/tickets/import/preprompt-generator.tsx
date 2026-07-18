"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TICKET_PRIORITES, tagsVisiblesPourProjet, type Tag } from "@/lib/types";
import type { ProjetOption, ClientOption } from "@/lib/queries/tickets";

function construirePrompt(params: {
  projetNom: string;
  clientEmail: string;
  tags: Tag[];
}): string {
  const { projetNom, clientEmail, tags } = params;
  const tagsListe =
    tags.length > 0
      ? tags.map((t) => t.nom).join(", ")
      : "(aucun tag existant pour l'instant — n'en invente pas, laisse tags vide)";

  return `Tu vas lire une conversation (échange de mails, messages Slack, brief oral retranscrit, etc.) et en extraire une liste de tickets à créer dans notre outil de gestion de tickets.

Réponds UNIQUEMENT avec un tableau JSON valide, sans texte avant ni après, sans balises markdown \`\`\`. Chaque élément du tableau doit respecter exactement ce format :

{
  "titre": "string, court et actionnable, requis",
  "description": "string ou omis, détails utiles s'il y en a",
  "projet": "${projetNom}",
  "client_email": "${clientEmail}",
  "priorite": "une valeur parmi : ${TICKET_PRIORITES.join(", ")} (déduis-la du ton/urgence du message, par défaut \\"normale\\")",
  "statut": "ouvert",
  "date_prevue": "AAAA-MM-JJ si une échéance est mentionnée explicitement, sinon omis",
  "tags": ["un ou plusieurs tags parmi cette liste existante, uniquement si pertinent : ${tagsListe}"]
}

Règles :
- "projet" et "client_email" sont fixes, recopie-les tels quels sur chaque ticket.
- Un vrai sujet distinct = un ticket. Ne fusionne pas deux demandes différentes dans un seul ticket, et n'éclate pas une seule demande en plusieurs.
- N'invente aucun tag qui ne serait pas dans la liste fournie.
- Si la conversation ne contient aucune demande exploitable, réponds avec un tableau vide [].

Voici la conversation à traiter :

"""
(colle ici la conversation)
"""`;
}

/**
 * Objectif du ticket "Améliorer import/export" (sprint 10) : un clic pour
 * copier un prompt prêt à coller dans une IA, qui ressort direct un JSON
 * compatible avec le wizard d'import plus bas (mêmes clés que
 * LigneImportBrute). Le client/projet sont figés dans le prompt plutôt que
 * laissés à deviner par l'IA : ce sont des identifiants exacts (nom de
 * projet, email) qu'elle ne peut pas connaître par elle-même.
 */
export function PrepromptGenerator({
  projets,
  clientsParProjet,
  tags,
}: {
  projets: ProjetOption[];
  clientsParProjet: Record<string, ClientOption[]>;
  tags: Tag[];
}) {
  const [projetId, setProjetId] = useState("");
  const [clientId, setClientId] = useState("");

  const clientsDisponibles = useMemo(
    () => (projetId ? clientsParProjet[projetId] ?? [] : []),
    [projetId, clientsParProjet]
  );

  function handleProjetChange(value: string) {
    setProjetId(value);
    setClientId("");
  }

  const projetNom = projets.find((p) => p.id === projetId)?.nom ?? null;
  const client = clientsDisponibles.find((c) => c.id === clientId) ?? null;
  const clientEmail = client?.email ?? null;

  async function copierPrompt() {
    if (!projetNom || !clientEmail) return;
    const prompt = construirePrompt({
      projetNom,
      clientEmail,
      tags: tagsVisiblesPourProjet(tags, projetId),
    });
    await navigator.clipboard.writeText(prompt);
    toast.success("Prompt copié — colle-le dans ta conversation IA.");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>0. Générer un prompt pour l&apos;IA</CardTitle>
        <CardDescription>
          Choisis le projet et le client concernés, copie le prompt, colle-le dans ta
          conversation avec l&apos;IA (Claude, ChatGPT...) juste avant ou après le brief à
          traiter. Elle te renverra un JSON prêt à importer ci-dessous.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-3">
          <Select value={projetId} onValueChange={handleProjetChange}>
            <SelectTrigger size="sm" className="w-[220px]">
              <SelectValue placeholder="Projet" />
            </SelectTrigger>
            <SelectContent>
              {projets.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={clientId} onValueChange={setClientId} disabled={!projetId}>
            <SelectTrigger size="sm" className="w-[240px]">
              <SelectValue placeholder="Client" />
            </SelectTrigger>
            <SelectContent>
              {clientsDisponibles.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.full_name || c.email || c.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={copierPrompt}
            disabled={!projetNom || !clientEmail}
            className="gap-1.5"
          >
            <Copy className="size-3.5" />
            Copier le prompt
          </Button>
        </div>
        {(!projetId || !clientId) && (
          <p className="text-xs text-muted-foreground">
            Choisis un projet puis un client pour activer la copie — ils sont figés en dur
            dans le prompt, l&apos;IA ne peut pas les deviner à ta place.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
