import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Placeholder : le vrai dashboard (tickets récents, urgences, projets en
 * cours - section 4.6 du cahier des charges) arrive au Sprint 6, une fois
 * que tickets et projets existent réellement.
 */
export default function AdminHomePage() {
  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Dashboard admin</CardTitle>
        <CardDescription>
          Arrivera au Sprint 6. Pour l&apos;instant, va gérer tes clients.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
