import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/guards";
import {
  getResolutionParProjet,
  type PeriodeStats,
} from "@/lib/queries/stats-resolution";

const PERIODES_VALIDES: PeriodeStats[] = ["jour", "semaine", "mois"];

export async function GET(request: Request) {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const periodeParam = searchParams.get("periode") ?? "semaine";
  const projetId = searchParams.get("projet") ?? undefined;

  const periode: PeriodeStats = PERIODES_VALIDES.includes(periodeParam as PeriodeStats)
    ? (periodeParam as PeriodeStats)
    : "semaine";

  const donnees = await getResolutionParProjet(supabase, periode, projetId);
  return NextResponse.json(donnees);
}
