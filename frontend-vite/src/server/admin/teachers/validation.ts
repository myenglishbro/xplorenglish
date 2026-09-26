import { z } from "zod";
import { isValidResourceUrl } from "@/lib/resources/providers";

/** Mismo criterio que institutionalDocumentSchema/resourceSchema: isValidResourceUrl en vez de
 * z.string().url() (rechaza javascript:/data:/otros esquemas peligrosos, exige https en
 * producción), más un hostname allowlist propio de este campo (FIX 2, segunda etapa) -- Xplore
 * solo guarda y abre esta URL, nunca la resuelve contra la API de Drive. */
function isGoogleDriveUrl(raw: string): boolean {
  if (!isValidResourceUrl(raw)) return false;
  try {
    const hostname = new URL(raw.trim()).hostname.toLowerCase();
    return hostname === "drive.google.com" || hostname === "www.drive.google.com";
  } catch {
    return false;
  }
}

export const updateTeacherProfileSchema = z.object({
  hourlyRate: z.coerce.number({ invalid_type_error: "Ingresa una tarifa válida." }).min(0, "La tarifa no puede ser negativa."),
  // "" del textarea significa "sin bio" -- se traduce a null, igual criterio que program_id en
  // server/admin/users/validation.ts.
  bio: z
    .string()
    .trim()
    .max(2000, "Máximo 2000 caracteres.")
    .transform((v) => (v.length > 0 ? v : null))
    .nullable(),
  status: z.enum(["active", "inactive"], { errorMap: () => ({ message: "Estado inválido." }) }),
  // "" del input significa "sin carpeta configurada" -- se traduce a null, mismo criterio que bio.
  receiptDriveUrl: z
    .string()
    .trim()
    .transform((v) => (v.length > 0 ? v : null))
    .nullable()
    .refine((v) => v === null || isGoogleDriveUrl(v), "Ingresa un enlace válido de Google Drive (https://drive.google.com/…)."),
});

export type UpdateTeacherProfileInput = z.infer<typeof updateTeacherProfileSchema>;
