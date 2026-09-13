"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { programSchema, type ProgramInput } from "./validation";

export type ProgramFieldErrors = Partial<Record<keyof ProgramInput, string>>;
export type ProgramActionState = { error?: string; fieldErrors?: ProgramFieldErrors };

function parseProgramForm(formData: FormData) {
  return programSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });
}

function fieldErrorsFrom(issues: { path: (string | number)[]; message: string }[]): ProgramFieldErrors {
  const fieldErrors: ProgramFieldErrors = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (typeof key === "string") fieldErrors[key as keyof ProgramFieldErrors] = issue.message;
  }
  return fieldErrors;
}

/** RLS (programs_admin_write, 0003) ya autoriza a admin sin necesidad de RPC -- no hay ningún
 * invariante multi-fila que proteger al crear/editar un programa. */
export async function createProgramAction(formData: FormData): Promise<ProgramActionState> {
  await requireRole("admin");

  const parsed = parseProgramForm(formData);
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  const supabase = createClient();
  const { error } = await supabase.from("programs").insert(parsed.data);

  if (error) {
    return { error: "No pudimos crear el programa. Inténtalo de nuevo en unos minutos." };
  }

  revalidatePath("/admin/salones");
  return {};
}

export async function updateProgramAction(programId: number, formData: FormData): Promise<ProgramActionState> {
  await requireRole("admin");

  const parsed = parseProgramForm(formData);
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  const supabase = createClient();
  const { error } = await supabase.from("programs").update(parsed.data).eq("id", programId);

  if (error) {
    return { error: "No pudimos guardar los cambios. Inténtalo de nuevo en unos minutos." };
  }

  revalidatePath("/admin/salones");
  return {};
}

export type SetProgramActiveActionState = { error?: string };

export async function setProgramActiveAction(programId: number, isActive: boolean): Promise<SetProgramActiveActionState> {
  await requireRole("admin");

  const supabase = createClient();
  const { error } = await supabase.from("programs").update({ is_active: isActive }).eq("id", programId);

  if (error) {
    return { error: "No pudimos actualizar el estado del programa. Inténtalo de nuevo en unos minutos." };
  }

  revalidatePath("/admin/salones");
  return {};
}
