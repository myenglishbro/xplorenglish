import { z } from "zod";
import { isValidResourceUrl } from "@/lib/resources/providers";

/** Portado de src/server/classrooms/content/validation.ts (Next) -- mismas reglas exactas. */
export const moduleSchema = z.object({
  title: z.string().trim().min(1, "El título es obligatorio"),
  description: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});
/** Forma cruda que envía la UI (antes de que el schema transforme "" -> null) -- z.input, no
 * z.infer, a propósito: z.infer daría el tipo de SALIDA (`description: string | null`), pero lo
 * que en verdad recibe cada hook desde el formulario es `description` opcional sin transformar. */
export type ModuleInput = z.input<typeof moduleSchema>;

export const lessonSchema = z.object({
  title: z.string().trim().min(1, "El título es obligatorio"),
  description: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});
export type LessonInput = z.input<typeof lessonSchema>;

/**
 * Único schema para crear/editar un recurso: título + URL. `type` NUNCA se acepta como input del
 * cliente -- lo deriva el hook a partir de `reference` (ver `detectKnownProvider`, reutilizado tal
 * cual). Mismo criterio de seguridad que en Next: el cliente no puede afirmar un `type` arbitrario
 * para forzar cómo se renderiza su propio recurso.
 */
export const resourceSchema = z.object({
  title: z.string().trim().min(1, "El título es obligatorio"),
  // isValidResourceUrl (no z.string().url()): rechaza explícitamente javascript:/data:/otros
  // esquemas peligrosos y exige https en producción.
  reference: z.string().trim().refine(isValidResourceUrl, "Ingresa una URL válida (https://…)"),
});
export type ResourceInput = z.infer<typeof resourceSchema>;
