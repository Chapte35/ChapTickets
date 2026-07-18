"use client";

import { Label, Pie, PieChart } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { TICKET_STATUTS, TICKET_STATUT_LABELS, TICKET_STATUT_CHART_COLOR, type TicketStatut } from "@/lib/types";

// Structure identique à l'exemple officiel : une clé "globale" (sans
// couleur, juste un label pour le centre du donut), puis une clé par
// catégorie avec sa couleur — pas de structure "à moi" en plus.
const chartConfig = {
  valeur: {
    label: "Tickets",
  },
  ouvert: {
    label: TICKET_STATUT_LABELS.ouvert,
    color: TICKET_STATUT_CHART_COLOR.ouvert,
  },
  en_cours: {
    label: TICKET_STATUT_LABELS.en_cours,
    color: TICKET_STATUT_CHART_COLOR.en_cours,
  },
  en_attente_client: {
    label: TICKET_STATUT_LABELS.en_attente_client,
    color: TICKET_STATUT_CHART_COLOR.en_attente_client,
  },
  resolu: {
    label: TICKET_STATUT_LABELS.resolu,
    color: TICKET_STATUT_CHART_COLOR.resolu,
  },
  ferme: {
    label: TICKET_STATUT_LABELS.ferme,
    color: TICKET_STATUT_CHART_COLOR.ferme,
  },
} satisfies ChartConfig;

export function TicketStatusDonut({
  repartition,
}: {
  repartition: Record<TicketStatut, number>;
}) {
  const chartData = TICKET_STATUTS.filter((s) => repartition[s] > 0).map((s) => ({
    statut: s,
    valeur: repartition[s],
    fill: `var(--color-${s})`,
  }));

  const total = chartData.reduce((acc, curr) => acc + curr.valeur, 0);

  if (total === 0) {
    return (
      <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
        Aucun ticket
      </div>
    );
  }

  return (
    <ChartContainer
      config={chartConfig}
      className="mx-auto aspect-square max-h-[250px]"
    >
      <PieChart>
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel />}
        />
        <Pie
          data={chartData}
          dataKey="valeur"
          nameKey="statut"
          innerRadius={60}
          strokeWidth={5}
        >
          <Label
            content={({ viewBox }) => {
              if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                return (
                  <text
                    x={viewBox.cx}
                    y={viewBox.cy}
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    <tspan
                      x={viewBox.cx}
                      y={viewBox.cy}
                      className="fill-foreground text-3xl font-bold"
                    >
                      {total.toLocaleString()}
                    </tspan>
                    <tspan
                      x={viewBox.cx}
                      y={(viewBox.cy || 0) + 24}
                      className="fill-muted-foreground"
                    >
                      Tickets
                    </tspan>
                  </text>
                );
              }
            }}
          />
        </Pie>
      </PieChart>
    </ChartContainer>
  );
}