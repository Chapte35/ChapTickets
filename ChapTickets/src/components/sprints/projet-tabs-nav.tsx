"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Barre d'onglets pour naviguer entre les sous-pages d'un projet admin.
 * Monté dans chaque page enfant (édition, overview, sprints) — pas dans un
 * layout, pour rester cohérent avec l'architecture existante du projet
 * (pas de layout [id] avant ce sprint, sidebar gère la nav top-level).
 */
export function ProjetTabsNav({ projetId }: { projetId: string }) {
  const pathname = usePathname();

  const onglets = [
    { href: `/admin/projets/${projetId}`, label: "Édition" },
    { href: `/admin/projets/${projetId}/overview`, label: "Overview" },
    { href: `/admin/projets/${projetId}/sprints`, label: "Sprints" },
  ];

  return (
    <nav className="flex gap-1 border-b">
      {onglets.map((o) => {
        const actif = pathname === o.href;
        return (
          <Link
            key={o.href}
            href={o.href}
            className={cn(
              "px-3 py-1.5 text-sm border-b-2 -mb-px transition-colors",
              actif
                ? "border-foreground text-foreground font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground"
            )}
          >
            {o.label}
          </Link>
        );
      })}
    </nav>
  );
}
