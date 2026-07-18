"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar } from "@/components/avatar";
import { cn } from "@/lib/utils";
import { TAG_COLORS, AVATAR_EMOJIS, type TagColor } from "@/lib/types";
import { useToastOnSuccess } from "@/hooks/use-toast-on-success";
import { updateProfilPerso, type FormState } from "@/lib/actions/profil";

const COULEUR_SWATCH: Record<TagColor, string> = {
  red: "bg-red-500",
  orange: "bg-orange-500",
  amber: "bg-amber-500",
  green: "bg-green-500",
  teal: "bg-teal-500",
  blue: "bg-blue-500",
  indigo: "bg-indigo-500",
  purple: "bg-purple-500",
  pink: "bg-pink-500",
  gray: "bg-gray-500",
};

const initialState: FormState = { error: null };

export function ProfilForm({
  nomAffiche,
  pseudoActuel,
  couleurActuelle,
  emojiActuel,
}: {
  /** full_name || email — utilisé pour l'aperçu et le hash de couleur par défaut si aucune n'est choisie. */
  nomAffiche: string;
  pseudoActuel: string | null;
  couleurActuelle: TagColor | null;
  emojiActuel: string | null;
}) {
  const [state, formAction, isPending] = useActionState(updateProfilPerso, initialState);
  useToastOnSuccess(isPending, state.error, "Profil mis à jour.");

  const [pseudo, setPseudo] = useState(pseudoActuel ?? "");
  const [couleur, setCouleur] = useState<TagColor | null>(couleurActuelle);
  const [emoji, setEmoji] = useState<string | null>(emojiActuel);

  const nomPourApercu = pseudo.trim() || nomAffiche;

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-[1fr_260px] items-start">
      <div className="flex flex-col gap-6 min-w-0">
        <div className="flex flex-col gap-2">
          <Label htmlFor="pseudo">Pseudo</Label>
          <Input
            id="pseudo"
            name="pseudo"
            placeholder={nomAffiche}
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value)}
            maxLength={40}
          />
          <p className="text-xs text-muted-foreground">
            Affiché à la place de ton nom/email si renseigné. Laisse vide pour garder{" "}
            {nomAffiche}.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label>Couleur de l&apos;avatar</Label>
          <input type="hidden" name="avatar_couleur" value={couleur ?? ""} />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCouleur(null)}
              className={cn(
                "flex items-center justify-center size-8 rounded-full border-2 text-[10px] text-muted-foreground",
                couleur === null ? "border-foreground" : "border-transparent bg-muted"
              )}
              title="Couleur par défaut (générée automatiquement)"
            >
              Déf.
            </button>
            {TAG_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCouleur(c)}
                className={cn(
                  "size-8 rounded-full border-2",
                  COULEUR_SWATCH[c],
                  couleur === c ? "border-foreground" : "border-transparent"
                )}
                title={c}
                aria-label={`Couleur ${c}`}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label>Emoji de l&apos;avatar</Label>
          <input type="hidden" name="avatar_emoji" value={emoji ?? ""} />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setEmoji(null)}
              className={cn(
                "flex items-center justify-center size-8 rounded-md border-2 text-[10px] text-muted-foreground",
                emoji === null ? "border-foreground" : "border-transparent bg-muted"
              )}
              title="Pas d'emoji (initiales)"
            >
              Aucun
            </button>
            {AVATAR_EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(e)}
                className={cn(
                  "flex items-center justify-center size-8 rounded-md border-2 text-base bg-muted",
                  emoji === e ? "border-foreground" : "border-transparent"
                )}
                aria-label={`Emoji ${e}`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        <Button type="submit" disabled={isPending} className="w-fit">
          {isPending ? "Enregistrement..." : "Enregistrer"}
        </Button>
        {state.error && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}
      </div>

      <div className="flex flex-col items-center gap-3 rounded-lg border bg-card p-6">
        <span className="text-xs text-muted-foreground">Aperçu</span>
        <Avatar nom={nomPourApercu} couleur={couleur} emoji={emoji} size="md" />
        <span className="text-sm font-medium text-center">{nomPourApercu}</span>
      </div>
    </form>
  );
}
