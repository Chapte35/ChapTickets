import { cn } from "@/lib/utils";

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
}: {
  nom: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const couleur = PALETTE[hashToIndex(nom, PALETTE.length)];
  return (
    <span
      title={nom}
      className={cn(
        "inline-flex items-center justify-center rounded-full font-medium text-white shrink-0",
        couleur,
        size === "sm" ? "size-6 text-[10px]" : "size-8 text-xs",
        className
      )}
    >
      {initiales(nom)}
    </span>
  );
}
