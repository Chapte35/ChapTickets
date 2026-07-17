"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TICKET_STATUTS, TICKET_STATUT_LABELS, type TicketStatut } from "@/lib/types";
import { ChartTooltip, type SimpleTooltipProps } from "./chart-tooltip";

const COULEURS: Record<TicketStatut, string> = {
  ouvert: "var(--chart-1)",
  en_cours: "var(--chart-4)",
  en_attente_client: "var(--chart-5)",
  resolu: "var(--chart-2)",
  ferme: "var(--chart-3)",
};

export function TicketStatusDonut({
  repartition,
}: {
  repartition: Record<TicketStatut, number>;
}) {
  const data = TICKET_STATUTS.filter((s) => repartition[s] > 0).map((s) => ({
    statut: s,
    nom: TICKET_STATUT_LABELS[s],
    valeur: repartition[s],
  }));

  const total = data.reduce((sum, d) => sum + d.valeur, 0);

  if (total === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
        Aucun ticket
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          dataKey="valeur"
          nameKey="nom"
          innerRadius={55}
          outerRadius={80}
          paddingAngle={2}
        >
          {data.map((d) => (
            <Cell key={d.statut} fill={COULEURS[d.statut]} />
          ))}
        </Pie>
        <Tooltip content={(props) => <ChartTooltip {...(props as SimpleTooltipProps)} />} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
