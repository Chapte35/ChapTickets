import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function KpiCard({
  label,
  valeur,
  sousTexte,
  badge,
  accent,
}: {
  label: string;
  valeur: string | number;
  /** Ligne de contexte dans le footer (ex: "Sur les 14 derniers jours"). */
  sousTexte?: string;
  /** Badge optionnel dans le coin (ex: icône + tendance) — affiché tel quel, pas de calcul automatique. */
  badge?: ReactNode;
  /** Met la valeur en rouge (ex: métrique d'alerte comme "urgents non résolus"). */
  accent?: boolean;
}) {
  return (
    <Card className="@container/card bg-gradient-to-t from-primary/5 to-card shadow-xs dark:bg-card">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle
          className={cn(
            "text-2xl font-semibold tabular-nums @[200px]/card:text-3xl",
            accent && "text-destructive"
          )}
        >
          {valeur}
        </CardTitle>
        {badge && <CardAction>{badge}</CardAction>}
      </CardHeader>
      {sousTexte && (
        <CardFooter>
          <div className="text-muted-foreground">{sousTexte}</div>
        </CardFooter>
      )}
    </Card>
  );
}
