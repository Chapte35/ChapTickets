"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { useCallback, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Minus,
  ImageIcon,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Éditeur riche Tiptap avec :
 * - Bold, italic, listes, séparateur
 * - Upload image par coller (Ctrl+V) : upload vers Supabase Storage → insertion inline
 * - Stockage en markdown (pas en JSON) pour rester compatible avec le reste de l'app
 *
 * Le contenu est stocké en markdown via une conversion simple :
 * Tiptap travaille en HTML, on convertit vers/depuis markdown au montage/sauvegarde.
 */

// ── Conversion HTML ↔ Markdown minimaliste ────────────────────────────────────
// On évite une dépendance lourde (turndown/marked) en faisant une conversion
// adaptée au sous-ensemble HTML produit par Tiptap StarterKit + Image.

function htmlToMarkdown(html: string): string {
  // On normalise d'abord les sauts de ligne pour les regex sans flag s
  const h = html.replace(/\r\n|\r/g, "\n");
  return h
    .replace(/<strong>([\s\S]*?)<\/strong>/g, "**$1**")
    .replace(/<em>([\s\S]*?)<\/em>/g, "*$1*")
    .replace(/<h1>([\s\S]*?)<\/h1>/g, "# $1")
    .replace(/<h2>([\s\S]*?)<\/h2>/g, "## $1")
    .replace(/<h3>([\s\S]*?)<\/h3>/g, "### $1")
    .replace(/<ul>([\s\S]*?)<\/ul>/g, (_, inner: string) =>
      inner
        .replace(/<li><p>([\s\S]*?)<\/p><\/li>/g, "- $1\n")
        .replace(/<li>([\s\S]*?)<\/li>/g, "- $1\n")
    )
    .replace(/<ol>([\s\S]*?)<\/ol>/g, (_, inner: string) => {
      let i = 1;
      return inner
        .replace(/<li><p>([\s\S]*?)<\/p><\/li>/g, (_m: string, t: string) => `${i++}. ${t}\n`)
        .replace(/<li>([\s\S]*?)<\/li>/g, (_m: string, t: string) => `${i++}. ${t}\n`);
    })
    .replace(/<hr>/g, "\n---\n")
    .replace(/<img[^>]+src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/g, "![$2]($1)")
    .replace(/<img[^>]+src="([^"]*)"[^>]*\/?>/g, "![]($1)")
    .replace(/<p>([\s\S]*?)<\/p>/g, "$1\n\n")
    .replace(/<br\s*\/?>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function markdownToHtml(md: string): string {
  if (!md) return "";
  return md
    .replace(/^### (.*)$/gm, "<h3>$1</h3>")
    .replace(/^## (.*)$/gm, "<h2>$1</h2>")
    .replace(/^# (.*)$/gm, "<h1>$1</h1>")
    .replace(/\*\*([\s\S]*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([\s\S]*?)\*/g, "<em>$1</em>")
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">')
    .replace(/^---$/gm, "<hr>")
    .split("\n\n")
    .map((block) => {
      if (block.startsWith("<h") || block.startsWith("<hr")) return block;
      if (block.match(/^- /m)) {
        const items = block.split("\n").filter((l) => l.startsWith("- "));
        return `<ul>${items.map((l) => `<li><p>${l.slice(2)}</p></li>`).join("")}</ul>`;
      }
      if (block.match(/^\d+\. /m)) {
        const items = block.split("\n").filter((l) => l.match(/^\d+\. /));
        return `<ol>${items.map((l) => `<li><p>${l.replace(/^\d+\. /, "")}</p></li>`).join("")}</ol>`;
      }
      const lines = block.split("\n").join("<br>");
      return `<p>${lines}</p>`;
    })
    .join("\n");
}

// ── Upload image ──────────────────────────────────────────────────────────────

async function uploadImageToStorage(
  file: File,
  ticketId: string
): Promise<string | null> {
  const supabase = createClient();
  const path = `${ticketId}/${crypto.randomUUID()}-${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from("ticket-attachments")
    .upload(path, file, { contentType: file.type });

  if (uploadError) {
    console.error("[RichTextEditor] upload error:", uploadError);
    return null;
  }

  // Enregistrer dans ticket_attachments
  await supabase.from("ticket_attachments").insert({
    ticket_id: ticketId,
    storage_path: path,
    nom_fichier: file.name,
    taille_octets: file.size,
    type_mime: file.type,
    uploaded_by: (await supabase.auth.getUser()).data.user?.id,
  });

  // URL signée longue durée (24h) pour l'affichage dans l'éditeur
  const { data: signed } = await supabase.storage
    .from("ticket-attachments")
    .createSignedUrl(path, 86400);

  return signed?.signedUrl ?? null;
}

// ── Toolbar ───────────────────────────────────────────────────────────────────

function ToolbarButton({
  onClick,
  active,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className={cn(
            "p-1.5 rounded transition-colors",
            active
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

// ── Éditeur principal ─────────────────────────────────────────────────────────

export function RichTextEditor({
  ticketId,
  valeurInitiale,
  onChange,
  placeholder = "Ajouter une description…",
  className,
}: {
  ticketId: string;
  valeurInitiale: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder }),
    ],
    content: markdownToHtml(valeurInitiale),
    onUpdate: ({ editor }) => {
      onChange(htmlToMarkdown(editor.getHTML()));
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm dark:prose-invert max-w-none min-h-[120px] p-3 focus:outline-none",
          "[&_img]:max-w-full [&_img]:rounded-md [&_img]:my-2",
          "[&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5"
        ),
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;

        for (const item of Array.from(items)) {
          if (item.type.startsWith("image/")) {
            event.preventDefault();
            const file = item.getAsFile();
            if (!file) continue;

            // Upload async et insertion dans l'éditeur
            uploadImageToStorage(file, ticketId).then((url) => {
              if (!url) return;
              editor?.chain().focus().setImage({ src: url, alt: file.name }).run();
            });
            return true;
          }
        }
        return false;
      },
    },
    immediatelyRender: false,
  });

  // Sync si valeurInitiale change de l'extérieur (ex: reset après save)
  useEffect(() => {
    if (!editor) return;
    const currentHtml = editor.getHTML();
    const newHtml = markdownToHtml(valeurInitiale);
    if (currentHtml !== newHtml) {
      editor.commands.setContent(newHtml);
    }
  }, [valeurInitiale, editor]);

  const insertImageFromFile = useCallback(async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const url = await uploadImageToStorage(file, ticketId);
      if (url) editor?.chain().focus().setImage({ src: url, alt: file.name }).run();
    };
    input.click();
  }, [editor, ticketId]);

  if (!editor) return null;

  return (
    <div className={cn("rounded-md border bg-background", className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 border-b px-2 py-1">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          label="Gras (Ctrl+B)"
        >
          <Bold className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          label="Italique (Ctrl+I)"
        >
          <Italic className="size-3.5" />
        </ToolbarButton>
        <div className="w-px h-4 bg-border mx-1" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          label="Liste à puces"
        >
          <List className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          label="Liste numérotée"
        >
          <ListOrdered className="size-3.5" />
        </ToolbarButton>
        <div className="w-px h-4 bg-border mx-1" />
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          label="Séparateur"
        >
          <Minus className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={insertImageFromFile} label="Insérer une image">
          <ImageIcon className="size-3.5" />
        </ToolbarButton>
      </div>

      {/* Contenu éditeur */}
      <EditorContent editor={editor} />

      <p className="px-3 pb-2 text-xs text-muted-foreground">
        Ctrl+Entrée pour sauvegarder · Coller une image pour l&apos;uploader
      </p>
    </div>
  );
}
