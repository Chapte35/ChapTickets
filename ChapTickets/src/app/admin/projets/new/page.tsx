import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreateProjetForm } from "./create-projet-form";

export default function NewProjetPage() {
  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>Nouveau projet</CardTitle>
      </CardHeader>
      <CardContent>
        <CreateProjetForm />
      </CardContent>
    </Card>
  );
}
