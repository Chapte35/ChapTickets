"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TICKET_PRIORITE_LABELS, TICKET_STATUT_LABELS } from "@/lib/types";
import type { LigneImportValidee } from "@/lib/import/types";
import { analyserFichierImport, confirmerImport } from "./actions";

const MODELE_CSV = `titre,description,projet,client_email,priorite,statut,date_prevue,tags
Bug sur le formulaire de contact,Le bouton d'envoi ne répond plus,Refonte site vitrine,client@exemple.com,haute,ouvert,2026-08-01,bug|frontend
Ajouter un logo dans le header,,Refonte site vitrine,client@exemple.com,normale,ouvert,,design
`;

const MODELE_JSON = JSON.stringify(
  [
    {
      titre: "Bug sur le formulaire de contact",
      description: "Le bouton d'envoi ne répond plus",
      projet: "Refonte site vitrine",
      client_email: "client@exemple.com",
      priorite: "haute",
      statut: "ouvert",
      date_prevue: "2026-08-01",
      tags: ["bug", "frontend"],
    },
    {
      titre: "Ajouter un logo dans le header",
      projet: "Refonte site vitrine",
      client_email: "client@exemple.com",
      tags: ["design"],
    },
  ],
  null,
  2
);

function telecharger(contenu: string, nomFichier: string, type: string) {
  const blob = new Blob([contenu], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomFichier;
  a.click();
  URL.revokeObjectURL(url);
}

export function ImportWizard() {
  const router = useRouter();
  const [lignes, setLignes] = useState<LigneImportValidee[] | null>(null);
  const [erreurFichier, setErreurFichier] = useState<string | null>(null);
  const [analysing, setAnalysing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  // Une ligne valide est incluse par défaut ; une ligne en erreur ne peut
  // pas être cochée (rien à importer tant qu'elle n'est pas corrigée dans
  // le fichier source). Réinitialisé à chaque nouvelle analyse de fichier.
  const [inclusions, setInclusions] = useState<Record<number, boolean>>({});

  const lignesValides = lignes?.filter((l) => l.parsed !== null) ?? [];
  const lignesInvalides = lignes?.filter((l) => l.parsed === null) ?? [];
  const lignesIncluses = lignesValides.filter((l) => inclusions[l.index]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalysing(true);
    setErreurFichier(null);
    setLignes(null);

    const formData = new FormData();
    formData.set("file", file);
    const result = await analyserFichierImport(formData);
    setAnalysing(false);

    if (result.erreurFichier) {
      setErreurFichier(result.erreurFichier);
      return;
    }
    setLignes(result.lignes);
    // Initialisé ici (juste après avoir les lignes), pas via un useEffect
    // dérivé de `lignes` : setState synchrone dans un effet déclenche un
    // re-render en cascade évitable, alors que le déclencheur réel est cet
    // événement précis (nouveau fichier chargé), pas un changement de
    // `lignes` en général.
    setInclusions(
      Object.fromEntries(result.lignes.map((l) => [l.index, l.parsed !== null]))
    );
  }

  function toggleInclusion(index: number, value: boolean) {
    setInclusions((prev) => ({ ...prev, [index]: value }));
  }

  async function handleConfirmer() {
    if (lignesIncluses.length === 0) return;
    setConfirming(true);
    const result = await confirmerImport(lignesIncluses);
    setConfirming(false);

    if (result.crees > 0) {
      toast.success(`${result.crees} ticket${result.crees > 1 ? "s" : ""} créé${result.crees > 1 ? "s" : ""}.`);
    }
    if (result.echecs.length > 0) {
      toast.error(`${result.echecs.length} ligne(s) ont échoué à la création malgré la validation.`);
    }
    if (result.crees > 0) {
      router.push("/admin/tickets");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>1. Choisir un fichier</CardTitle>
          <CardDescription>
            CSV ou JSON. Colonnes/clés attendues : <code>titre</code> (requis),{" "}
            <code>projet</code> (requis, nom exact), <code>client_email</code> (requis),{" "}
            <code>description</code>, <code>priorite</code>, <code>statut</code>,{" "}
            <code>date_prevue</code> (AAAA-MM-JJ), <code>tags</code> (séparés par
            <code>|</code> en CSV, tableau en JSON).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <input
            type="file"
            accept=".csv,.json,text/csv,application/json"
            onChange={handleFileChange}
            disabled={analysing}
            className="text-sm file:mr-2 file:rounded-md file:border file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-secondary-foreground"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => telecharger(MODELE_CSV, "modele-import-tickets.csv", "text/csv")}
            >
              Télécharger un modèle CSV
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                telecharger(MODELE_JSON, "modele-import-tickets.json", "application/json")
              }
            >
              Télécharger un modèle JSON
            </Button>
          </div>
          {analysing && <p className="text-sm text-muted-foreground">Analyse en cours...</p>}
          {erreurFichier && (
            <p role="alert" className="text-sm text-destructive">
              {erreurFichier}
            </p>
          )}
        </CardContent>
      </Card>

      {lignes && lignes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>2. Aperçu</CardTitle>
            <CardDescription>
              <Badge variant="outline" className="mr-2">
                {lignesIncluses.length}/{lignesValides.length} sélectionnée
                {lignesValides.length > 1 ? "s" : ""}
              </Badge>
              {lignesInvalides.length > 0 && (
                <Badge variant="destructive">
                  {lignesInvalides.length} en erreur (ignorée{lignesInvalides.length > 1 ? "s" : ""})
                </Badge>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>#</TableHead>
                  <TableHead>Titre</TableHead>
                  <TableHead>Projet</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Priorité</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Échéance</TableHead>
                  <TableHead>Détails</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lignes.map((l) => (
                  <TableRow key={l.index} className={l.parsed ? undefined : "bg-destructive/5"}>
                    <TableCell>
                      <Checkbox
                        checked={l.parsed ? (inclusions[l.index] ?? false) : false}
                        disabled={!l.parsed}
                        onCheckedChange={(checked) => toggleInclusion(l.index, checked === true)}
                        aria-label={`Inclure la ligne ${l.index + 1} dans l'import`}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{l.index + 1}</TableCell>
                    <TableCell>{l.brute.titre || "—"}</TableCell>
                    <TableCell>{l.parsed?.projet_nom ?? l.brute.projet ?? "—"}</TableCell>
                    <TableCell>{l.parsed?.client_label ?? l.brute.client_email ?? "—"}</TableCell>
                    <TableCell>
                      {l.parsed ? TICKET_PRIORITE_LABELS[l.parsed.priorite] : "—"}
                    </TableCell>
                    <TableCell>{l.parsed ? TICKET_STATUT_LABELS[l.parsed.statut] : "—"}</TableCell>
                    <TableCell>{l.parsed?.date_prevue ?? "—"}</TableCell>
                    <TableCell className="max-w-[280px]">
                      {l.erreurs.length > 0 && (
                        <ul className="text-xs text-destructive list-disc list-inside">
                          {l.erreurs.map((e, i) => (
                            <li key={i}>{e}</li>
                          ))}
                        </ul>
                      )}
                      {l.avertissements.length > 0 && (
                        <ul className="text-xs text-muted-foreground list-disc list-inside">
                          {l.avertissements.map((a, i) => (
                            <li key={i}>{a}</li>
                          ))}
                        </ul>
                      )}
                      {l.erreurs.length === 0 && l.avertissements.length === 0 && (
                        <Badge variant="outline" className="text-xs">
                          OK
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {lignesValides.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>3. Confirmer</CardTitle>
            <CardDescription>
              {lignesIncluses.length === lignesValides.length
                ? `Les ${lignesIncluses.length} tickets sélectionnés seront créés.`
                : `${lignesIncluses.length} ticket${lignesIncluses.length > 1 ? "s" : ""} sur ${lignesValides.length} sélectionné${lignesIncluses.length > 1 ? "s" : ""} seront créés (décoche/coche des lignes ci-dessus pour ajuster).`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleConfirmer} disabled={confirming || lignesIncluses.length === 0}>
              {confirming
                ? "Import en cours..."
                : `Confirmer l'import (${lignesIncluses.length} ticket${lignesIncluses.length > 1 ? "s" : ""})`}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
