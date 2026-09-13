import { z } from "zod";
import { isValidResourceUrl } from "@/lib/resources/providers";

export const moduleSchema = z.object({
  title: z.string().trim().min(1, "El título es obligatorio"),
  description: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});
export type ModuleInput = z.infer<typeof moduleSchema>;

export const lessonSchema = z.object({
  title: z.string().trim().min(1, "El título es obligatorio"),
  description: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});
export type LessonInput = z.infer<typeof lessonSchema>;

/**
 * Único schema para crear/editar un recurso: título + URL. `type` NUNCA se acepta como input del
 * cliente -- lo deriva el servidor a partir de `reference` (ver `detectKnownProvider` en
 * actions.ts). Esto es además una medida de seguridad: el cliente no puede afirmar un `type`
 * arbitrario para forzar cómo se renderiza su propio recurso.
 */
export const resourceSchema = z.object({
  title: z.string().trim().min(1, "El título es obligatorio"),
  // isValidResourceUrl (no z.string().url()): rechaza explícitamente javascript:/data:/otros
  // esquemas peligrosos y exige https en producción -- z.url() por sí solo no restringe esquema.
  reference: z.string().trim().refine(isValidResourceUrl, "Ingresa una URL válida (https://…)"),
});
export type ResourceInput = z.infer<typeof resourceSchema>;
