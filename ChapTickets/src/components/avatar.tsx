import { cn } from "@/lib/utils";

/**
 * Palette avatar style GitHub — tons sourds, bien contrastés en dark/light.
 * Fond légèrement teinté + texte coloré (pas de fond plein criard).
 * Chaque couleur a : bg (fond), text (texte), ring (bordure outline).
 */
export const AVATAR_COULEURS = [
  "slate",
  "red",
  "orange",
  "amber",
  "green",
  "teal",
  "cyan",
  "blue",
  "violet",
  "pink",
] as const;

export type AvatarCouleur = (typeof AVATAR_COULEURS)[number];

// Classes Tailwind littérales — JIT exige les noms complets dans le source.
export const AVATAR_COULEUR_CLASSES: Record<AvatarCouleur, string> = {
  slate:  "bg-slate-100  text-slate-700  ring-slate-400  dark:bg-slate-800  dark:text-slate-300  dark:ring-slate-500",
  red:    "bg-red-100    text-red-700    ring-red-400    dark:bg-red-900/40  dark:text-red-300    dark:ring-red-500",
  orange: "bg-orange-100 text-orange-700 ring-orange-400 dark:bg-orange-900/40 dark:text-orange-300 dark:ring-orange-500",
  amber:  "bg-amber-100  text-amber-700  ring-amber-400  dark:bg-amber-900/40  dark:text-amber-300  dark:ring-amber-500",
  green:  "bg-green-100  text-green-700  ring-green-400  dark:bg-green-900/40  dark:text-green-300  dark:ring-green-500",
  teal:   "bg-teal-100   text-teal-700   ring-teal-400   dark:bg-teal-900/40   dark:text-teal-300   dark:ring-teal-500",
  cyan:   "bg-cyan-100   text-cyan-700   ring-cyan-400   dark:bg-cyan-900/40   dark:text-cyan-300   dark:ring-cyan-500",
  blue:   "bg-blue-100   text-blue-700   ring-blue-400   dark:bg-blue-900/40   dark:text-blue-300   dark:ring-blue-500",
  violet: "bg-violet-100 text-violet-700 ring-violet-400 dark:bg-violet-900/40 dark:text-violet-300 dark:ring-violet-500",
  pink:   "bg-pink-100   text-pink-700   ring-pink-400   dark:bg-pink-900/40   dark:text-pink-300   dark:ring-pink-500",
};

function hashToIndex(str: string, mod: number) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(hash) % mod;
}

function initialesDepuisNom(nom: string): string {
  const mots = nom.trim().split(/\s+/);
  if (mots.length === 1) return mots[0].slice(0, 2).toUpperCase();
  return (mots[0][0] + mots[mots.length - 1][0]).toUpperCase();
}

export function Avatar({
  nom,
  size = "sm",
  className,
  couleur,
  initiales,
}: {
  nom: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Couleur choisie dans le profil. Si absente : générée par hash du nom. */
  couleur?: AvatarCouleur | null;
  /** Initiales choisies dans le profil. Si absentes : calculées depuis le nom. */
  initiales?: string | null;
}) {
  const couleurResolue: AvatarCouleur = couleur
    ?? AVATAR_COULEURS[hashToIndex(nom, AVATAR_COULEURS.length)];

  const classes = AVATAR_COULEUR_CLASSES[couleurResolue];
  const texte = initiales?.trim().toUpperCase().slice(0, 3) || initialesDepuisNom(nom);

  return (
    <span
      title={nom}
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold shrink-0 ring-1",
        classes,
        size === "sm"  ? "size-6 text-[10px]" :
        size === "md"  ? "size-8 text-xs" :
                         "size-10 text-sm",
        className
      )}
    >
      {texte}
    </span>
  );
}
