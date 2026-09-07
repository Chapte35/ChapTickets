"use client";

import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

/**
 * Rendu markdown avec support :
 * - Images inline (URLs signées Supabase ou base64 pour la prévisualisation à la création)
 * - Tableaux GFM (via remark-gfm)
 * - Listes à puces et numérotées
 *
 * "use client" requis car remark-gfm n'est pas compatible SSR dans certains
 * contextes Next.js App Router (problème d'ESM).
 */
export function MarkdownRenderer({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  if (!content?.trim()) return null;

  return (
    <div
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none",
        "[&_img]:max-w-full [&_img]:rounded-md [&_img]:my-2 [&_img]:border",
        "[&_p]:my-1",
        "[&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5",
        "[&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5",
        "[&_li]:my-0.5",
        "[&_hr]:my-3 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm",
        "[&_table]:border-collapse [&_table]:w-full [&_table]:my-2",
        "[&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:bg-muted/50 [&_th]:text-left [&_th]:text-xs [&_th]:font-medium",
        "[&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_td]:text-sm",
        className
      )}
    >
      <ReactMarkdown rehypePlugins={[rehypeRaw]} remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
