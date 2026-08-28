"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ticket, Kanban } from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
} from "@/components/ui/command";
import { globalSearch, type SearchResult } from "@/lib/actions/search";

export function GlobalCommandMenu({ basePath }: { basePath: "/admin" | "/dashboard" }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult>({ tickets: [], projets: [] });
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    function onCustomOpen() {
      setOpen(true);
    }
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("open-command-menu", onCustomOpen);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("open-command-menu", onCustomOpen);
    };
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      startTransition(async () => {
        setResults(await globalSearch(query));
      });
    }, 200);
    return () => clearTimeout(handle);
  }, [query]);

  function aller(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Recherche"
      description="Rechercher un ticket ou un projet"
    >
      <CommandInput
        placeholder="Rechercher un ticket, un projet..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {query.trim().length >= 2 && !isPending && (
          <CommandEmpty>Aucun résultat.</CommandEmpty>
        )}
        {results.tickets.length > 0 && (
          <CommandGroup heading="Tickets">
            {results.tickets.map((t) => (
              <CommandItem
                key={t.id}
                onSelect={() => aller(`${basePath}/tickets/${t.id}`)}
              >
                <Ticket />
                <span className="font-mono text-xs text-muted-foreground shrink-0">{t.ref}</span>
                <span className="truncate">{t.titre}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {results.projets.length > 0 && (
          <CommandGroup heading="Projets">
            {results.projets.map((p) => (
              <CommandItem
                key={p.id}
                onSelect={() =>
                  aller(
                    basePath === "/admin"
                      ? `/admin/projets/${p.id}/overview`
                      : `/dashboard/projets/${p.id}`
                  )
                }
              >
                <Kanban />
                {p.nom}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
      <div className="flex items-center justify-end border-t px-3 py-2 text-xs text-muted-foreground">
        <CommandShortcut>⌘K</CommandShortcut>
      </div>
    </CommandDialog>
  );
}
