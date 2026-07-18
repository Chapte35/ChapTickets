import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { ReleaseAvecProgression } from "@/lib/queries/releases";

export function ReleaseProgressList({ releases }: { releases: ReleaseAvecProgression[] }) {
  if (releases.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune release pour l&apos;instant.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {releases.map((r) => {
        const pct = r.total > 0 ? Math.round((r.resolus / r.total) * 100) : 0;
        return (
          <li key={r.id} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{r.nom}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {new Date(r.date).toLocaleDateString("fr-FR")}
                </span>
                <Badge variant="outline" className="text-xs">
                  {r.resolus}/{r.total}
                </Badge>
              </div>
            </div>
            {r.total > 0 && <Progress value={pct} className="h-1.5" />}
            {r.description && (
              <p className="text-xs text-muted-foreground">{r.description}</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
