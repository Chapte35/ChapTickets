// supabase/functions/envoyer-email-release/index.ts
//
// Déclenchée via supabase.functions.invoke() depuis les Server Actions :
//   1. À la création d'une release si la case "Notifier les clients" est cochée
//   2. Manuellement depuis /admin/mailing pour les releases passées
//
// Variables d'env requises (dashboard Supabase → Edge Functions → Secrets) :
//   RESEND_API_KEY — clé API Resend (https://resend.com)
//   APP_URL        — URL de l'app (ex: https://chaptickets.vercel.app)
//
// Payload attendu :
//   releaseId    string   — UUID de la release
//   clientIds    string[] — UUIDs des clients à notifier
//   declencheur  'auto' | 'admin'

import { createClient } from "jsr:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const APP_URL = Deno.env.get("APP_URL") ?? "https://chaptickets.vercel.app";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { releaseId, clientIds, declencheur = "auto" } = await req.json();

    if (!releaseId || !Array.isArray(clientIds) || clientIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "Paramètres manquants (releaseId, clientIds)." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY non configurée." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ── Charger la release + projet ─────────────────────────────────────────
    const { data: release, error: releaseError } = await supabase
      .from("releases")
      .select("id, nom, date, description, projet_id, projets(nom, code_court)")
      .eq("id", releaseId)
      .single();

    if (releaseError || !release) {
      return new Response(
        JSON.stringify({ error: "Release introuvable." }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // ── Charger les tickets de la release ───────────────────────────────────
    const { data: tickets } = await supabase
      .from("tickets_avec_rang")
      .select("id, rang_projet, titre, statut, priorite")
      .eq("release_id", releaseId)
      .order("rang_projet", { ascending: true });

    // ── Charger les profils des clients ciblés ──────────────────────────────
    const { data: profils } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .in("id", clientIds);

    if (!profils || profils.length === 0) {
      return new Response(
        JSON.stringify({ error: "Aucun profil client trouvé." }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const projet = release.projets as { nom: string; code_court: string | null } | null;
    const projetNom = projet?.nom ?? "votre projet";
    const projetCodeCourt = projet?.code_court;
    const releaseDate = new Date(release.date).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const ticketsList = (tickets ?? []) as Array<{
      id: string;
      rang_projet: number;
      titre: string;
      statut: string;
      priorite: string;
    }>;

    // ── Statuts FR pour l'email ─────────────────────────────────────────────
    const STATUT_LABELS: Record<string, string> = {
      ouvert: "Ouvert",
      en_cours: "En cours",
      en_attente_client: "En attente client",
      resolu: "Résolu",
      ferme: "Fermé",
    };

    const STATUT_COLORS: Record<string, string> = {
      ouvert: "#3b82f6",
      en_cours: "#f59e0b",
      en_attente_client: "#8b5cf6",
      resolu: "#22c55e",
      ferme: "#6b7280",
    };

    // ── Construction du HTML tickets ────────────────────────────────────────
    function buildTicketsHtml(clientId: string): string {
      if (ticketsList.length === 0) {
        return `<p style="color:#6b7280;font-size:14px;margin:0;">Aucun ticket associé à cette release.</p>`;
      }

      const lienDashboard = `${APP_URL}/dashboard/tickets`;

      return ticketsList
        .map((t) => {
          const ref = projetCodeCourt
            ? `${projetCodeCourt}#${t.rang_projet}`
            : `#${t.rang_projet}`;
          const couleur = STATUT_COLORS[t.statut] ?? "#6b7280";
          const label = STATUT_LABELS[t.statut] ?? t.statut;
          return `
            <tr>
              <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;">
                <a href="${lienDashboard}/${t.id}" style="text-decoration:none;color:#1a1a1a;">
                  <span style="font-family:monospace;font-size:12px;color:#6b7280;margin-right:6px;">${ref}</span>
                  <span style="font-size:14px;font-weight:500;">${t.titre}</span>
                </a>
              </td>
              <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:right;white-space:nowrap;">
                <span style="
                  display:inline-block;
                  padding:2px 8px;
                  border-radius:9999px;
                  font-size:12px;
                  font-weight:500;
                  background:${couleur}20;
                  color:${couleur};
                  border:1px solid ${couleur}40;
                ">${label}</span>
              </td>
            </tr>`;
        })
        .join("");
    }

    // ── Envoi email par client ──────────────────────────────────────────────
    const results: { clientId: string; sent: boolean; error?: string }[] = [];

    for (const profil of profils) {
      if (!profil.email) continue;

      const prenom = profil.full_name?.split(" ")[0] ?? "vous";
      const lienReleases = `${APP_URL}/dashboard/releases`;
      const ticketsHtml = buildTicketsHtml(profil.id);

      const resolus = ticketsList.filter(
        (t) => t.statut === "resolu" || t.statut === "ferme"
      ).length;
      const total = ticketsList.length;
      const pct = total > 0 ? Math.round((resolus / total) * 100) : 0;
      const barreWidth = Math.max(1, pct);

      const htmlBody = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Nouvelle release — ${release.nom}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- En-tête -->
          <tr>
            <td style="background:#1a1a1a;border-radius:12px 12px 0 0;padding:28px 32px;">
              <p style="margin:0 0 4px;font-size:12px;color:#999;letter-spacing:0.08em;text-transform:uppercase;">
                ${projetNom}
              </p>
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;line-height:1.3;">
                🚀 ${release.nom}
              </h1>
              <p style="margin:8px 0 0;font-size:14px;color:#aaa;">
                Disponible le ${releaseDate}
              </p>
            </td>
          </tr>

          <!-- Corps -->
          <tr>
            <td style="background:#ffffff;padding:28px 32px;">
              <p style="margin:0 0 20px;font-size:15px;color:#1a1a1a;line-height:1.6;">
                Bonjour ${prenom},
              </p>
              <p style="margin:0 0 24px;font-size:15px;color:#444;line-height:1.6;">
                Une nouvelle release est disponible sur <strong>${projetNom}</strong>.
                ${release.description
                  ? `<br/><br/>${release.description}`
                  : ""}
              </p>

              ${total > 0 ? `
              <!-- Barre de progression -->
              <div style="background:#f5f5f5;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                  <span style="font-size:13px;font-weight:600;color:#1a1a1a;">Progression</span>
                  <span style="font-size:13px;color:#6b7280;">${resolus}/${total} tickets résolus</span>
                </div>
                <div style="background:#e5e7eb;border-radius:9999px;height:6px;overflow:hidden;">
                  <div style="background:#22c55e;height:6px;border-radius:9999px;width:${barreWidth}%;"></div>
                </div>
              </div>

              <!-- Tickets -->
              <p style="margin:0 0 10px;font-size:13px;font-weight:600;color:#1a1a1a;text-transform:uppercase;letter-spacing:0.06em;">
                Tickets inclus (${total})
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f0f0f0;border-radius:8px;overflow:hidden;margin-bottom:24px;">
                <tbody>
                  ${ticketsHtml}
                </tbody>
              </table>
              ` : ""}

              <!-- CTA -->
              <div style="text-align:center;margin-top:8px;">
                <a
                  href="${lienReleases}"
                  style="
                    display:inline-block;
                    padding:12px 28px;
                    background:#1a1a1a;
                    color:#ffffff;
                    border-radius:8px;
                    text-decoration:none;
                    font-size:14px;
                    font-weight:600;
                    letter-spacing:0.02em;
                  "
                >
                  Voir les releases →
                </a>
              </div>
            </td>
          </tr>

          <!-- Pied -->
          <tr>
            <td style="background:#f9f9f9;border-radius:0 0 12px 12px;border:1px solid #f0f0f0;border-top:none;padding:16px 32px;">
              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;line-height:1.6;">
                Cet email a été envoyé automatiquement par ChapTickets.<br/>
                Vous le recevez car vous êtes rattaché au projet <strong>${projetNom}</strong>.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "ChapTickets <noreply@chapte.dev>",
          to: [profil.email],
          subject: `[${projetNom}] Nouvelle release : ${release.nom}`,
          html: htmlBody,
        }),
      });

      if (!resendRes.ok) {
        const errBody = await resendRes.text();
        console.error(`[envoyer-email-release] Resend error for ${profil.email}:`, errBody);
        results.push({ clientId: profil.id, sent: false, error: errBody });
        continue;
      }

      // ── Enregistrement dans release_notifications (upsert par release+client) ──
      await supabase.from("release_notifications").upsert(
        {
          release_id: releaseId,
          client_id: profil.id,
          envoyee_le: new Date().toISOString(),
          declencheur,
        },
        { onConflict: "release_id,client_id" }
      );

      results.push({ clientId: profil.id, sent: true });
    }

    const envoyes = results.filter((r) => r.sent).length;
    const echecs = results.filter((r) => !r.sent).length;

    return new Response(
      JSON.stringify({ envoyes, echecs, results }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[envoyer-email-release] Erreur:", err);
    return new Response(
      JSON.stringify({ error: "Erreur interne." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
