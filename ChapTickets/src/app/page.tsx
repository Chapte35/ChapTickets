import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * Page temporaire de Sprint 0 : sert uniquement à vérifier visuellement que
 * Tailwind v4 + shadcn/ui sont correctement câblés. Sera remplacée par le
 * vrai dashboard en Sprint 6 (section 4.6 du cahier des charges).
 */
export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sprint 0 — Setup OK</CardTitle>
          <CardDescription>
            Next.js + shadcn/ui + Supabase sont branchés. La vraie UI arrive
            au prochain sprint.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <Badge>ouvert</Badge>
          <Badge variant="secondary">en cours</Badge>
          <Badge variant="outline">résolu</Badge>
          <Button size="sm">Bouton de test</Button>
        </CardContent>
      </Card>
    </main>
  );
}
