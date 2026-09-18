import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { listClassrooms, getClassroomDetail, listAssignableTeachers, listAssignableStudents } from "@/server/admin/classrooms/queries";
import { getTeacherAvailabilityByIds, getTeacherSkillNamesByIds } from "@/server/admin/teachers/queries";
import { classroomSchema, type ClassroomInput } from "@/server/admin/classrooms/validation";
import type { ClassroomListFilters } from "@/server/admin/classrooms/types";

export type ClassroomFieldErrors = Partial<Record<keyof ClassroomInput, string>>;

export function useClassrooms(filters: ClassroomListFilters) {
  return useQuery({
    queryKey: queryKeys.adminClassrooms(filters),
    queryFn: () => listClassrooms(supabase, filters),
  });
}

export function useClassroomDetail(id: number) {
  return useQuery({
    queryKey: queryKeys.adminClassroomDetail(id),
    queryFn: () => getClassroomDetail(supabase, id),
    enabled: Number.isFinite(id),
  });
}

export function useAssignableTeachers() {
  return useQuery({
    queryKey: queryKeys.adminAssignableTeachers(),
    queryFn: () => listAssignableTeachers(supabase),
  });
}

/**
 * Disponibilidad + niveles de un lote de docentes candidatos, para priorizar (AJUSTE 1) sin
 * bloquear: solo alimenta el ordenamiento/etiqueta del selector, RLS admin ya autoriza la lectura.
 */
export function useTeacherAvailabilityAndSkillsForIds(teacherIds: string[]) {
  const sortedIds = [...teacherIds].sort();
  return useQuery({
    queryKey: ["admin-teachers-availability-skills", sortedIds] as const,
    queryFn: async () => {
      const [availabilityByTeacher, skillsByTeacher] = await Promise.all([
        getTeacherAvailabilityByIds(supabase, sortedIds),
        getTeacherSkillNamesByIds(supabase, sortedIds),
      ]);
      return { availabilityByTeacher, skillsByTeacher };
    },
    enabled: sortedIds.length > 0,
  });
}

export function useAssignableStudents() {
  return useQuery({
    queryKey: queryKeys.adminAssignableStudents(),
    queryFn: () => listAssignableStudents(supabase),
  });
}

function invalidateClassroomQueries(queryClient: ReturnType<typeof useQueryClient>, classroomId?: number) {
  queryClient.invalidateQueries({ queryKey: ["admin-classrooms"] });
  // El Dashboard (Agenda semanal + alerta "salones sin profesor") también depende de
  // classrooms/classroom_teachers -- sin esto quedaría desactualizado hasta recargar.
  queryClient.invalidateQueries({ queryKey: queryKeys.adminDashboard() });
  if (classroomId !== undefined) {
    queryClient.invalidateQueries({ queryKey: queryKeys.adminClassroomDetail(classroomId) });
  }
}

function parseClassroomInput(input: ClassroomInput) {
  const parsed = classroomSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: ClassroomFieldErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string") fieldErrors[key as keyof ClassroomFieldErrors] = issue.message;
    }
    throw { fieldErrors } as { fieldErrors: ClassroomFieldErrors };
  }
  return parsed.data;
}

/** RLS (classrooms_admin_write, 0005) ya autoriza a admin -- browser-direct, sin RPC. */
export function useCreateClassroom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ClassroomInput) => {
      const data = parseClassroomInput(input);
      const { data: row, error } = await supabase.from("classrooms").insert(data).select("id").single();
      if (error) {
        if (error.code === "23503") throw { fieldErrors: { program_id: "El programa seleccionado no existe." } } as { fieldErrors: ClassroomFieldErrors };
        throw new Error("No pudimos crear el salón. Inténtalo de nuevo en unos minutos.");
      }
      return row.id as number;
    },
    onSuccess: () => invalidateClassroomQueries(queryClient),
  });
}

export function useUpdateClassroom(classroomId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ClassroomInput) => {
      const data = parseClassroomInput(input);
      const { error } = await supabase.from("classrooms").update(data).eq("id", classroomId);
      if (error) {
        if (error.code === "23503") throw { fieldErrors: { program_id: "El programa seleccionado no existe." } } as { fieldErrors: ClassroomFieldErrors };
        throw new Error("No pudimos guardar los cambios. Inténtalo de nuevo en unos minutos.");
      }
    },
    onSuccess: () => invalidateClassroomQueries(queryClient, classroomId),
  });
}

export function useSetClassroomStatus(classroomId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (status: "active" | "archived") => {
      const { error } = await supabase.from("classrooms").update({ status }).eq("id", classroomId);
      if (error) throw new Error("No pudimos actualizar el estado del salón. Inténtalo de nuevo en unos minutos.");
    },
    onSuccess: () => invalidateClassroomQueries(queryClient, classroomId),
  });
}

/**
 * classrooms.student_id (Slice A/F) -- un UPDATE directo, protegido por el trigger
 * classrooms_check_student_assignment (solo role='student' y status='active') y por RLS
 * classrooms_admin_write. Cambiar el alumno NUNCA modifica class_records históricos -- esos
 * conservan su propio student_id snapshot, independiente de este campo.
 */
export function useSetClassroomStudent(classroomId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (studentId: string | null) => {
      const { error } = await supabase.from("classrooms").update({ student_id: studentId }).eq("id", classroomId);
      if (error) {
        if (error.message.startsWith("INVALID_CLASSROOM_STUDENT")) throw new Error("Solo se pueden asignar perfiles con rol estudiante y activos.");
        throw new Error("No pudimos actualizar el estudiante del salón. Inténtalo de nuevo en unos minutos.");
      }
    },
    onSuccess: () => invalidateClassroomQueries(queryClient, classroomId),
  });
}

/** Habilitar un profesor: upsert directo, sin PRIMARY/SUBSTITUTE (Slice A). */
export function useAddClassroomTeacher(classroomId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (teacherId: string) => {
      const { error } = await supabase
        .from("classroom_teachers")
        .upsert({ classroom_id: classroomId, teacher_id: teacherId, status: "active" }, { onConflict: "classroom_id,teacher_id" });
      if (error) throw new Error("No pudimos habilitar al profesor. Inténtalo de nuevo en unos minutos.");
    },
    onSuccess: () => invalidateClassroomQueries(queryClient, classroomId),
  });
}

/** Quitar/deshabilitar: siempre status='inactive', NUNCA DELETE -- preserva class_records/
 * teacher_payments históricos del profesor en este salón (Slice F, requisito explícito). */
export function useRemoveClassroomTeacher(classroomId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (teacherId: string) => {
      const { error } = await supabase.from("classroom_teachers").update({ status: "inactive" }).eq("classroom_id", classroomId).eq("teacher_id", teacherId);
      if (error) throw new Error("No pudimos quitar al profesor. Inténtalo de nuevo en unos minutos.");
    },
    onSuccess: () => invalidateClassroomQueries(queryClient, classroomId),
  });
}
