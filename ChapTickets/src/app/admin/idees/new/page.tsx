import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreateIdeeForm } from "./create-idee-form";

export default function NewIdeePage() {
  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>Nouvelle idée</CardTitle>
      </CardHeader>
      <CardContent>
        <CreateIdeeForm />
      </CardContent>
    </Card>
  );
}
