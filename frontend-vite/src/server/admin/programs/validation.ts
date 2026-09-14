import { z } from "zod";

export const programSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  description: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});
export type ProgramInput = z.infer<typeof programSchema>;
