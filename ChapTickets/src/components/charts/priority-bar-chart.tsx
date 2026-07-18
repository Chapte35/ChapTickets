"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { TICKET_PRIORITES, TICKET_PRIORITE_LABELS, type TicketPriorite } from "@/lib/types";

const COULEURS: Record<TicketPriorite, string> = {
  basse: "var(--chart-3)",
  normale: "var(--chart-2)",
  haute: "var(--chart-4)",
  urgente: "var(--destructive)",
};

const chartConfig = {
  valeur: { label: "Tickets" },
  ...Object.fromEntries(
    TICKET_PRIORITES.map((p) => [p, { label: TICKET_PRIORITE_LABELS[p], color: COULEURS[p] }])
  ),
} satisfies ChartConfig;

export function PriorityBarChart({
  repartition,
}: {
  repartition: Record<TicketPriorite, number>;
}) {
  const data = TICKET_PRIORITES.map((p) => ({
    priorite: p,
    valeur: repartition[p] ?? 0,
    fill: `var(--color-${p})`,
  }));

  const total = data.reduce((sum, d) => sum + d.valeur, 0);
  if (total === 0) {
    return (
      <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
        Aucun ticket
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
      <BarChart data={data} margin={{ left: 0, right: 10, top: 10 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="priorite"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(value: TicketPriorite) => TICKET_PRIORITE_LABELS[value]}
        />
        <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={28} />
        <ChartTooltip
          cursor={{ fill: "var(--muted)" }}
          content={<ChartTooltipContent nameKey="priorite" hideLabel />}
        />
        <Bar dataKey="valeur" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}
