import { cn } from "@/lib/utils";
import type { TagColor } from "@/lib/types";

const PALETTE = [
  "bg-red-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-green-500",
  "bg-teal-500",
  "bg-blue-500",
  "bg-indigo-500",
  "bg-purple-500",
  "bg-pink-500",
];

// Couleurs "pleines" (bg-xxx-500) correspondant à chaque TagColor, pour
// l'avatar personnalisé — TAG_COLOR_CLASSES (dans lib/types) est pensé pour
// des badges (fond translucide + texte coloré), pas pour un rond plein
// avec des initiales blanches dessus, d'où cette map séparée mais sur la
// même liste de couleurs (garde la personnalisation d'avatar cohérente
// avec la palette de tags existante plutôt que d'en introduire une 2e).
const COULEUR_PLEINE: Record<TagColor, string> = {
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

function hashToIndex(str: string, mod: number) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(hash) % mod;
}

function initiales(nom: string) {
  const mots = nom.trim().split(/\s+/);
  if (mots.length === 1) return mots[0].slice(0, 2).toUpperCase();
  return (mots[0][0] + mots[mots.length - 1][0]).toUpperCase();
}

export function Avatar({
  nom,
  size = "sm",
  className,
  couleur,
  emoji,
}: {
  nom: string;
  size?: "sm" | "md";
  className?: string;
  /** Couleur choisie dans l'onglet profil — si absente, couleur générée par hash du nom (comportement historique, utilisé pour tout le monde sauf soi-même tant que les autres pages n'exposent pas encore ces champs). */
  couleur?: TagColor | null;
  /** Emoji choisi dans l'onglet profil — remplace les initiales si présent. */
  emoji?: string | null;
}) {
  const fond = couleur ? COULEUR_PLEINE[couleur] : PALETTE[hashToIndex(nom, PALETTE.length)];
  return (
    <span
      title={nom}
      className={cn(
        "inline-flex items-center justify-center rounded-full font-medium text-white shrink-0",
        fond,
        size === "sm" ? "size-6 text-[10px]" : "size-8 text-xs",
        className
      )}
    >
      {emoji || initiales(nom)}
    </span>
  );
}
