"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { removeMaterials } from "@/lib/storage/materials";
import { moduleSchema, lessonSchema, resourceSchema, type ModuleInput, type LessonInput } from "./validation";
import { detectKnownProvider } from "@/lib/resources/providers";
import type { ContentStatus, LessonItem, ModuleItem, ResourceItem } from "./types";

export type ModuleFieldErrors = Partial<Record<keyof ModuleInput, string>>;
export type LessonFieldErrors = Partial<Record<keyof LessonInput, string>>;
export type ResourceFieldErrors = Partial<Record<"title" | "reference", string>>;

/**
 * `data` es el registro canónico que devuelve la DB tras un insert/update -- lo necesitan los
 * callers que reconcilian estado optimista contra la respuesta real (create/update de módulo y
 * lección). setModuleStatusAction/setLessonStatusAction y los deletes siguen devolviendo
 * ContentActionState sin type param (equivalente a `data?: never`): el cliente ya conoce el valor
 * que pidió, solo necesita éxito/error para confirmar o hacer rollback.
 */
export type ContentActionState<T = never> = { error?: string; fieldErrors?: Record<string, string>; data?: T };

/**
 * Estas acciones sirven tanto a admin como a docente -- a diferencia del resto del código, que
 * casi siempre usa requireRole("admin"), aquí NO se puede fijar un solo rol. El pre-check acota a
 * "admin o docente" como fast-fail amigable; cuál salón concreto puede tocar cada docente lo
 * decide únicamente RLS (modules_teacher_write/lessons_teacher_write/resources_teacher_write,
 * 0016) -- un docente que intente esto sobre un salón ajeno recibe el mismo error genérico que
 * cualquier fallo de base de datos, nunca una distinción que revele si el salón existe.
 */
async function requireContentEditor(): Promise<{ error: string } | null> {
  console.log("[perf][requireContentEditor] -> requireProfile");
  const profile = await requireProfile();
  if (profile.role !== "admin" && profile.role !== "teacher") {
    return { error: "No tienes permisos para gestionar contenido." };
  }
  return null;
}

function revalidateContentPaths(classroomId: number) {
  revalidatePath(`/admin/salones/${classroomId}/contenido`);
  revalidatePath(`/teacher/salones/${classroomId}`);
  revalidatePath(`/student/salones/${classroomId}`);
}

function fieldErrorsFrom(issues: { path: (string | number)[]; message: string }[]): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (typeof key === "string") fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

// ================================================================================================
// Módulos
// ================================================================================================

/** Igual criterio que createLessonAction: devuelve el registro canónico (id/order_index reales)
 * para reconciliar el módulo optimista. `lessons: []` siempre es correcto acá -- un módulo recién
 * creado nunca puede tener lecciones todavía. */
export async function createModuleAction(classroomId: number, formData: FormData): Promise<ContentActionState<ModuleItem>> {
  const gate = await requireContentEditor();
  if (gate) return gate;

  const parsed = moduleSchema.safeParse({ title: formData.get("title"), description: formData.get("description") });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  const supabase = createClient();
  const { data: last } = await supabase
    .from("modules")
    .select("order_index")
    .eq("classroom_id", classroomId)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: inserted, error } = await supabase
    .from("modules")
    .insert({ ...parsed.data, classroom_id: classroomId, order_index: last ? last.order_index + 1 : 0 })
    .select("id, classroom_id, title, description, status, order_index")
    .single();

  if (error || !inserted) return { error: "No pudimos crear el módulo. Inténtalo de nuevo en unos minutos." };

  revalidateContentPaths(classroomId);

  const moduleItem: ModuleItem = {
    id: inserted.id,
    classroomId: inserted.classroom_id,
    title: inserted.title,
    description: inserted.description,
    status: inserted.status as ContentStatus,
    orderIndex: inserted.order_index,
    lessons: [],
  };

  return { data: moduleItem };
}

/** Devuelve `{title, description}` tal como quedaron guardados -- reconciliación por si el
 * servidor normalizó algo (ej. trim) distinto de lo que ya se aplicó de forma optimista. */
export async function updateModuleAction(
  moduleId: number,
  classroomId: number,
  formData: FormData
): Promise<ContentActionState<{ title: string; description: string | null }>> {
  const gate = await requireContentEditor();
  if (gate) return gate;

  const parsed = moduleSchema.safeParse({ title: formData.get("title"), description: formData.get("description") });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  const supabase = createClient();
  const { data: updated, error } = await supabase
    .from("modules")
    .update(parsed.data)
    .eq("id", moduleId)
    .select("title, description")
    .single();
  if (error || !updated) return { error: "No pudimos guardar los cambios. Inténtalo de nuevo en unos minutos." };

  revalidateContentPaths(classroomId);
  return { data: updated };
}

export async function setModuleStatusAction(
  moduleId: number,
  classroomId: number,
  status: "draft" | "published"
): Promise<ContentActionState> {
  const gate = await requireContentEditor();
  if (gate) return gate;

  const supabase = createClient();
  const { error } = await supabase.from("modules").update({ status }).eq("id", moduleId);
  if (error) return { error: "No pudimos actualizar el estado del módulo." };

  revalidateContentPaths(classroomId);
  return {};
}

/** Borra el módulo (cascada: lecciones y recursos, 0005) y, antes, junta los paths de Storage de
 * cualquier recurso pdf bajo sus lecciones para limpiarlos después -- best-effort, no bloqueante
 * (ver removeMaterials). */
export async function deleteModuleAction(moduleId: number, classroomId: number): Promise<ContentActionState> {
  const gate = await requireContentEditor();
  if (gate) return gate;

  const supabase = createClient();
  const { data: lessons } = await supabase.from("lessons").select("id").eq("module_id", moduleId);
  const lessonIds = (lessons ?? []).map((l) => l.id);

  let pdfPaths: string[] = [];
  if (lessonIds.length > 0) {
    const { data: pdfResources } = await supabase
      .from("resources")
      .select("reference")
      .eq("type", "pdf")
      .in("lesson_id", lessonIds);
    pdfPaths = (pdfResources ?? []).map((r) => r.reference);
  }

  const { error } = await supabase.from("modules").delete().eq("id", moduleId);
  if (error) return { error: "No pudimos borrar el módulo. Inténtalo de nuevo en unos minutos." };

  await removeMaterials(supabase, pdfPaths);
  revalidateContentPaths(classroomId);
  return {};
}

// ================================================================================================
// Lecciones
// ================================================================================================

/**
 * Devuelve el registro canónico (`data: LessonItem`) para que el caller (ContentTree, UI
 * optimista) pueda reconciliar la lección temporal con la real -- id y order_index reales, que
 * el cliente no puede conocer de antemano. `resources: []` es correcto siempre acá: una lección
 * recién creada nunca puede tener recursos todavía.
 */
export async function createLessonAction(moduleId: number, classroomId: number, formData: FormData): Promise<ContentActionState<LessonItem>> {
  console.log("[perf][createLessonAction] START -> requireContentEditor");
  const __tAction0 = performance.now();
  const gate = await requireContentEditor();
  if (gate) return gate;

  const parsed = lessonSchema.safeParse({ title: formData.get("title"), description: formData.get("description") });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  const supabase = createClient();
  const __t0 = performance.now();
  const { data: last } = await supabase
    .from("lessons")
    .select("order_index")
    .eq("module_id", moduleId)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();
  console.log(`[perf] createLessonAction -> order_index lookup: ${(performance.now() - __t0).toFixed(1)}ms`);

  const __t1 = performance.now();
  const { data: inserted, error } = await supabase
    .from("lessons")
    .insert({ ...parsed.data, module_id: moduleId, order_index: last ? last.order_index + 1 : 0 })
    .select("id, module_id, title, description, status, order_index")
    .single();
  console.log(`[perf] createLessonAction -> insert: ${(performance.now() - __t1).toFixed(1)}ms`);
  console.log(`[perf] createLessonAction TOTAL (hasta antes de revalidatePath): ${(performance.now() - __tAction0).toFixed(1)}ms`);

  if (error || !inserted) return { error: "No pudimos crear la lección. Inténtalo de nuevo en unos minutos." };

  revalidateContentPaths(classroomId);

  const lesson: LessonItem = {
    id: inserted.id,
    moduleId: inserted.module_id,
    title: inserted.title,
    description: inserted.description,
    status: inserted.status as ContentStatus,
    orderIndex: inserted.order_index,
    resources: [],
  };

  return { data: lesson };
}

/** Mismo criterio que updateModuleAction: devuelve `{title, description}` tal como quedaron
 * guardados, para reconciliar el estado optimista con la respuesta real. */
export async function updateLessonAction(
  lessonId: number,
  classroomId: number,
  formData: FormData
): Promise<ContentActionState<{ title: string; description: string | null }>> {
  const gate = await requireContentEditor();
  if (gate) return gate;

  const parsed = lessonSchema.safeParse({ title: formData.get("title"), description: formData.get("description") });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  const supabase = createClient();
  const { data: updated, error } = await supabase
    .from("lessons")
    .update(parsed.data)
    .eq("id", lessonId)
    .select("title, description")
    .single();
  if (error || !updated) return { error: "No pudimos guardar los cambios. Inténtalo de nuevo en unos minutos." };

  revalidateContentPaths(classroomId);
  return { data: updated };
}

export async function setLessonStatusAction(
  lessonId: number,
  classroomId: number,
  status: "draft" | "published"
): Promise<ContentActionState> {
  const gate = await requireContentEditor();
  if (gate) return gate;

  const supabase = createClient();
  const { error } = await supabase.from("lessons").update({ status }).eq("id", lessonId);
  if (error) return { error: "No pudimos actualizar el estado de la lección." };

  revalidateContentPaths(classroomId);
  return {};
}

export async function deleteLessonAction(lessonId: number, classroomId: number): Promise<ContentActionState> {
  const gate = await requireContentEditor();
  if (gate) return gate;

  const supabase = createClient();
  const { data: pdfResources } = await supabase.from("resources").select("reference").eq("type", "pdf").eq("lesson_id", lessonId);
  const pdfPaths = (pdfResources ?? []).map((r) => r.reference);

  const { error } = await supabase.from("lessons").delete().eq("id", lessonId);
  if (error) return { error: "No pudimos borrar la lección. Inténtalo de nuevo en unos minutos." };

  await removeMaterials(supabase, pdfPaths);
  revalidateContentPaths(classroomId);
  return {};
}

// ================================================================================================
// Recursos
// ================================================================================================

/**
 * `type` NUNCA viene del cliente: se deriva acá, a partir de `reference`, con `detectKnownProvider`
 * (único proveedor de verdad server-side). Si la URL no matchea ninguno de los proveedores
 * soportados, el recurso queda como `type: "url"` (tarjeta + "Abrir recurso" en el estudiante) --
 * nunca se intenta adivinar embebibilidad genérica.
 *
 * Devuelve el registro canónico (`data: ResourceItem`) -- igual criterio que createLessonAction --
 * para que el caller (ContentTree, UI optimista) reconcilie el recurso temporal con el real: id,
 * order_index y, sobre todo, `type` real (el cliente nunca lo conoce de antemano).
 */
export async function createResourceAction(lessonId: number, classroomId: number, formData: FormData): Promise<ContentActionState<ResourceItem>> {
  const gate = await requireContentEditor();
  if (gate) return gate;

  const parsed = resourceSchema.safeParse({ title: formData.get("title"), reference: formData.get("reference") });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  const type = detectKnownProvider(parsed.data.reference)?.type ?? "url";

  const supabase = createClient();
  const { data: last } = await supabase
    .from("resources")
    .select("order_index")
    .eq("lesson_id", lessonId)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: inserted, error } = await supabase
    .from("resources")
    .insert({ ...parsed.data, type, lesson_id: lessonId, order_index: last ? last.order_index + 1 : 0 })
    .select("id, lesson_id, title, type, reference, order_index")
    .single();

  if (error || !inserted) return { error: "No pudimos crear el recurso. Inténtalo de nuevo en unos minutos." };

  revalidateContentPaths(classroomId);

  const resource: ResourceItem = {
    id: inserted.id,
    lessonId: inserted.lesson_id,
    title: inserted.title,
    type: inserted.type,
    reference: inserted.reference,
    orderIndex: inserted.order_index,
  };

  return { data: resource };
}

/** Título y URL siempre editables (ya no hay un caso 'pdf' que lo impida). `type` se recalcula
 * server-side a partir de la URL nueva, igual que en la creación -- nunca se conserva el `type`
 * anterior ni se acepta uno enviado por el cliente. Soporta cambiar de un proveedor a otro (ej.
 * YouTube -> Drive) o a una URL genérica en la misma edición: el `type` devuelto siempre refleja
 * la URL final, nunca la anterior. */
export async function updateResourceAction(
  resourceId: number,
  classroomId: number,
  formData: FormData
): Promise<ContentActionState<ResourceItem>> {
  const gate = await requireContentEditor();
  if (gate) return gate;

  const parsed = resourceSchema.safeParse({ title: formData.get("title"), reference: formData.get("reference") });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  const type = detectKnownProvider(parsed.data.reference)?.type ?? "url";

  const supabase = createClient();
  const { data: updated, error } = await supabase
    .from("resources")
    .update({ ...parsed.data, type })
    .eq("id", resourceId)
    .select("id, lesson_id, title, type, reference, order_index")
    .single();
  if (error || !updated) return { error: "No pudimos guardar los cambios. Inténtalo de nuevo en unos minutos." };

  revalidateContentPaths(classroomId);

  const resource: ResourceItem = {
    id: updated.id,
    lessonId: updated.lesson_id,
    title: updated.title,
    type: updated.type,
    reference: updated.reference,
    orderIndex: updated.order_index,
  };

  return { data: resource };
}

export async function deleteResourceAction(resourceId: number, classroomId: number): Promise<ContentActionState> {
  const gate = await requireContentEditor();
  if (gate) return gate;

  const supabase = createClient();
  const { data: resource } = await supabase.from("resources").select("type, reference").eq("id", resourceId).maybeSingle();

  const { error } = await supabase.from("resources").delete().eq("id", resourceId);
  if (error) return { error: "No pudimos borrar el recurso. Inténtalo de nuevo en unos minutos." };

  if (resource?.type === "pdf") {
    await removeMaterials(supabase, [resource.reference]);
  }

  revalidateContentPaths(classroomId);
  return {};
}
