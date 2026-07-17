"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ThemeToggle({ collapsed }: { collapsed: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();
  // next-themes ne connaît le thème réel qu'après le montage côté client
  // (avant ça, on ne veut rien afficher qui puisse ne pas correspondre au
  // HTML généré par le serveur — cf. suppressHydrationWarning dans layout.tsx,
  // ce composant est la partie qui a vraiment besoin d'attendre le montage).
  //
  // Pattern documenté par next-themes lui-même pour ce cas précis : un seul
  // flip ponctuel au montage, pas de cascade de re-renders. L'alternative
  // (useSyncExternalStore) demanderait de réimplémenter ce que next-themes
  // fait déjà en interne, pour le même résultat.
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  function toggle() {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }

  const label = !mounted
    ? "Thème"
    : resolvedTheme === "dark"
      ? "Passer en clair"
      : "Passer en sombre";

  const icon = !mounted ? (
    <Sun className="size-4 opacity-0" />
  ) : resolvedTheme === "dark" ? (
    <Sun className="size-4" />
  ) : (
    <Moon className="size-4" />
  );

  const button = (
    <Button
      type="button"
      variant="ghost"
      size={collapsed ? "icon" : "sm"}
      className={collapsed ? "size-7 mx-auto flex" : "w-full justify-start gap-3 px-3"}
      onClick={toggle}
      disabled={!mounted}
      aria-label={label}
    >
      {icon}
      {!collapsed && label}
    </Button>
  );

  if (!collapsed) return button;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}
