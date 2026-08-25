// supabase/functions/recap-quotidien-tickets/index.ts
//
// Cron déclenché chaque jour à 20h (Europe/Paris) via Supabase Cron.
// Envoie 1 email de récap par client ayant des notifications non lues
// liées à des tickets en_attente_client.
//
// Variables d'env requises (Supabase Vault) :
//   RESEND_API_KEY — clé API Resend
//   APP_URL        — URL de l'app (ex: https://chap-tickets.vercel.app)

import { createClient } from "jsr:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const APP_URL = Deno.env.get("APP_URL") ?? "https://chap-tickets.vercel.app";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ── Template email ────────────────────────────────────────────────────────────
// Thème cohérent avec l'app : fond dark (#09090b), accent purple (#7c3aed),
// typographie system-ui. Compatible avec les clients email majeurs
// (Outlook, Gmail, Apple Mail) — inline styles obligatoires.

function buildEmailHtml(params: {
  prenom: string;
  tickets: Array<{ titre: string; ref: string; lien: string }>;
  appUrl: string;
}): string {
  const { prenom, tickets, appUrl } = params;

  const lignesTickets = tickets
    .map(
      (t) => `
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #27272a;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td>
                <span style="
                  font-family: 'Courier New', monospace;
                  font-size: 11px;
                  color: #71717a;
                  margin-right: 8px;
                ">${t.ref}</span>
                <span style="
                  font-size: 14px;
                  color: #fafafa;
                  font-weight: 500;
                ">${t.titre}</span>
              </td>
              <td align="right" style="white-space: nowrap;">
                <a
                  href="${t.lien}"
                  style="
                    display: inline-block;
                    padding: 4px 12px;
                    background: #7c3aed;
                    color: #ffffff;
                    border-radius: 6px;
                    font-size: 12px;
                    font-weight: 500;
                    text-decoration: none;
                  "
                >Voir →</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>`
    )
    .join("");

  const nb = tickets.length;
  const pluriel = nb > 1;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Récap tickets ChapTickets</title>
</head>
<body style="margin:0;padding:0;background:#09090b;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#09090b;">
    <tr>
      <td align="center" style="padding: 40px 16px;">

        <!-- Carte principale -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0"
          style="max-width:560px;background:#18181b;border-radius:12px;border:1px solid #27272a;overflow:hidden;">

          <!-- Header purple -->
          <tr>
            <td style="
              background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
              padding: 24px 28px;
            ">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <span style="
                      font-size: 18px;
                      font-weight: 700;
                      color: #ffffff;
                      letter-spacing: -0.3px;
                    ">ChapTickets</span>
                  </td>
                  <td align="right">
                    <span style="
                      background: rgba(255,255,255,0.2);
                      color: #ffffff;
                      font-size: 12px;
                      font-weight: 600;
                      padding: 4px 10px;
                      border-radius: 20px;
                    ">${nb} ticket${pluriel ? "s" : ""} en attente</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Corps -->
          <tr>
            <td style="padding: 28px;">

              <p style="margin: 0 0 6px; font-size: 20px; font-weight: 600; color: #fafafa;">
                Bonjour ${prenom} 👋
              </p>
              <p style="margin: 0 0 24px; font-size: 14px; color: #71717a; line-height: 1.6;">
                ${pluriel
                  ? `Vous avez <strong style="color:#a78bfa">${nb} tickets</strong> qui attendent votre retour.`
                  : `Vous avez <strong style="color:#a78bfa">1 ticket</strong> qui attend votre retour.`
                }
              </p>

              <!-- Liste tickets -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                ${lignesTickets}
              </table>

              <!-- CTA global -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 24px;">
                <tr>
                  <td align="center">
                    <a
                      href="${appUrl}/dashboard/mes-tickets"
                      style="
                        display: inline-block;
                        padding: 12px 28px;
                        background: #7c3aed;
                        color: #ffffff;
                        border-radius: 8px;
                        font-size: 14px;
                        font-weight: 600;
                        text-decoration: none;
                        letter-spacing: 0.1px;
                      "
                    >Voir tous mes tickets →</a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="
              padding: 16px 28px;
              border-top: 1px solid #27272a;
              background: #09090b;
            ">
              <p style="margin: 0; font-size: 12px; color: #52525b; text-align: center; line-height: 1.6;">
                Cet email vous a été envoyé par ChapTickets.<br />
                Vous recevez ce récap car des tickets vous ont été assignés.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Cron handler ──────────────────────────────────────────────────────────────

Deno.serve(async (_req) => {
  if (!RESEND_API_KEY) {
    return new Response(
      JSON.stringify({ error: "RESEND_API_KEY non configurée." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // 1. Récupérer toutes les notifications non lues liées à des tickets
  //    en_attente_client, groupées par client.
  const { data: notifs, error } = await supabase
    .from("notifications")
    .select(`
      user_id,
      ticket_id,
      tickets!inner (
        id,
        titre,
        statut,
        numero,
        projets ( code_court )
      )
    `)
    .eq("lu", false)
    .eq("tickets.statut", "en_attente_client");

  if (error) {
    console.error("[recap-quotidien] Erreur lecture notifs:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!notifs || notifs.length === 0) {
    return new Response(
      JSON.stringify({ sent: 0, message: "Aucune notification à envoyer." }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // 2. Récupérer les profils séparément pour éviter le problème de FK ambiguë
  const userIds = [...new Set(notifs.map((n) => n.user_id))];
  const { data: profils } = await supabase
    .from("profiles")
    .select("id, email, full_name")
    .in("id", userIds);

  const profilsMap = new Map(
    (profils ?? []).map((p) => [p.id, p])
  );

  // 3. Grouper par user_id
  const parClient = new Map<string, {
    email: string;
    prenom: string;
    tickets: Array<{ titre: string; ref: string; lien: string }>;
  }>();

  for (const n of notifs) {
    const profil = profilsMap.get(n.user_id);
    const ticket = n.tickets as unknown as {
      id: string;
      titre: string;
      numero: number;
      projets: { code_court: string | null } | null;
    };

    if (!profil?.email) continue;

    const ref = ticket.projets?.code_court
      ? `${ticket.projets.code_court}#${ticket.numero}`
      : `#${ticket.numero}`;

    const existing = parClient.get(n.user_id);
    if (existing) {
      existing.tickets.push({
        titre: ticket.titre,
        ref,
        lien: `${APP_URL}/dashboard/tickets/${ticket.id}`,
      });
    } else {
      parClient.set(n.user_id, {
        email: profil.email,
        prenom: profil.full_name?.split(" ")[0] ?? "vous",
        tickets: [{
          titre: ticket.titre,
          ref,
          lien: `${APP_URL}/dashboard/tickets/${ticket.id}`,
        }],
      });
    }
  }

  // 4. Envoyer 1 email de récap par client
  let envoyes = 0;
  let echecs = 0;

  for (const [_userId, client] of parClient) {
    const html = buildEmailHtml({
      prenom: client.prenom,
      tickets: client.tickets,
      appUrl: APP_URL,
    });

    const nb = client.tickets.length;
    const sujet = nb === 1
      ? `[ChapTickets] 1 ticket attend votre retour`
      : `[ChapTickets] ${nb} tickets attendent votre retour`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "ChapTickets <noreply@chapte.dev>",
        to: [client.email],
        subject: sujet,
        html,
      }),
    });

    if (res.ok) {
      envoyes++;
    } else {
      const errBody = await res.text();
      console.error(`[recap-quotidien] Échec email pour ${client.email}:`, errBody);
      echecs++;
    }
  }

  return new Response(
    JSON.stringify({ envoyes, echecs }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
