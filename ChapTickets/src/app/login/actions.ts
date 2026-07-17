"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error: string | null };

export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    return { error: "Email et mot de passe requis." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Log côté serveur (terminal `next dev`, jamais renvoyé au client) :
    // sert à débugger sans casser le message générique côté utilisateur.
    // TODO Sprint 2 : retirer une fois l'auth stabilisée en prod, ou
    // brancher sur un vrai outil de logs.
    console.error("[login] Supabase signIn error:", error.status, error.code, error.message);

    // Message volontairement générique côté client : ne pas révéler si
    // c'est l'email ou le mot de passe qui est faux (évite l'énumération
    // de comptes). La vraie raison est dans le log ci-dessus.
    return { error: "Identifiants invalides." };
  }

  // Le proxy se charge de rediriger vers /admin ou /dashboard selon le rôle,
  // donc "/" suffit ici.
  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}