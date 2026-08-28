import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import { cn } from "@/lib/utils";

/**
 * Rendu markdown avec support images inline.
 * Les URLs d'images dans le markdown sont des URLs signées Supabase (1h),
 * générées côté serveur au chargement de la page — elles expireront
 * mais c'est acceptable pour une session de consultation.
 *
 * On n'utilise pas "use client" : ce composant est pur rendu,
 * il peut être rendu côté serveur.
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
        "[&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5",
        "[&_hr]:my-3 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm",
        className
      )}
    >
      <ReactMarkdown rehypePlugins={[rehypeRaw]}>{content}</ReactMarkdown>
    </div>
  );
}
