"use client";

import { useState, useTransition } from "react";
import { Cell, Label, Pie, PieChart } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ResolutionParProjet, PeriodeStats } from "@/lib/queries/stats-resolution";
import { PERIODE_LABELS } from "@/lib/queries/stats-resolution";

// Palette pour les segments du donut — une couleur par projet, cycle fixe.
// Tailwind ne peut pas générer ces classes dynamiquement, on passe par des
// variables CSS chart-* déjà définies dans globals.css par shadcn.
const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function buildChartConfig(projets: ResolutionParProjet[]): ChartConfig {
  const config: ChartConfig = {
    resolus: { label: "Résolus" },
  };
  projets.forEach((p, i) => {
    config[p.projetId] = {
      label: p.projetNom,
      color: CHART_COLORS[i % CHART_COLORS.length],
    };
  });
  return config;
}

type ProjetOption = { id: string; nom: string };

/**
 * Donut chart — proportion de tickets résolus par projet.
 * Filtrable par projet et par période (jour / semaine / mois).
 * Les données initiales sont passées SSR ; le filtre re-fetche côté client.
 */
export function ChartResolutionProjets({
  donneesInitiales,
  projets,
  periodeInitiale,
  projetInitial,
}: {
  donneesInitiales: ResolutionParProjet[];
  projets: ProjetOption[];
  periodeInitiale: PeriodeStats;
  projetInitial?: string;
}) {
  const [donnees, setDonnees] = useState(donneesInitiales);
  const [periode, setPeriode] = useState<PeriodeStats>(periodeInitiale);
  const [projetFiltre, setProjetFiltre] = useState<string>(projetInitial ?? "__tous__");
  const [isPending, startTransition] = useTransition();

  async function rafraichir(newPeriode: PeriodeStats, newProjet: string) {
    startTransition(async () => {
      const params = new URLSearchParams({ periode: newPeriode });
      if (newProjet !== "__tous__") params.set("projet", newProjet);
      const res = await fetch(`/api/stats/resolution?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setDonnees(json);
      }
    });
  }

  function handlePeriode(v: string) {
    const p = v as PeriodeStats;
    setPeriode(p);
    rafraichir(p, projetFiltre);
  }

  function handleProjet(v: string) {
    setProjetFiltre(v);
    rafraichir(periode, v);
  }

  const chartData = donnees.map((d, i) => ({
    projetId: d.projetId,
    projetNom: d.projetNom,
    resolus: d.resolus,
    total: d.total,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const totalResolus = donnees.reduce((s, d) => s + d.resolus, 0);
  const totalTickets = donnees.reduce((s, d) => s + d.total, 0);
  const chartConfig = buildChartConfig(donnees);

  return (
    <div className="flex flex-col gap-3">
      {/* Filtres */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={periode} onValueChange={handlePeriode}>
          <SelectTrigger size="sm" className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(PERIODE_LABELS) as PeriodeStats[]).map((p) => (
              <SelectItem key={p} value={p}>
                {PERIODE_LABELS[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={projetFiltre} onValueChange={handleProjet}>
          <SelectTrigger size="sm" className="w-[160px]">
            <SelectValue placeholder="Tous les projets" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__tous__">Tous les projets</SelectItem>
            {projets.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.nom}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {totalTickets === 0 ? (
        <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
          Aucun ticket sur cette période
        </div>
      ) : (
        <ChartContainer
          config={chartConfig}
          className={`mx-auto aspect-square max-h-[220px] transition-opacity ${isPending ? "opacity-50" : ""}`}
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  hideLabel
                  formatter={(value, name, item) => {
                    const d = donnees.find((x) => x.projetId === item.payload.projetId);
                    if (!d) return null;
                    return (
                      <span>
                        {d.projetNom} — {d.resolus}/{d.total} résolus (
                        {Math.round(d.taux * 100)}%)
                      </span>
                    );
                  }}
                />
              }
            />
            <Pie
              data={chartData}
              dataKey="resolus"
              nameKey="projetId"
              innerRadius={55}
              strokeWidth={4}
            >
              {chartData.map((entry, index) => (
                <Cell key={entry.projetId} fill={entry.fill} />
              ))}
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
                          className="fill-foreground text-2xl font-bold"
                        >
                          {totalTickets > 0
                            ? `${Math.round((totalResolus / totalTickets) * 100)}%`
                            : "—"}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 20}
                          className="fill-muted-foreground text-xs"
                        >
                          résolus
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      )}

      {/* Légende manuelle pour nommer les projets */}
      {donnees.length > 0 && (
        <ul className="flex flex-col gap-1">
          {donnees.map((d, i) => (
            <li key={d.projetId} className="flex items-center justify-between text-xs gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="size-2.5 rounded-full shrink-0"
                  style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                />
                <span className="text-muted-foreground truncate">{d.projetNom}</span>
              </div>
              <span className="tabular-nums shrink-0">
                {d.resolus}/{d.total}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
