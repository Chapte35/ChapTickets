import type { Metadata } from "next";
import "./globals.css";

// NB: pas de next/font/google ici volontairement — ça évite de dépendre
// d'un fetch réseau vers fonts.googleapis.com au moment du build (source de
// build cassé en CI/sandbox sans accès réseau sortant). On utilise la stack
// de polices système, qui reste cohérente avec le style shadcn "new-york".
// Si tu veux une police custom, ajoute-la via `next/font/local`.

export const metadata: Metadata = {
  title: "Gestion tickets",
  description: "Application interne de gestion de tickets & communication client",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
