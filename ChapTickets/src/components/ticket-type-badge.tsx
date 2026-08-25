"use client";

import {
  Layers,
  Sparkles,
  Wrench,
  Bug,
  BookOpen,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TICKET_TYPE_LABELS, type TicketType } from "@/lib/types";

const ICONS: Record<TicketType, LucideIcon> = {
  epic: Layers,
  feature_fonctionnelle: Sparkles,
  feature_technique: Wrench,
  bug: Bug,
  etude: BookOpen,
};

const COLORS: Record<TicketType, string> = {
  epic: "text-purple-600 dark:text-purple-400",
  feature_fonctionnelle: "text-blue-600 dark:text-blue-400",
  feature_technique: "text-cyan-600 dark:text-cyan-400",
  bug: "text-red-600 dark:text-red-400",
  etude: "text-amber-600 dark:text-amber-400",
};

/**
 * Affiche l'icône + le label du type d'un ticket.
 * variant="icon" → icône seule (dans les listes pour gagner de la place)
 * variant="full" → icône + label (dans la fiche)
 */
export function TicketTypeBadge({
  type,
  variant = "icon",
  className,
}: {
  type: TicketType;
  variant?: "icon" | "full";
  className?: string;
}) {
  const Icon = ICONS[type];
  const color = COLORS[type];
  const label = TICKET_TYPE_LABELS[type];

  if (variant === "icon") {
    return (
      <span title={label} className={cn("inline-flex items-center", color, className)}>
        <Icon className="size-3.5" />
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm", color, className)}>
      <Icon className="size-3.5" />
      {label}
    </span>
  );
}
