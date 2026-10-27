import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { useAuth } from "@/auth/useAuth";
import { reportSchema, type ReportInput } from "@/server/classroomReports/validation";
import type { ReportItem } from "@/server/classroomReports/types";

export type ReportFieldErrors = Partial<Record<keyof ReportInput, string>>;

function parseInput(input: ReportInput) {
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: ReportFieldErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key as keyof ReportInput]) fieldErrors[key as keyof ReportInput] = issue.message;
    }
    throw { fieldErrors } as { fieldErrors: ReportFieldErrors };
  }
  return parsed.data;
}

/** Mensaje para el docente: causa conocida en español, y siempre el detalle técnico para poder reportarlo. */
function saveError(error: { code?: string; message: string }) {
  console.error("[classroom_reports] save failed", error);
  const detail = `Detalle: ${error.message}${error.code ? ` (código ${error.code})` : ""}`;
  if (error.code === "42501") return new Error(`No tienes permiso para guardar reportes en este salón. Verifica que sigas asignado y que el salón esté activo. ${detail}`);
  if (error.code === "23514") return new Error(`El reporte no cumple las reglas: necesita al menos un texto y máximo 5000 caracteres por campo. ${detail}`);
  return new Error(`No pudimos guardar el reporte. ${detail}`);
}

/** RLS (0051): docentes/admin ven todo; el estudiante solo los publicados. */
export function useClassroomReports(classroomId: number) {
  return useQuery({
    queryKey: queryKeys.classroomReports(classroomId),
    queryFn: async (): Promise<ReportItem[]> => {
      const { data, error } = await supabase.from("classroom_reports").select("*").eq("classroom_id", classroomId).order("created_at", { ascending: false });
      if (error) throw new Error("No pudimos cargar los reportes.");
      return data.map((r) => ({
        id: r.id,
        classroomId: r.classroom_id,
        title: r.title,
        summary: r.summary,
        skills: { speaking: r.speaking_comment, writing: r.writing_comment, listening: r.listening_comment, reading: r.reading_comment },
        comments: r.comments,
        published: r.published,
        publishedAt: r.published_at,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
    },
    enabled: Number.isFinite(classroomId),
  });
}

export function useSaveReport(classroomId: number) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, input, published }: { id?: number; input: ReportInput; published: boolean }) => {
      const data = parseInput(input);
      if (id !== undefined) {
        const { error } = await supabase.from("classroom_reports").update({ ...data, published }).eq("id", id);
        if (error) throw saveError(error);
        return;
      }
      if (!user) throw new Error("Tu sesión expiró. Vuelve a iniciar sesión.");
      const { error } = await supabase.from("classroom_reports").insert({ ...data, classroom_id: classroomId, author_id: user.id, published });
      if (error) throw saveError(error);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.classroomReports(classroomId) }),
  });
}

export function useSetReportPublished(classroomId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, published }: { id: number; published: boolean }) => {
      const { error } = await supabase.from("classroom_reports").update({ published }).eq("id", id);
      if (error) throw new Error("No pudimos actualizar el reporte. Inténtalo de nuevo en unos minutos.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.classroomReports(classroomId) }),
  });
}

export function useDeleteReport(classroomId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("classroom_reports").delete().eq("id", id);
      if (error) throw new Error("No pudimos eliminar el reporte. Inténtalo de nuevo en unos minutos.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.classroomReports(classroomId) }),
  });
}
