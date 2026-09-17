import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { getContentTree } from "@/server/classrooms/content/queries";
import { moduleSchema, lessonSchema, resourceSchema, type ModuleInput, type LessonInput, type ResourceInput } from "@/server/classrooms/content/validation";
import { detectKnownProvider } from "@/lib/resources/providers";
import type { ContentStatus } from "@/server/classrooms/content/types";
import { getClassroomHeader } from "./api";

export function useClassroomHeader(role: "teacher" | "student", classroomId: number) {
  return useQuery({
    queryKey: queryKeys.classroomHeader(role, classroomId),
    queryFn: () => getClassroomHeader(supabase, classroomId),
    enabled: Number.isFinite(classroomId),
  });
}

/**
 * Una sola query sirve a los tres roles -- RLS (0016) decide qué ve cada uno (admin/docente del
 * salón ven todo incluido borrador, estudiante solo lo publicado), esta query nunca vuelve a
 * decidir eso. Por eso una sola queryKey (por classroomId, sin distinguir rol) alcanza para
 * invalidar tras cualquier mutación de abajo.
 */
export function useContentTree(classroomId: number) {
  return useQuery({
    queryKey: queryKeys.contentTree(classroomId),
    queryFn: () => getContentTree(supabase, classroomId),
    enabled: Number.isFinite(classroomId),
  });
}

export type ModuleFieldErrors = Partial<Record<keyof ModuleInput, string>>;
export type LessonFieldErrors = Partial<Record<keyof LessonInput, string>>;
export type ResourceFieldErrors = Partial<Record<keyof ResourceInput, string>>;

function invalidateContentTree(queryClient: ReturnType<typeof useQueryClient>, classroomId: number) {
  queryClient.invalidateQueries({ queryKey: queryKeys.contentTree(classroomId) });
}

function fieldErrorsFrom<T extends string>(issues: { path: (string | number)[]; message: string }[]): Partial<Record<T, string>> {
  const fieldErrors: Partial<Record<T, string>> = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (typeof key === "string") fieldErrors[key as T] = issue.message;
  }
  return fieldErrors;
}

function parseModuleInput(input: ModuleInput) {
  const parsed = moduleSchema.safeParse(input);
  if (!parsed.success) throw { fieldErrors: fieldErrorsFrom<keyof ModuleInput>(parsed.error.issues) } as { fieldErrors: ModuleFieldErrors };
  return parsed.data;
}

function parseLessonInput(input: LessonInput) {
  const parsed = lessonSchema.safeParse(input);
  if (!parsed.success) throw { fieldErrors: fieldErrorsFrom<keyof LessonInput>(parsed.error.issues) } as { fieldErrors: LessonFieldErrors };
  return parsed.data;
}

function parseResourceInput(input: ResourceInput) {
  const parsed = resourceSchema.safeParse(input);
  if (!parsed.success) throw { fieldErrors: fieldErrorsFrom<keyof ResourceInput>(parsed.error.issues) } as { fieldErrors: ResourceFieldErrors };
  return parsed.data;
}

// ================================================================================================
// Módulos -- RLS: modules_admin_write (0005) OR modules_teacher_write (0016), browser-direct.
// ================================================================================================

export function useCreateModule(classroomId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ModuleInput) => {
      const data = parseModuleInput(input);
      const { data: last } = await supabase
        .from("modules")
        .select("order_index")
        .eq("classroom_id", classroomId)
        .order("order_index", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { error } = await supabase
        .from("modules")
        .insert({ ...data, classroom_id: classroomId, order_index: last ? last.order_index + 1 : 0 });
      if (error) throw new Error("No pudimos crear el módulo. Inténtalo de nuevo en unos minutos.");
    },
    onSuccess: () => invalidateContentTree(queryClient, classroomId),
  });
}

export function useUpdateModule(classroomId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ moduleId, input }: { moduleId: number; input: ModuleInput }) => {
      const data = parseModuleInput(input);
      const { error } = await supabase.from("modules").update(data).eq("id", moduleId);
      if (error) throw new Error("No pudimos guardar los cambios. Inténtalo de nuevo en unos minutos.");
    },
    onSuccess: () => invalidateContentTree(queryClient, classroomId),
  });
}

export function useSetModuleStatus(classroomId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ moduleId, status }: { moduleId: number; status: ContentStatus }) => {
      const { error } = await supabase.from("modules").update({ status }).eq("id", moduleId);
      if (error) throw new Error("No pudimos actualizar el estado del módulo. Inténtalo de nuevo en unos minutos.");
    },
    onSuccess: () => invalidateContentTree(queryClient, classroomId),
  });
}

/** Cascada real en DB (0005: lessons/resources on delete cascade) -- no hace falta borrar hijos a
 * mano. Sin limpieza de Storage (a diferencia de Next): esta arquitectura no sube PDFs. */
export function useDeleteModule(classroomId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (moduleId: number) => {
      const { error } = await supabase.from("modules").delete().eq("id", moduleId);
      if (error) throw new Error("No pudimos borrar el módulo. Inténtalo de nuevo en unos minutos.");
    },
    onSuccess: () => invalidateContentTree(queryClient, classroomId),
  });
}

// ================================================================================================
// Lecciones -- RLS: lessons_admin_write (0005) OR lessons_teacher_write (0016).
// ================================================================================================

export function useCreateLesson(classroomId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ moduleId, input }: { moduleId: number; input: LessonInput }) => {
      const data = parseLessonInput(input);
      const { data: last } = await supabase
        .from("lessons")
        .select("order_index")
        .eq("module_id", moduleId)
        .order("order_index", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { error } = await supabase
        .from("lessons")
        .insert({ ...data, module_id: moduleId, order_index: last ? last.order_index + 1 : 0 });
      if (error) throw new Error("No pudimos crear la lección. Inténtalo de nuevo en unos minutos.");
    },
    onSuccess: () => invalidateContentTree(queryClient, classroomId),
  });
}

export function useUpdateLesson(classroomId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ lessonId, input }: { lessonId: number; input: LessonInput }) => {
      const data = parseLessonInput(input);
      const { error } = await supabase.from("lessons").update(data).eq("id", lessonId);
      if (error) throw new Error("No pudimos guardar los cambios. Inténtalo de nuevo en unos minutos.");
    },
    onSuccess: () => invalidateContentTree(queryClient, classroomId),
  });
}

export function useSetLessonStatus(classroomId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ lessonId, status }: { lessonId: number; status: ContentStatus }) => {
      const { error } = await supabase.from("lessons").update({ status }).eq("id", lessonId);
      if (error) throw new Error("No pudimos actualizar el estado de la lección. Inténtalo de nuevo en unos minutos.");
    },
    onSuccess: () => invalidateContentTree(queryClient, classroomId),
  });
}

export function useDeleteLesson(classroomId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (lessonId: number) => {
      const { error } = await supabase.from("lessons").delete().eq("id", lessonId);
      if (error) throw new Error("No pudimos borrar la lección. Inténtalo de nuevo en unos minutos.");
    },
    onSuccess: () => invalidateContentTree(queryClient, classroomId),
  });
}

// ================================================================================================
// Recursos -- RLS: resources_admin_write (0005) OR resources_teacher_write (0016).
// ================================================================================================

/** `type` NUNCA viene del cliente: se deriva acá con detectKnownProvider (reutilizado tal cual de
 * ResourceRenderer/CourseViewer) -- si la URL no matchea ninguno de los 5 proveedores conocidos
 * (YouTube/Vimeo/Drive/Docs/Slides), el recurso queda como `type: "url"` (tarjeta + "Abrir
 * recurso" en el estudiante). Nunca `pdf` ni `embed`: esta arquitectura no ofrece esas opciones en
 * el formulario -- ver AssignableResourceType en types.ts. */
function deriveResourceType(reference: string) {
  return detectKnownProvider(reference)?.type ?? "url";
}

export function useCreateResource(classroomId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ lessonId, input }: { lessonId: number; input: ResourceInput }) => {
      const data = parseResourceInput(input);
      const type = deriveResourceType(data.reference);
      const { data: last } = await supabase
        .from("resources")
        .select("order_index")
        .eq("lesson_id", lessonId)
        .order("order_index", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { error } = await supabase
        .from("resources")
        .insert({ ...data, type, lesson_id: lessonId, order_index: last ? last.order_index + 1 : 0 });
      if (error) throw new Error("No pudimos crear el recurso. Inténtalo de nuevo en unos minutos.");
    },
    onSuccess: () => invalidateContentTree(queryClient, classroomId),
  });
}

/** `type` se recalcula siempre a partir de la URL final -- soporta cambiar de un proveedor a otro
 * (ej. YouTube -> Drive) o a una URL genérica en la misma edición, igual que en Next. */
export function useUpdateResource(classroomId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ resourceId, input }: { resourceId: number; input: ResourceInput }) => {
      const data = parseResourceInput(input);
      const type = deriveResourceType(data.reference);
      const { error } = await supabase.from("resources").update({ ...data, type }).eq("id", resourceId);
      if (error) throw new Error("No pudimos guardar los cambios. Inténtalo de nuevo en unos minutos.");
    },
    onSuccess: () => invalidateContentTree(queryClient, classroomId),
  });
}

export function useDeleteResource(classroomId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (resourceId: number) => {
      const { error } = await supabase.from("resources").delete().eq("id", resourceId);
      if (error) throw new Error("No pudimos borrar el recurso. Inténtalo de nuevo en unos minutos.");
    },
    onSuccess: () => invalidateContentTree(queryClient, classroomId),
  });
}
