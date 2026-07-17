import { createBrowserClient } from "@supabase/ssr";

/**
 * Client Supabase à utiliser dans les Client Components ("use client").
 * Ne jamais utiliser ce client dans un Server Component ou une Server Action :
 * utiliser `createClient` de `./server` à la place.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
