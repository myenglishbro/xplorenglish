import { z } from "zod";
import { isValidResourceUrl } from "@/lib/resources/providers";

/** Mismo criterio que resourceSchema (server/classrooms/content/validation.ts): isValidResourceUrl
 * en vez de z.string().url() -- rechaza explícitamente javascript:/data:/otros esquemas peligrosos
 * y exige https en producción. */
export const institutionalDocumentSchema = z.object({
  title: z.string().trim().min(1, "El título es obligatorio"),
  url: z.string().trim().refine(isValidResourceUrl, "Ingresa una URL válida (https://…)"),
  isPublished: z.boolean(),
});
export type InstitutionalDocumentInput = z.infer<typeof institutionalDocumentSchema>;
