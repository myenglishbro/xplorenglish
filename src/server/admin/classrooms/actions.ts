"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { classroomSchema, type ClassroomInput } from "./validation";
import type { ClassroomTeacherRole } from "./types";
import { getClassroomTeacherCompatibility } from "@/server/scheduling/compatibility";

export type ClassroomFieldErrors = Partial<Record<keyof ClassroomInput, string>>;
export type ClassroomActionState = { error?: string; fieldErrors?: ClassroomFieldErrors };

function parseClassroomForm(formData: FormData) {
  const rawProgramId = formData.get("program_id");
  return classroomSchema.safeParse({
    name: formData.get("name"),
    program_id: rawProgramId && rawProgramId !== "" ? Number(rawProgramId) : undefined,
    level: formData.get("level"),
    description: formData.get("description"),
    schedule_notes: formData.get("schedule_notes"),
  });
}

function fieldErrorsFrom(issues: { path: (string | number)[]; message: string }[]): ClassroomFieldErrors {
  const fieldErrors: ClassroomFieldErrors = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (typeof key === "string") fieldErrors[key as keyof ClassroomFieldErrors] = issue.message;
  }
  return fieldErrors;
}

function revalidateClassroomPaths(classroomId?: number) {
  revalidatePath("/admin/salones");
  if (classroomId) revalidatePath(`/admin/salones/${classroomId}`);
}

export type CreateClassroomActionState = ClassroomActionState & { success?: { classroomId: number } };

/** RLS (classrooms_admin_write, 0005) ya autoriza a admin -- sin RPC, no hay invariante
 * multi-fila al crear/editar los datos propios del salón. */
export async function createClassroomAction(formData: FormData): Promise<CreateClassroomActionState> {
  await requireRole("admin");

  const parsed = parseClassroomForm(formData);
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  const supabase = createClient();
  const { data, error } = await supabase.from("classrooms").insert(parsed.data).select("id").single();

  if (error) {
    if (error.code === "23503") {
      return { fieldErrors: { program_id: "El programa seleccionado no existe." } };
    }
    return { error: "No pudimos crear el salón. Inténtalo de nuevo en unos minutos." };
  }

  revalidateClassroomPaths();
  return { success: { classroomId: data.id } };
}

export async function updateClassroomAction(classroomId: number, formData: FormData): Promise<ClassroomActionState> {
  await requireRole("admin");

  const parsed = parseClassroomForm(formData);
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  const supabase = createClient();
  const { error } = await supabase.from("classrooms").update(parsed.data).eq("id", classroomId);

  if (error) {
    if (error.code === "23503") {
      return { fieldErrors: { program_id: "El programa seleccionado no existe." } };
    }
    return { error: "No pudimos guardar los cambios. Inténtalo de nuevo en unos minutos." };
  }

  revalidateClassroomPaths(classroomId);
  return {};
}

export type SetClassroomStatusActionState = { error?: string };

export async function setClassroomStatusAction(
  classroomId: number,
  status: "active" | "archived"
): Promise<SetClassroomStatusActionState> {
  await requireRole("admin");

  const supabase = createClient();
  const { error } = await supabase.from("classrooms").update({ status }).eq("id", classroomId);

  if (error) {
    return { error: "No pudimos actualizar el estado del salón. Inténtalo de nuevo en unos minutos." };
  }

  revalidateClassroomPaths(classroomId);
  return {};
}

export type AssignTeacherActionState = { error?: string };

const ASSIGN_PRIMARY_ERROR_MESSAGES: Record<string, string> = {
  NOT_AUTHORIZED: "No tienes permisos para realizar esta acción.",
  CLASSROOM_NOT_FOUND: "El salón no existe.",
  TEACHER_NOT_FOUND: "Ese usuario no es un docente.",
  TEACHER_INACTIVE: "Ese docente está inactivo; actívalo antes de asignarlo como titular.",
};

/**
 * assign_classroom_primary_teacher (0015): desactiva atómicamente cualquier PRIMARY activo
 * distinto y hace upsert del nuevo -- nunca dos PRIMARY activos ni una ventana sin ninguno.
 *
 * Antes de llamar al RPC, esta acción RECALCULA la compatibilidad de horario/disponibilidad en
 * servidor (getClassroomTeacherCompatibility, server/scheduling/compatibility.ts) -- nunca confía
 * en un estado "compatible" que el cliente pudo haber calculado antes (ese estado puede estar
 * desactualizado, o directamente manipulado). El RPC en sí no conoce class_schedules ni
 * teacher_availability -- esta es la única capa que impone esa regla; UI (el <Select> del
 * selector solo ofrece compatibles) es defensa en profundidad, no la autoridad.
 */
export async function assignPrimaryTeacherAction(classroomId: number, teacherId: string): Promise<AssignTeacherActionState> {
  await requireRole("admin");

  const supabase = createClient();

  const compatibility = await getClassroomTeacherCompatibility(supabase, classroomId);
  if (!compatibility.hasActiveSchedules) {
    return { error: "Define primero el horario del salón antes de asignar un docente titular." };
  }
  const entry = compatibility.teachers.find((t) => t.teacherId === teacherId);
  if (!entry || entry.status !== "compatible") {
    return { error: "Ese docente ya no es compatible con el horario del salón. Actualiza la selección e inténtalo de nuevo." };
  }

  const { error } = await supabase.rpc("assign_classroom_primary_teacher", {
    p_classroom_id: classroomId,
    p_teacher_id: teacherId,
  });

  if (error) {
    const code = error.message.split(":")[0] ?? "";
    return { error: ASSIGN_PRIMARY_ERROR_MESSAGES[code] ?? "No pudimos asignar el docente titular. Inténtalo de nuevo." };
  }

  revalidateClassroomPaths(classroomId);
  return {};
}

/** Sin invariante que proteger (SUBSTITUTE admite múltiples filas activas por salón) -- upsert
 * directo. onConflict cubre reincorporar a un docente que ya tuvo una fila (inactiva o como
 * titular anterior) en este salón, ya que unique(classroom_id, teacher_id) no permite dos filas
 * para el mismo par. */
export async function assignSubstituteTeacherAction(classroomId: number, teacherId: string): Promise<AssignTeacherActionState> {
  await requireRole("admin");

  const supabase = createClient();
  const { data: teacher, error: teacherError } = await supabase
    .from("teacher_profiles")
    .select("status")
    .eq("profile_id", teacherId)
    .maybeSingle();

  if (teacherError || !teacher) {
    return { error: "Ese usuario no es un docente." };
  }
  if (teacher.status !== "active") {
    return { error: "Ese docente está inactivo; actívalo antes de asignarlo." };
  }

  const { error } = await supabase
    .from("classroom_teachers")
    .upsert(
      { classroom_id: classroomId, teacher_id: teacherId, teacher_role: "SUBSTITUTE", status: "active" },
      { onConflict: "classroom_id,teacher_id" }
    );

  if (error) {
    return { error: "No pudimos asignar el docente suplente. Inténtalo de nuevo en unos minutos." };
  }

  revalidateClassroomPaths(classroomId);
  return {};
}

export async function removeClassroomTeacherAction(
  classroomId: number,
  teacherId: string,
  _role: ClassroomTeacherRole
): Promise<AssignTeacherActionState> {
  await requireRole("admin");

  const supabase = createClient();
  const { error } = await supabase
    .from("classroom_teachers")
    .update({ status: "inactive" })
    .eq("classroom_id", classroomId)
    .eq("teacher_id", teacherId);

  if (error) {
    return { error: "No pudimos quitar al docente. Inténtalo de nuevo en unos minutos." };
  }

  revalidateClassroomPaths(classroomId);
  return {};
}

export type StudentMembershipActionState = { error?: string };

/** Pre-check de rol para un mensaje amigable -- la autoridad final es el trigger
 * classroom_students_check_role (0015), que rechaza esto igual aunque este chequeo se saltara. */
export async function addClassroomStudentAction(classroomId: number, studentId: string): Promise<StudentMembershipActionState> {
  await requireRole("admin");

  const supabase = createClient();
  const { data: student, error: studentError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", studentId)
    .maybeSingle();

  if (studentError || !student) {
    return { error: "Ese perfil no existe." };
  }
  if (student.role !== "student") {
    return { error: "Solo se pueden enrolar perfiles con rol estudiante." };
  }

  const { error } = await supabase
    .from("classroom_students")
    .upsert({ classroom_id: classroomId, student_id: studentId, status: "active" }, { onConflict: "classroom_id,student_id" });

  if (error) {
    if (error.message.startsWith("INVALID_CLASSROOM_STUDENT")) {
      return { error: "Solo se pueden enrolar perfiles con rol estudiante." };
    }
    return { error: "No pudimos agregar al estudiante. Inténtalo de nuevo en unos minutos." };
  }

  revalidateClassroomPaths(classroomId);
  return {};
}

export async function removeClassroomStudentAction(classroomId: number, studentId: string): Promise<StudentMembershipActionState> {
  await requireRole("admin");

  const supabase = createClient();
  const { error } = await supabase
    .from("classroom_students")
    .update({ status: "inactive" })
    .eq("classroom_id", classroomId)
    .eq("student_id", studentId);

  if (error) {
    return { error: "No pudimos quitar al estudiante. Inténtalo de nuevo en unos minutos." };
  }

  revalidateClassroomPaths(classroomId);
  return {};
}
