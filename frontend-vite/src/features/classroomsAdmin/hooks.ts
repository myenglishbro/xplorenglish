import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { listClassrooms, getClassroomDetail, listAssignableTeachers, listAssignableStudents } from "@/server/admin/classrooms/queries";
import { getClassroomTeacherCompatibility } from "@/server/scheduling/compatibility";
import { classroomSchema, type ClassroomInput } from "@/server/admin/classrooms/validation";
import type { ClassroomListFilters, ClassroomTeacherRole } from "@/server/admin/classrooms/types";

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

export function useAssignableStudents() {
  return useQuery({
    queryKey: queryKeys.adminAssignableStudents(),
    queryFn: () => listAssignableStudents(supabase),
  });
}

export function useClassroomCompatibility(classroomId: number) {
  return useQuery({
    queryKey: queryKeys.adminClassroomCompatibility(classroomId),
    queryFn: () => getClassroomTeacherCompatibility(supabase, classroomId),
    enabled: Number.isFinite(classroomId),
  });
}

function invalidateClassroomQueries(queryClient: ReturnType<typeof useQueryClient>, classroomId?: number) {
  queryClient.invalidateQueries({ queryKey: ["admin-classrooms"] });
  if (classroomId !== undefined) {
    queryClient.invalidateQueries({ queryKey: queryKeys.adminClassroomDetail(classroomId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.adminClassroomCompatibility(classroomId) });
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

const ASSIGN_PRIMARY_ERROR_MESSAGES: Record<string, string> = {
  NOT_AUTHORIZED: "No tienes permisos para realizar esta acción.",
  CLASSROOM_NOT_FOUND: "El salón no existe.",
  TEACHER_NOT_FOUND: "Ese usuario no es un docente.",
  TEACHER_INACTIVE: "Ese docente está inactivo; actívalo antes de asignarlo como titular.",
};

/**
 * assign_classroom_primary_teacher (0015) -- RPC directo, desactiva atómicamente cualquier
 * PRIMARY activo distinto y hace upsert del nuevo. La compatibilidad se recalcula aquí mismo
 * justo antes de llamar al RPC (nunca se confía en un estado ya calculado en el cliente, que
 * pudo quedar desactualizado): mismo criterio que assignPrimaryTeacherAction (Next).
 */
export function useAssignPrimaryTeacher(classroomId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (teacherId: string) => {
      const compatibility = await getClassroomTeacherCompatibility(supabase, classroomId);
      if (!compatibility.hasActiveSchedules) {
        throw new Error("Define primero el horario del salón antes de asignar un docente titular.");
      }
      const entry = compatibility.teachers.find((t) => t.teacherId === teacherId);
      if (!entry || entry.status !== "compatible") {
        throw new Error("Ese docente ya no es compatible con el horario del salón. Actualiza la selección e inténtalo de nuevo.");
      }
      const { error } = await supabase.rpc("assign_classroom_primary_teacher", { p_classroom_id: classroomId, p_teacher_id: teacherId });
      if (error) {
        const code = error.message.split(":")[0] ?? "";
        throw new Error(ASSIGN_PRIMARY_ERROR_MESSAGES[code] ?? "No pudimos asignar el docente titular. Inténtalo de nuevo.");
      }
    },
    onSuccess: () => invalidateClassroomQueries(queryClient, classroomId),
  });
}

/** Sin invariante multi-fila que proteger -- upsert directo, browser-direct. */
export function useAssignSubstituteTeacher(classroomId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (teacherId: string) => {
      const { data: teacher, error: teacherError } = await supabase.from("teacher_profiles").select("status").eq("profile_id", teacherId).maybeSingle();
      if (teacherError || !teacher) throw new Error("Ese usuario no es un docente.");
      if (teacher.status !== "active") throw new Error("Ese docente está inactivo; actívalo antes de asignarlo.");

      const { error } = await supabase
        .from("classroom_teachers")
        .upsert({ classroom_id: classroomId, teacher_id: teacherId, teacher_role: "SUBSTITUTE", status: "active" }, { onConflict: "classroom_id,teacher_id" });
      if (error) throw new Error("No pudimos asignar el docente suplente. Inténtalo de nuevo en unos minutos.");
    },
    onSuccess: () => invalidateClassroomQueries(queryClient, classroomId),
  });
}

export function useRemoveClassroomTeacher(classroomId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ teacherId }: { teacherId: string; role: ClassroomTeacherRole }) => {
      const { error } = await supabase.from("classroom_teachers").update({ status: "inactive" }).eq("classroom_id", classroomId).eq("teacher_id", teacherId);
      if (error) throw new Error("No pudimos quitar al docente. Inténtalo de nuevo en unos minutos.");
    },
    onSuccess: () => invalidateClassroomQueries(queryClient, classroomId),
  });
}

/** Pre-check de rol para un mensaje amigable -- la autoridad final es el trigger
 * classroom_students_check_role (0015). */
export function useAddClassroomStudent(classroomId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (studentId: string) => {
      const { data: student, error: studentError } = await supabase.from("profiles").select("role").eq("id", studentId).maybeSingle();
      if (studentError || !student) throw new Error("Ese perfil no existe.");
      if (student.role !== "student") throw new Error("Solo se pueden enrolar perfiles con rol estudiante.");

      const { error } = await supabase
        .from("classroom_students")
        .upsert({ classroom_id: classroomId, student_id: studentId, status: "active" }, { onConflict: "classroom_id,student_id" });
      if (error) {
        if (error.message.startsWith("INVALID_CLASSROOM_STUDENT")) throw new Error("Solo se pueden enrolar perfiles con rol estudiante.");
        throw new Error("No pudimos agregar al estudiante. Inténtalo de nuevo en unos minutos.");
      }
    },
    onSuccess: () => invalidateClassroomQueries(queryClient, classroomId),
  });
}

export function useRemoveClassroomStudent(classroomId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (studentId: string) => {
      const { error } = await supabase.from("classroom_students").update({ status: "inactive" }).eq("classroom_id", classroomId).eq("student_id", studentId);
      if (error) throw new Error("No pudimos quitar al estudiante. Inténtalo de nuevo en unos minutos.");
    },
    onSuccess: () => invalidateClassroomQueries(queryClient, classroomId),
  });
}
