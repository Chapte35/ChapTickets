import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ClientDashboardPage() {
  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Bienvenue</CardTitle>
        <CardDescription>
          Tes tickets et messages arriveront ici aux prochains sprints.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
