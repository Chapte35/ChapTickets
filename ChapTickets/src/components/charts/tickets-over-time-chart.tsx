"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ChartTooltip, type SimpleTooltipProps } from "./chart-tooltip";

export type PointTemporel = { date: string; nombre: number };

export function TicketsOverTimeChart({ data }: { data: PointTemporel[] }) {
  if (data.every((d) => d.nombre === 0)) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
        Aucun ticket sur cette période
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{  right: 10, top: 10 }}>
        <defs>
          <linearGradient id="ticketsGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.4} />
            <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
          width={30}
        />
        <Tooltip content={(props) => <ChartTooltip {...(props as SimpleTooltipProps)} />} />
        <Area
          type="monotone"
          dataKey="nombre"
          name="Tickets créés"
          stroke="var(--chart-1)"
          fill="url(#ticketsGradient)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
