// supabase/functions/envoyer-email-ticket/index.ts
// Déclenchée via supabase.functions.invoke() depuis les Server Actions
// quand un ticket est assigné à un client en en_attente_client.
//
// Variables d'env requises (à configurer dans le dashboard Supabase) :
//   RESEND_API_KEY — clé API Resend (https://resend.com)
//   APP_URL        — URL de l'app (ex: https://chaptickets.vercel.app)
//
// Rate limit : 1 email max par ticket par heure (vérifié en base).

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
    const { ticketId, clientId, ticketTitre, clientEmail, clientNom } =
      await req.json();

    if (!ticketId || !clientId || !clientEmail) {
      return new Response(
        JSON.stringify({ error: "Paramètres manquants." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // ── Rate limit : 1 email par ticket par heure ─────────────────────────
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const uneHeureLe = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: emailRecent } = await supabase
      .from("notifications")
      .select("id")
      .eq("ticket_id", ticketId)
      .eq("user_id", clientId)
      .gt("created_at", uneHeureLe)
      .limit(1)
      .single();

    if (emailRecent) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "rate_limit" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // ── Envoi via Resend ──────────────────────────────────────────────────
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY non configurée." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const prenom = clientNom?.split(" ")[0] ?? "vous";
    const lienTicket = `${APP_URL}/dashboard/tickets/${ticketId}`;

    const htmlBody = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
        <h2 style="color: #1a1a1a;">Un ticket vous attend</h2>
        <p>Bonjour ${prenom},</p>
        <p>
          Le ticket <strong>${ticketTitre}</strong> vous a été assigné
          et attend votre retour.
        </p>
        <p>
          <a
            href="${lienTicket}"
            style="
              display: inline-block;
              padding: 10px 20px;
              background: #1a1a1a;
              color: #fff;
              border-radius: 6px;
              text-decoration: none;
              font-weight: 500;
            "
          >
            Voir le ticket →
          </a>
        </p>
        <p style="color: #666; font-size: 13px; margin-top: 24px;">
          Cet email a été envoyé automatiquement par ChapTickets.
        </p>
      </div>
    `;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "ChapTickets <noreply@chapte.dev>",
        to: [clientEmail],
        subject: `[ChapTickets] Action requise : ${ticketTitre}`,
        html: htmlBody,
      }),
    });

    if (!resendRes.ok) {
      const errBody = await resendRes.text();
      console.error("[envoyer-email-ticket] Resend error:", errBody);
      return new Response(
        JSON.stringify({ error: "Échec envoi email.", detail: errBody }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ sent: true }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[envoyer-email-ticket] Erreur:", err);
    return new Response(
      JSON.stringify({ error: "Erreur interne." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
