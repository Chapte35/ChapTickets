"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from "recharts";
import { TICKET_PRIORITES, TICKET_PRIORITE_LABELS, type TicketPriorite } from "@/lib/types";
import { ChartTooltip, type SimpleTooltipProps } from "./chart-tooltip";

const COULEURS: Record<TicketPriorite, string> = {
  basse: "var(--chart-3)",
  normale: "var(--chart-2)",
  haute: "var(--chart-4)",
  urgente: "var(--destructive)",
};

export function PriorityBarChart({
  repartition,
}: {
  repartition: Record<TicketPriorite, number>;
}) {
  const data = TICKET_PRIORITES.map((p) => ({
    priorite: p,
    nom: TICKET_PRIORITE_LABELS[p],
    valeur: repartition[p] ?? 0,
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
      <BarChart data={data} margin={{ right: 10, top: 10 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
        <XAxis dataKey="nom" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
          width={30}
        />
        <Tooltip
          content={(props) => <ChartTooltip {...(props as SimpleTooltipProps)} />}
          cursor={{ fill: "var(--muted)" }}
        />
        <Bar dataKey="valeur" name="Tickets" radius={[4, 4, 0, 0]}>
          {data.map((d) => (
            <Cell key={d.priorite} fill={COULEURS[d.priorite]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
