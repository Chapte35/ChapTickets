"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  LayoutDashboard,
  Ticket,
  Lightbulb,
  Users,
  Home,
  Kanban,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const COOKIE_NAME = "sidebar_collapsed";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 an

/**
 * Les icônes Lucide sont des composants (donc des fonctions). Un Server
 * Component (les layouts admin/dashboard) ne peut pas les passer en props
 * à un Client Component — React ne sait pas sérialiser une référence de
 * fonction à travers cette frontière (erreur "Functions cannot be passed
 * directly to Client Components"). D'où cette clé texte, résolue ici,
 * côté client, où l'import direct des icônes ne pose aucun problème.
 */
const ICONS = {
  dashboard: LayoutDashboard,
  tickets: Ticket,
  idees: Lightbulb,
  projets: Kanban,
  clients: Users,
  home: Home,
} satisfies Record<string, LucideIcon>;

export type SidebarIconName = keyof typeof ICONS;

export type SidebarItem = {
  href: string;
  label: string;
  icon: SidebarIconName;
};

/**
 * Lien de nav individuel. Enveloppé dans un Tooltip uniquement en mode
 * réduit (icône seule) — inutile et bruyant en mode étendu où le label est
 * déjà visible.
 */
function SidebarLink({
  item,
  collapsed,
  active,
}: {
  item: SidebarItem;
  collapsed: boolean;
  active: boolean;
}) {
  const Icon = ICONS[item.icon];
  const link = (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
        active
          ? "bg-accent text-accent-foreground font-medium"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
        collapsed && "justify-center px-0"
      )}
    >
      <Icon className="size-4 shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

export function AppSidebar({
  title,
  items,
  defaultCollapsed,
  logoutAction,
  footer,
}: {
  title: string;
  items: SidebarItem[];
  defaultCollapsed: boolean;
  logoutAction: () => void | Promise<void>;
  /** Contenu optionnel sous le titre (ex: badge de rôle) — pas affiché en mode réduit. */
  footer?: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const pathname = usePathname();

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    // Cookie simple, non httpOnly : c'est une préférence d'affichage, pas
    // une donnée sensible. Lu côté serveur au prochain chargement de page
    // pour éviter un flash "ouvert puis fermé" au refresh.
    document.cookie = `${COOKIE_NAME}=${next ? "1" : "0"}; path=/; max-age=${COOKIE_MAX_AGE}`;
  }

  return (
    <aside
      className={cn(
        "flex h-screen shrink-0 flex-col border-r bg-background transition-[width] duration-200",
        collapsed ? "w-14" : "w-56"
      )}
    >
      <div className="flex items-center justify-between px-3 py-3">
        {!collapsed && <span className="text-sm font-semibold truncate">{title}</span>}
        <Button
          variant="ghost"
          size="icon"
          className="size-7 shrink-0"
          onClick={toggle}
          aria-label={collapsed ? "Ouvrir le menu" : "Réduire le menu"}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4" />
          ) : (
            <PanelLeftClose className="size-4" />
          )}
        </Button>
      </div>

      {footer && !collapsed && <div className="px-3 pb-2">{footer}</div>}

      <nav className="flex flex-1 flex-col gap-1 px-2">
        {items.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            collapsed={collapsed}
            active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
          />
        ))}
      </nav>

      <div className="border-t px-2 py-2 flex flex-col gap-1">
        <ThemeToggle collapsed={collapsed} />
        <form action={logoutAction}>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon"
                  className="size-7 mx-auto flex"
                  aria-label="Se déconnecter"
                >
                  <LogOut className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Se déconnecter</TooltipContent>
            </Tooltip>
          ) : (
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-3 px-3"
            >
              <LogOut className="size-4" />
              Se déconnecter
            </Button>
          )}
        </form>
      </div>
    </aside>
  );
}
