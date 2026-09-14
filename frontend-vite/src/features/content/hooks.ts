import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { getContentTree } from "@/server/classrooms/content/queries";
import { getClassroomHeader } from "./api";

export function useClassroomHeader(role: "teacher" | "student", classroomId: number) {
  return useQuery({
    queryKey: queryKeys.classroomHeader(role, classroomId),
    queryFn: () => getClassroomHeader(supabase, classroomId),
    enabled: Number.isFinite(classroomId),
  });
}

/** Fase 2/3: solo lectura (vista de materiales) -- edición de contenido (crear/editar/borrar
 * módulo/lección/recurso) queda deferida, ver AUDIT/reporte final. */
export function useContentTree(classroomId: number) {
  return useQuery({
    queryKey: queryKeys.contentTree(classroomId),
    queryFn: () => getContentTree(supabase, classroomId),
    enabled: Number.isFinite(classroomId),
  });
}
