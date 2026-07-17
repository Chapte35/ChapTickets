import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  valeur,
  sousTexte,
  accent,
}: {
  label: string;
  valeur: string | number;
  sousTexte?: string;
  /** Met la valeur en évidence (ex: métrique d'alerte comme "urgents non résolus"). */
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border bg-card p-4">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("text-2xl font-semibold tabular-nums", accent && "text-destructive")}>
        {valeur}
      </span>
      {sousTexte && <span className="text-xs text-muted-foreground">{sousTexte}</span>}
    </div>
  );
}
