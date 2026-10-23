import { z } from "zod";

const optionalText = z
  .string()
  .max(5000, "Máximo 5000 caracteres")
  .optional()
  .transform((v) => (v && v.trim().length > 0 ? v.trim() : null));

/** Un reporte necesita título y al menos un texto (resumen, comentario de skill o comentarios finales). */
export const reportSchema = z
  .object({
    title: z.string().trim().min(1, "Ponle un título al reporte"),
    summary: optionalText,
    speaking_comment: optionalText,
    writing_comment: optionalText,
    listening_comment: optionalText,
    reading_comment: optionalText,
    comments: optionalText,
  })
  .refine((v) => [v.summary, v.speaking_comment, v.writing_comment, v.listening_comment, v.reading_comment, v.comments].some(Boolean), {
    path: ["summary"],
    message: "Escribe al menos un comentario antes de guardar",
  });

export type ReportInput = z.input<typeof reportSchema>;
