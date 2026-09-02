"use server";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Après la création d'un ticket, la description peut contenir des images
 * encodées en base64 (insérées via copier-coller dans le RichTextEditor
 * pendant la saisie, où ticketId = "__creation__").
 *
 * Cette fonction :
 * 1. Détecte les src `data:image/...;base64,...` dans la description markdown
 * 2. Upload chaque image dans Supabase Storage sous `ticketId/`
 * 3. Enregistre le fichier dans `ticket_attachments`
 * 4. Remplace le base64 par l'URL signée dans la description
 * 5. Met à jour le ticket avec la description corrigée
 *
 * Utilise le service role pour bypasser RLS (le ticket vient d'être créé,
 * le client n'a pas encore de session en cours côté server action).
 *
 * Best-effort : si une image échoue à l'upload, elle reste en base64 dans
 * la description (visible dans l'éditeur, mais volumineuse). On log l'erreur
 * sans bloquer la création du ticket.
 */
export async function migrateBase64ImagesToStorage({
  ticketId,
  description,
  uploadedBy,
}: {
  ticketId: string;
  description: string;
  uploadedBy: string;
}): Promise<string> {
  // Regex pour trouver les images base64 dans la syntaxe markdown : ![alt](data:image/...;base64,...)
  const base64Regex = /!\[([^\]]*)\]\((data:image\/([^;]+);base64,[^)]+)\)/g;

  const matches = [...description.matchAll(base64Regex)];
  if (matches.length === 0) return description;

  const supabase = createAdminClient();
  let updatedDescription = description;

  for (const match of matches) {
    const [fullMatch, alt, dataUrl, mimeSubtype] = match;
    try {
      // Convertir le dataUrl en Buffer
      const base64Data = dataUrl.split(",")[1];
      const buffer = Buffer.from(base64Data, "base64");
      const mimeType = `image/${mimeSubtype}`;
      const extension = mimeSubtype === "jpeg" ? "jpg" : mimeSubtype;
      const filename = `pasted-image-${Date.now()}.${extension}`;
      const path = `${ticketId}/${crypto.randomUUID()}-${filename}`;

      const { error: uploadError } = await supabase.storage
        .from("ticket-attachments")
        .upload(path, buffer, { contentType: mimeType });

      if (uploadError) {
        console.error("[migrateBase64Images] upload error:", uploadError.message);
        continue;
      }

      await supabase.from("ticket_attachments").insert({
        ticket_id: ticketId,
        storage_path: path,
        nom_fichier: filename,
        taille_octets: buffer.length,
        type_mime: mimeType,
        uploaded_by: uploadedBy,
      });

      const { data: signed } = await supabase.storage
        .from("ticket-attachments")
        .createSignedUrl(path, 86400);

      if (!signed?.signedUrl) {
        console.error("[migrateBase64Images] impossible de générer l'URL signée pour", path);
        continue;
      }

      updatedDescription = updatedDescription.replace(
        fullMatch,
        `![${alt}](${signed.signedUrl})`
      );
    } catch (err) {
      console.error("[migrateBase64Images] erreur inattendue:", err);
    }
  }

  return updatedDescription;
}
