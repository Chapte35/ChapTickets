"use client";

import { useActionState, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { envoyerEmailRelease } from "./actions";
import type { ClientOption, ProjetOption } from "@/lib/queries/tickets";
import {
  Mail,
  CheckCircle2,
  AlertCircle,
  Clock,
  Users,
  ChevronDown,
  ChevronRight,
  Send,
  RefreshCw,
} from "lucide-react";

export type ReleaseAvecStatutNotif = {
  id: string;
  projet_id: string;
  nom: string;
  date: string;
  description: string | null;
  projet_nom: string;
  projet_code_court: string | null;
  statut_notif: "notifie" | "partiel" | "non_notifie" | "sans_clients";
  clients_du_projet: ClientOption[];
  notifs: Record<string, { envoyee_le: string; declencheur: string }>;
};

type EnvoiState = { error: string | null; success: string | null };
const initialState: EnvoiState = { error: null, success: null };

// ── Badge statut notif ────────────────────────────────────────────────────────

function StatutBadge({ statut }: { statut: ReleaseAvecStatutNotif["statut_notif"] }) {
  switch (statut) {
    case "notifie":
      return (
        <Badge className="gap-1 text-xs bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30">
          <CheckCircle2 className="size-3" />
          Notifié
        </Badge>
      );
    case "partiel":
      return (
        <Badge className="gap-1 text-xs bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30">
          <AlertCircle className="size-3" />
          Partiel
        </Badge>
      );
    case "non_notifie":
      return (
        <Badge className="gap-1 text-xs bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30">
          <Clock className="size-3" />
          Non notifié
        </Badge>
      );
    case "sans_clients":
      return (
        <Badge className="gap-1 text-xs bg-gray-500/15 text-gray-500 border-gray-500/30">
          <Users className="size-3" />
          Pas de clients
        </Badge>
      );
  }
}

// ── Carte release individuelle ────────────────────────────────────────────────

function CarteRelease({ release }: { release: ReleaseAvecStatutNotif }) {
  const [ouvert, setOuvert] = useState(
    release.statut_notif === "non_notifie" || release.statut_notif === "partiel"
  );
  const [clientsCoches, setClientsCoches] = useState<Set<string>>(() => {
    // Pré-cocher les clients non encore notifiés
    return new Set(release.clients_du_projet.filter((c) => !release.notifs[c.id]).map((c) => c.id));
  });

  const [state, formAction, isPending] = useActionState(envoyerEmailRelease, initialState);

  function toggleClient(id: string) {
    setClientsCoches((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toutCocher() {
    setClientsCoches(new Set(release.clients_du_projet.map((c) => c.id)));
  }

  function toutDecocher() {
    setClientsCoches(new Set());
  }

  const dateFormatee = new Date(release.date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const nbNotifies = release.clients_du_projet.filter((c) => release.notifs[c.id]).length;
  const nbTotal = release.clients_du_projet.length;

  return (
    <Card className={cn(
      "transition-colors",
      release.statut_notif === "non_notifie" && "border-red-500/20",
      release.statut_notif === "partiel" && "border-amber-500/20",
    )}>
      {/* En-tête cliquable */}
      <button
        type="button"
        className="w-full text-left"
        onClick={() => setOuvert((v) => !v)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2 min-w-0">
              {ouvert ? (
                <ChevronDown className="size-4 mt-0.5 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRight className="size-4 mt-0.5 shrink-0 text-muted-foreground" />
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm truncate">{release.nom}</span>
                  <StatutBadge statut={release.statut_notif} />
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                  <span>{release.projet_nom}</span>
                  <span>·</span>
                  <span>{dateFormatee}</span>
                  {nbTotal > 0 && (
                    <>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Mail className="size-3" />
                        {nbNotifies}/{nbTotal} notifié{nbTotal > 1 ? "s" : ""}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
      </button>

      {/* Contenu dépliable */}
      {ouvert && (
        <CardContent className="pt-0 flex flex-col gap-4">
          {release.description && (
            <p className="text-sm text-muted-foreground border-l-2 border-border pl-3">
              {release.description}
            </p>
          )}

          {release.clients_du_projet.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun client rattaché à ce projet.
            </p>
          ) : (
            <form action={formAction} className="flex flex-col gap-3">
              <input type="hidden" name="release_id" value={release.id} />

              {/* Liste clients */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Destinataires
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={toutCocher}
                      className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                    >
                      Tout cocher
                    </button>
                    <button
                      type="button"
                      onClick={toutDecocher}
                      className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                    >
                      Tout décocher
                    </button>
                  </div>
                </div>

                <div className="divide-y border rounded-lg overflow-hidden">
                  {release.clients_du_projet.map((client) => {
                    const notif = release.notifs[client.id];
                    const estCoche = clientsCoches.has(client.id);
                    return (
                      <div
                        key={client.id}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 transition-colors",
                          estCoche ? "bg-muted/30" : "bg-background"
                        )}
                      >
                        <Checkbox
                          id={`${release.id}-${client.id}`}
                          name="client_ids"
                          value={client.id}
                          checked={estCoche}
                          onCheckedChange={() => toggleClient(client.id)}
                        />
                        <Label
                          htmlFor={`${release.id}-${client.id}`}
                          className="flex-1 cursor-pointer min-w-0"
                        >
                          <span className="text-sm font-medium truncate block">
                            {client.full_name ?? client.email ?? client.id}
                          </span>
                          {client.email && client.full_name && (
                            <span className="text-xs text-muted-foreground">{client.email}</span>
                          )}
                        </Label>
                        {notif ? (
                          <div className="text-right shrink-0">
                            <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                              <CheckCircle2 className="size-3" />
                              Notifié
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(notif.envoyee_le).toLocaleDateString("fr-FR", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground shrink-0">
                            Pas encore notifié
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Feedback */}
              {state.error && (
                <p className="text-xs text-destructive flex items-center gap-1.5">
                  <AlertCircle className="size-3.5 shrink-0" />
                  {state.error}
                </p>
              )}
              {state.success && (
                <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5 shrink-0" />
                  {state.success}
                </p>
              )}

              {/* Bouton envoi */}
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">
                  {clientsCoches.size} client{clientsCoches.size !== 1 ? "s" : ""} sélectionné{clientsCoches.size !== 1 ? "s" : ""}
                </span>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isPending || clientsCoches.size === 0}
                  className="gap-1.5"
                >
                  {isPending ? (
                    <>
                      <RefreshCw className="size-3.5 animate-spin" />
                      Envoi…
                    </>
                  ) : (
                    <>
                      <Send className="size-3.5" />
                      Envoyer
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ── Board principal ───────────────────────────────────────────────────────────

export function MailingBoard({
  releases,
  projets,
  projetIdActuel,
}: {
  releases: ReleaseAvecStatutNotif[];
  projets: ProjetOption[];
  projetIdActuel: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleProjetChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "__all__") {
      params.delete("projet");
    } else {
      params.set("projet", value);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  // ── Stats globales ────────────────────────────────────────────────────────
  const stats = {
    total: releases.length,
    notifie: releases.filter((r) => r.statut_notif === "notifie").length,
    partiel: releases.filter((r) => r.statut_notif === "partiel").length,
    non_notifie: releases.filter((r) => r.statut_notif === "non_notifie").length,
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Filtres */}
      <div className="flex items-center gap-3">
        <Select
          value={projetIdActuel ?? "__all__"}
          onValueChange={handleProjetChange}
        >
          <SelectTrigger className="w-48 h-8 text-sm">
            <SelectValue placeholder="Tous les projets" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Tous les projets</SelectItem>
            {projets.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.nom}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats globales */}
      {releases.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border bg-card p-3 flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">Toutes notifiées</span>
            <span className="text-xl font-bold text-green-600 dark:text-green-400">
              {stats.notifie}
              <span className="text-sm font-normal text-muted-foreground ml-1">/ {stats.total}</span>
            </span>
          </div>
          <div className="rounded-lg border bg-card p-3 flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">Partiellement notifiées</span>
            <span className="text-xl font-bold text-amber-600 dark:text-amber-400">
              {stats.partiel}
            </span>
          </div>
          <div className="rounded-lg border bg-card p-3 flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">Non notifiées</span>
            <span className="text-xl font-bold text-red-600 dark:text-red-400">
              {stats.non_notifie}
            </span>
          </div>
        </div>
      )}

      {/* Liste releases */}
      {releases.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
          <Mail className="size-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {projetIdActuel
              ? "Aucune release pour ce projet."
              : "Aucune release trouvée."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {releases.map((release) => (
            <CarteRelease key={release.id} release={release} />
          ))}
        </div>
      )}
    </div>
  );
}
