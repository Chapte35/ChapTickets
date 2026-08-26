"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AVATAR_COULEURS, AVATAR_COULEUR_CLASSES, type AvatarCouleur } from "@/components/avatar";
import { cn } from "@/lib/utils";
import { useToastOnSuccess } from "@/hooks/use-toast-on-success";
import { updateProfilPerso, type FormState } from "@/lib/actions/profil";

const initialState: FormState = { error: null };

const COULEUR_LABELS: Record<AvatarCouleur, string> = {
  slate:  "Ardoise",
  red:    "Rouge",
  orange: "Orange",
  amber:  "Ambre",
  green:  "Vert",
  teal:   "Sarcelle",
  cyan:   "Cyan",
  blue:   "Bleu",
  violet: "Violet",
  pink:   "Rose",
};

export function ProfilForm({
  nomAffiche,
  pseudoActuel,
  couleurActuelle,
  initialesActuelles,
  email,
}: {
  nomAffiche: string;
  pseudoActuel: string | null;
  couleurActuelle: AvatarCouleur | null;
  initialesActuelles: string | null;
  email: string | null;
}) {
  const [state, formAction, isPending] = useActionState(updateProfilPerso, initialState);
  useToastOnSuccess(isPending, state.error, "Profil mis à jour.");

  const [pseudo, setPseudo] = useState(pseudoActuel ?? "");
  const [couleur, setCouleur] = useState<AvatarCouleur | null>(couleurActuelle);
  const [initiales, setInitiales] = useState(initialesActuelles ?? "");

  const nomPourApercu = pseudo.trim() || nomAffiche;

  return (
    <form action={formAction} className="grid gap-8 lg:grid-cols-[1fr_220px] items-start">
      <div className="flex flex-col gap-6 min-w-0">

        {/* Email — lecture seule */}
        {email && (
          <div className="flex flex-col gap-1.5">
            <Label className="text-muted-foreground text-xs">Email</Label>
            <p className="text-sm">{email}</p>
          </div>
        )}

        {/* Pseudo */}
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
            Affiché dans les messages et l&apos;interface à la place de ton email.
          </p>
        </div>

        {/* Initiales */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="initiales">Initiales <span className="text-muted-foreground font-normal">(2-3 caractères)</span></Label>
          <Input
            id="initiales"
            name="initiales"
            placeholder="Ex : PL, JD, CM"
            value={initiales}
            onChange={(e) => setInitiales(e.target.value.toUpperCase().slice(0, 3))}
            maxLength={3}
            className="w-24 font-mono uppercase"
          />
          <p className="text-xs text-muted-foreground">
            Affichées dans ton avatar. Calculées automatiquement depuis ton pseudo si vide.
          </p>
        </div>

        {/* Couleur avatar */}
        <div className="flex flex-col gap-2">
          <Label>Couleur de l&apos;avatar</Label>
          <input type="hidden" name="avatar_couleur" value={couleur ?? ""} />
          <div className="flex flex-wrap gap-2">
            {AVATAR_COULEURS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCouleur(c)}
                title={COULEUR_LABELS[c]}
                aria-label={COULEUR_LABELS[c]}
                className={cn(
                  "size-7 rounded-full ring-2 ring-offset-2 ring-offset-background transition-all",
                  // Couleur de preview : fond de la classe
                  c === "slate"  ? "bg-slate-400"  :
                  c === "red"    ? "bg-red-400"    :
                  c === "orange" ? "bg-orange-400" :
                  c === "amber"  ? "bg-amber-400"  :
                  c === "green"  ? "bg-green-400"  :
                  c === "teal"   ? "bg-teal-400"   :
                  c === "cyan"   ? "bg-cyan-400"   :
                  c === "blue"   ? "bg-blue-400"   :
                  c === "violet" ? "bg-violet-400" :
                                   "bg-pink-400",
                  couleur === c
                    ? "ring-foreground scale-110"
                    : "ring-transparent opacity-60 hover:opacity-100"
                )}
              />
            ))}
            {couleur && (
              <button
                type="button"
                onClick={() => setCouleur(null)}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground border rounded-full"
              >
                Réinitialiser
              </button>
            )}
          </div>
        </div>

        <Button type="submit" disabled={isPending} className="w-fit">
          {isPending ? "Enregistrement..." : "Enregistrer"}
        </Button>

        {state.error && (
          <p role="alert" className="text-sm text-destructive">{state.error}</p>
        )}
      </div>

      {/* Aperçu */}
      <div className="flex flex-col items-center gap-4 rounded-xl border bg-card p-6 sticky top-6">
        <span className="text-xs text-muted-foreground uppercase tracking-wide">Aperçu</span>
        <Avatar
          nom={nomPourApercu}
          size="lg"
          couleur={couleur}
          initiales={initiales || null}
        />
        <div className="text-center">
          <p className="text-sm font-semibold">{nomPourApercu}</p>
          {email && <p className="text-xs text-muted-foreground">{email}</p>}
        </div>
      </div>
    </form>
  );
}
