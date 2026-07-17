import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

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
    // suppressHydrationWarning : requis par next-themes. Le thème est décidé
    // côté client (localStorage) avant l'hydratation React, donc l'attribut
    // `class` du <html> peut légitimement différer entre le HTML généré par
    // le serveur et ce que le navigateur affiche au premier rendu — ce n'est
    // pas une vraie erreur d'hydratation, juste next-themes qui fait son
    // travail avant que React ne prenne la main.
    <html lang="fr" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col font-sans">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
