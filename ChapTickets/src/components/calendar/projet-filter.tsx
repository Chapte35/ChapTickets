"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProjetOption } from "@/lib/queries/tickets";

const ALL = "__all__";

export function ProjetFilter({ projets }: { projets: ProjetOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setProjet(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === ALL) params.delete("projet");
    else params.set("projet", value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Select value={searchParams.get("projet") ?? ALL} onValueChange={setProjet}>
      <SelectTrigger size="sm" className="w-[200px]">
        <SelectValue placeholder="Tous les projets" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>Tous les projets</SelectItem>
        {projets.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.nom}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
