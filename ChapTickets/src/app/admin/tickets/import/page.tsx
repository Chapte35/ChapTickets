import { ImportWizard } from "./import-wizard";

export default function ImportTicketsPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">Importer des tickets</h1>
      <ImportWizard />
    </div>
  );
}
