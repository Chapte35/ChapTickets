"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProjetOption } from "@/lib/queries/tickets";
import { DayActionsDialog, type TicketAssignable } from "./day-actions-dialog";

export type CalendrierEvenement = {
  date: string; // "YYYY-MM-DD"
  type: "ticket" | "release" | "statut";
  id: string;
  label: string;
  href: string;
};

type FormState = { error: string | null };

/** Présent uniquement côté admin : rend chaque case cliquable pour créer une release ou assigner un ticket. */
export type CalendrierInteractif = {
  projets: ProjetOption[];
  projetFiltre?: string;
  ticketsAssignables: TicketAssignable[];
  createReleaseAction: (prevState: FormState, formData: FormData) => Promise<FormState>;
  assignDateAction: (prevState: FormState, formData: FormData) => Promise<FormState>;
};

const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function getMonthGrid(year: number, month: number) {
  // month : 1-12
  const firstOfMonth = new Date(year, month - 1, 1);
  const startWeekday = (firstOfMonth.getDay() + 6) % 7; // Lundi = 0
  const daysInMonth = new Date(year, month, 0).getDate();
  const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7;

  const cells: { date: Date; inMonth: boolean }[] = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startWeekday + 1;
    const date = new Date(year, month - 1, dayNum);
    cells.push({ date, inMonth: dayNum >= 1 && dayNum <= daysInMonth });
  }
  return cells;
}

function moisPrecedent(year: number, month: number) {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}
function moisSuivant(year: number, month: number) {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

export function MonthCalendar({
  year,
  month,
  events,
  basePath,
  extraParams = "",
  interactif,
}: {
  year: number;
  month: number;
  events: CalendrierEvenement[];
  /** Chemin de la page (pour les liens de navigation mois précédent/suivant). */
  basePath: string;
  /** Query params additionnels à préserver dans les liens de navigation (ex: "&projet=xxx"). */
  extraParams?: string;
  interactif?: CalendrierInteractif;
}) {
  const [jourOuvert, setJourOuvert] = useState<string | null>(null);

  const cells = getMonthGrid(year, month);
  const eventsParJour = new Map<string, CalendrierEvenement[]>();
  for (const e of events) {
    const liste = eventsParJour.get(e.date) ?? [];
    liste.push(e);
    eventsParJour.set(e.date, liste);
  }

  const prev = moisPrecedent(year, month);
  const next = moisSuivant(year, month);
  const aujourdHui = toISODate(new Date());

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Link
          href={`${basePath}?year=${prev.year}&month=${prev.month}${extraParams}`}
          className="text-sm text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-accent"
        >
          ← Précédent
        </Link>
        <h2 className="text-sm font-semibold">
          {MOIS[month - 1]} {year}
        </h2>
        <Link
          href={`${basePath}?year=${next.year}&month=${next.month}${extraParams}`}
          className="text-sm text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-accent"
        >
          Suivant →
        </Link>
      </div>

      <div className="grid grid-cols-7 gap-px rounded-lg border bg-border overflow-hidden">
        {JOURS.map((j) => (
          <div key={j} className="bg-muted px-2 py-1.5 text-center text-xs font-medium text-muted-foreground">
            {j}
          </div>
        ))}
        {cells.map(({ date, inMonth }) => {
          const iso = toISODate(date);
          const evenementsJour = eventsParJour.get(iso) ?? [];
          const estAujourdHui = iso === aujourdHui;
          return (
            <div
              key={iso}
              className={cn(
                "group relative bg-background min-h-[90px] p-1.5 flex flex-col gap-1",
                !inMonth && "bg-muted/30"
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "text-xs w-fit px-1 rounded-full",
                    !inMonth && "text-muted-foreground/50",
                    estAujourdHui && "bg-primary text-primary-foreground font-medium px-1.5"
                  )}
                >
                  {date.getDate()}
                </span>
                {interactif && (
                  <button
                    type="button"
                    onClick={() => setJourOuvert(iso)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-accent"
                    aria-label="Ajouter une release ou assigner un ticket ce jour"
                  >
                    <Plus className="size-3" />
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-0.5">
                {evenementsJour.slice(0, 3).map((e) => (
                  <Link
                    key={`${e.type}-${e.id}`}
                    href={e.href}
                    className={cn(
                      "truncate rounded px-1 py-0.5 text-[10px] font-medium leading-tight hover:opacity-80",
                      e.type === "release" && "bg-chart-4/20 text-chart-4",
                      e.type === "ticket" && "bg-primary/10 text-primary",
                      e.type === "statut" && "bg-chart-2/20 text-chart-2"
                    )}
                    title={e.label}
                  >
                    {e.type === "release" ? "🚀 " : e.type === "statut" ? "↻ " : ""}
                    {e.label}
                  </Link>
                ))}
                {evenementsJour.length > 3 && (
                  <span className="text-[10px] text-muted-foreground px-1">
                    +{evenementsJour.length - 3} autre{evenementsJour.length - 3 > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {interactif && jourOuvert && (
        <DayActionsDialog
          open={jourOuvert !== null}
          onOpenChange={(open) => !open && setJourOuvert(null)}
          dateIso={jourOuvert}
          dateLabel={new Date(`${jourOuvert}T00:00:00`).toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
          projets={interactif.projets}
          projetFiltre={interactif.projetFiltre}
          ticketsAssignables={interactif.ticketsAssignables}
          createReleaseAction={interactif.createReleaseAction}
          assignDateAction={interactif.assignDateAction}
        />
      )}
    </div>
  );
}
