"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { useCallback } from "react";
import { marked } from "marked";
import TurndownService from "turndown";
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
 * - Upload image par coller (Ctrl+V) ou bouton : upload vers Supabase Storage → insertion inline
 * - Stockage en markdown via marked (md→html) + turndown (html→md)
 *
 * Principe de fonctionnement du curseur :
 * Le composant est « non-contrôlé » du point de vue de React après le montage.
 * On ne re-synchronise JAMAIS le contenu depuis l'extérieur pendant l'édition
 * (plus de useEffect sur valeurInitiale) — Tiptap gère son propre état interne
 * et appelle onChange à chaque update. Le parent (InlineEditField) stocke le
 * brouillon dans son propre état ; on passe valeurInitiale uniquement au montage
 * via la prop `content` de useEditor.
 *
 * Pour forcer un remount propre (ex : ouverture d'édition), l'appelant doit
 * fournir une `key` différente (voir InlineEditField).
 */

// ── Conversion Markdown ↔ HTML via marked + turndown ─────────────────────────

const turndown = new TurndownService({
  headingStyle: "atx",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
});

// Règle custom pour les images : préserver le src et l'alt
turndown.addRule("images", {
  filter: "img",
  replacement: (_content, node) => {
    const el = node as HTMLImageElement;
    const alt = el.getAttribute("alt") ?? "";
    const src = el.getAttribute("src") ?? "";
    return src ? `![${alt}](${src})` : "";
  },
});

function htmlToMarkdown(html: string): string {
  if (!html || html === "<p></p>") return "";
  return turndown.turndown(html).trim();
}

function markdownToHtml(md: string): string {
  if (!md) return "";
  // marked.parse retourne string | Promise<string> selon la config.
  // En mode synchrone (par défaut sans async:true) c'est toujours string.
  const result = marked.parse(md, { async: false });
  return result as string;
}

// ── Upload image ──────────────────────────────────────────────────────────────

async function uploadImageToStorage(
  file: File,
  ticketId: string
): Promise<string | null> {
  // À la création, on stocke en base64 temporaire dans l'éditeur.
  // L'action de création prend en charge le déplacement vers le vrai ticketId.
  if (ticketId === "__creation__") {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }

  const supabase = createClient();
  const path = `${ticketId}/${crypto.randomUUID()}-${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from("ticket-attachments")
    .upload(path, file, { contentType: file.type });

  if (uploadError) {
    console.error("[RichTextEditor] upload error:", uploadError);
    return null;
  }

  await supabase.from("ticket_attachments").insert({
    ticket_id: ticketId,
    storage_path: path,
    nom_fichier: file.name,
    taille_octets: file.size,
    type_mime: file.type,
    uploaded_by: (await supabase.auth.getUser()).data.user?.id,
  });

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
      Image.configure({ inline: false, allowBase64: true }),
      Placeholder.configure({ placeholder }),
    ],
    // Contenu chargé une seule fois au montage — jamais re-synchronisé depuis
    // l'extérieur pendant la session d'édition (évite le bug de curseur).
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
