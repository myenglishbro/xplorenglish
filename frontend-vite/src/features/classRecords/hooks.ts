import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { registerClass, correctClass, getClassroomHistory, getClassroomBalance } from "./api";
import type { CorrectClassInput, RegisterClassInput, RegisterClassResult } from "./types";

export function useClassroomHistory(classroomId: number) {
  return useQuery({
    queryKey: queryKeys.classroomHistory(classroomId),
    queryFn: () => getClassroomHistory(supabase, classroomId),
    enabled: Number.isFinite(classroomId),
  });
}

export function useClassroomBalance(classroomId: number) {
  return useQuery({
    queryKey: queryKeys.classroomBalance(classroomId),
    queryFn: () => getClassroomBalance(supabase, classroomId),
    enabled: Number.isFinite(classroomId),
  });
}

/**
 * Invalida TODO lo que muestra saldo/historial afectado por register_class/correct_class: el saldo
 * del salón (visto por el profesor, get_classroom_student_balance) Y el saldo/paquetes/historial
 * del propio estudiante (Inicio, Mis horas) -- usa result.studentId (siempre presente en la
 * respuesta del RPC) para no depender de que el profesor conozca ese id de antemano. Antes de esto,
 * salón y dashboard del estudiante podían mostrar dos saldos distintos hasta recargar la página.
 */
function invalidateAfterClassRecordChange(queryClient: ReturnType<typeof useQueryClient>, classroomId: number, result: RegisterClassResult) {
  queryClient.invalidateQueries({ queryKey: queryKeys.classroomHistory(classroomId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.classroomBalance(classroomId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.studentBalance(result.studentId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.hoursPackages(result.studentId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.attendanceHistory(result.studentId) });
  // Slice G -- register_class/correct_class cambian el saldo (hours_movements): refresca las
  // alertas Admin/Teacher y el listado de salones (columna Saldo) dentro de esta misma sesión.
  queryClient.invalidateQueries({ queryKey: ["student-balance-alerts"] });
  queryClient.invalidateQueries({ queryKey: ["admin-classrooms"] });
}

/**
 * Núcleo transaccional de "Registrar clase" (Slice B), conectado a la UI del salón en Slice F. Tras
 * éxito se invalida historial + saldo del salón Y el saldo/horas del estudiante afectado -- nunca
 * un optimistic update financiero.
 */
export function useRegisterClass(classroomId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RegisterClassInput) => registerClass(supabase, input),
    onSuccess: (result) => invalidateAfterClassRecordChange(queryClient, classroomId, result),
  });
}

/**
 * Corrección de una clase ya registrada (Slice C), conectada a la UI del salón en Slice F.
 */
export function useCorrectClass(classroomId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CorrectClassInput) => correctClass(supabase, input),
    onSuccess: (result) => invalidateAfterClassRecordChange(queryClient, classroomId, result),
  });
}
