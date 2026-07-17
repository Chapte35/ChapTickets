/**
 * En pratique cette page ne s'affiche jamais : src/proxy.ts redirige "/"
 * systématiquement (vers /login si non connecté, /admin ou /dashboard
 * sinon). Gardée comme filet de sécurité si jamais le proxy ne matche pas
 * la route pour une raison quelconque.
 */
export default function Home() {
  return null;
}
