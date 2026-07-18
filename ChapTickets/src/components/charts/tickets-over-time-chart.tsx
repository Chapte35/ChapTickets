"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

export type PointTemporel = { date: string; nombre: number };

const chartConfig = {
  nombre: {
    label: "Tickets créés",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function TicketsOverTimeChart({ data }: { data: PointTemporel[] }) {
  if (data.every((d) => d.nombre === 0)) {
    return (
      <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
        Aucun ticket sur cette période
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
      <AreaChart data={data} margin={{ left: 0, right: 10, top: 10 }}>
        <defs>
          <linearGradient id="fillNombre" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-nombre)" stopOpacity={0.8} />
            <stop offset="95%" stopColor="var(--color-nombre)" stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={28} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
        <Area
          dataKey="nombre"
          type="natural"
          fill="url(#fillNombre)"
          stroke="var(--color-nombre)"
        />
      </AreaChart>
    </ChartContainer>
  );
}
