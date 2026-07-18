"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type ConversationItem = {
  href: string;
  title: string;
  preview: string;
};

export type ConversationGroup = {
  label: string;
  items: ConversationItem[];
  emptyLabel: string;
};

/**
 * Colonne de gauche façon Instagram/Messenger : liste des conversations,
 * l'item actif est surligné via usePathname (client component nécessaire
 * pour ça — le layout serveur qui l'englobe se contente de préparer les
 * données et de passer les groupes déjà formés).
 */
export function ConversationSidebar({ groups }: { groups: ConversationGroup[] }) {
  const pathname = usePathname();

  return (
    <aside className="w-full lg:w-80 shrink-0 max-h-[40vh] lg:max-h-none lg:h-full border-b lg:border-b-0 lg:border-r overflow-y-auto flex flex-col">
      {groups.map((group) => (
        <div key={group.label} className="flex flex-col">
          <h2 className="px-4 pt-4 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {group.label}
          </h2>
          {group.items.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-muted-foreground">{group.emptyLabel}</p>
          ) : (
            <ul className="flex flex-col">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex flex-col gap-0.5 px-4 py-3 border-b transition-colors",
                        isActive ? "bg-accent" : "hover:bg-accent/50"
                      )}
                    >
                      <span className="text-sm font-medium truncate">{item.title}</span>
                      <span className="text-xs text-muted-foreground truncate">
                        {item.preview}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ))}
    </aside>
  );
}
