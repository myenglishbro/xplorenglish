import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { removeRecordings, uploadRecording } from "@/lib/storage/recordings";
import { useAuth } from "@/auth/useAuth";
import type { ActivityItem, ExerciseKind, PublicExerciseContent, SubmissionItem } from "@/server/questionBank/types";
import type { Database, Json } from "@/types/database.types";

const RPC_ERROR_MESSAGES: Record<string, string> = {
  UNAUTHENTICATED: "Tu sesión expiró. Vuelve a iniciar sesión.",
  NOT_AUTHORIZED: "No tienes permisos para realizar esta acción.",
  CLASSROOM_NOT_FOUND: "Ese salón no existe.",
  CLASSROOM_ARCHIVED: "Este salón está archivado.",
  EXERCISE_NOT_FOUND: "Ese ejercicio ya no existe en el banco.",
  INVALID_CONTENT: "Este ejercicio no tiene preguntas. Edítalo en el banco antes de asignarlo.",
  ACTIVITY_NOT_FOUND: "Esa actividad ya no existe.",
  INVALID_ANSWERS: "Responde la actividad antes de enviar.",
  EMPTY_TEXT: "Escribe tu respuesta antes de enviar.",
  TEXT_TOO_LONG: "Tu texto es demasiado largo.",
  INVALID_AUDIO: "La grabación no es válida. Vuelve a grabarla.",
  SUBMISSION_NOT_FOUND: "Esa entrega ya no existe.",
  FEEDBACK_NOT_SUPPORTED: "Solo las actividades de writing y speaking llevan feedback.",
  EMPTY_FEEDBACK: "Escribe un comentario antes de guardar.",
  FEEDBACK_TOO_LONG: "El comentario es demasiado largo.",
};

function rpcError(error: { message: string }, fallback: string): Error {
  const code = error.message.split(":")[0]?.trim() ?? "";
  return new Error(RPC_ERROR_MESSAGES[code] ?? fallback);
}

type SubmissionRow = Database["public"]["Tables"]["activity_submissions"]["Row"];

function mapSubmission(row: SubmissionRow): SubmissionItem {
  return {
    id: row.id,
    activityId: row.activity_id,
    studentId: row.student_id,
    answers: Array.isArray(row.answers) ? row.answers : null,
    textResponse: row.text_response,
    audioPath: row.audio_path,
    score: row.score,
    maxScore: row.max_score,
    results: Array.isArray(row.results) ? (row.results as boolean[]) : null,
    submittedAt: row.submitted_at,
    feedback: row.feedback,
    feedbackAt: row.feedback_at,
  };
}

/** RLS (0048): docente/estudiante/admin del salón. El contenido ya viene sin respuestas correctas. */
export function useClassroomActivities(classroomId: number) {
  return useQuery({
    queryKey: queryKeys.classroomActivities(classroomId),
    queryFn: async (): Promise<ActivityItem[]> => {
      const { data, error } = await supabase
        .from("classroom_activities")
        .select("*")
        .eq("classroom_id", classroomId)
        .order("created_at", { ascending: false });
      if (error) throw new Error("No pudimos cargar las actividades.");
      return data.map((row) => ({
        id: row.id,
        classroomId: row.classroom_id,
        kind: row.kind as ExerciseKind,
        title: row.title,
        content: row.content as unknown as PublicExerciseContent,
        dueAt: row.due_at,
        createdAt: row.created_at,
      }));
    },
    enabled: Number.isFinite(classroomId),
  });
}

/** Estudiante: solo las suyas. Docente/admin: todas las del salón (RLS decide). */
export function useClassroomSubmissions(classroomId: number) {
  return useQuery({
    queryKey: queryKeys.classroomSubmissions(classroomId),
    queryFn: async (): Promise<SubmissionItem[]> => {
      const { data, error } = await supabase
        .from("activity_submissions")
        .select("*")
        .eq("classroom_id", classroomId)
        .order("submitted_at", { ascending: false });
      if (error) throw new Error("No pudimos cargar las entregas.");
      return data.map(mapSubmission);
    },
    enabled: Number.isFinite(classroomId),
  });
}

export function useAssignExercise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ exerciseId, classroomId, dueAt }: { exerciseId: number; classroomId: number; dueAt: string | null }) => {
      const { error } = await supabase.rpc("assign_exercise", {
        p_exercise_id: exerciseId,
        p_classroom_id: classroomId,
        ...(dueAt ? { p_due_at: dueAt } : {}),
      });
      if (error) throw rpcError(error, "No pudimos asignar la actividad. Inténtalo de nuevo en unos minutos.");
      return classroomId;
    },
    onSuccess: (classroomId) => queryClient.invalidateQueries({ queryKey: queryKeys.classroomActivities(classroomId) }),
  });
}

/** El RPC borra la actividad (y sus entregas) y devuelve las rutas de audio, que se eliminan de Storage acá. */
export function useDeleteActivity(classroomId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (activityId: number) => {
      const { data, error } = await supabase.rpc("delete_classroom_activity", { p_activity_id: activityId });
      if (error) throw rpcError(error, "No pudimos eliminar la actividad. Inténtalo de nuevo en unos minutos.");
      await removeRecordings(supabase, data ?? []);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.classroomActivities(classroomId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.classroomSubmissions(classroomId) });
    },
  });
}

export type SubmitInput =
  | { kind: "exercise" | "listening"; answers: Json[] }
  | { kind: "writing"; text: string }
  | { kind: "speaking"; audio: Blob };

export function useSubmitActivity(classroomId: number, activityId: number) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: SubmitInput): Promise<SubmissionItem> => {
      let audioPath: string | undefined;
      if (input.kind === "speaking") {
        if (!user) throw new Error("Tu sesión expiró. Vuelve a iniciar sesión.");
        const uploaded = await uploadRecording(supabase, { classroomId, activityId, studentId: user.id }, input.audio);
        if ("error" in uploaded) throw new Error(uploaded.error);
        audioPath = uploaded.path;
      }
      const { data, error } = await supabase.rpc("submit_activity", {
        p_activity_id: activityId,
        ...(input.kind === "exercise" || input.kind === "listening" ? { p_answers: input.answers } : {}),
        ...(input.kind === "writing" ? { p_text: input.text } : {}),
        ...(audioPath ? { p_audio_path: audioPath } : {}),
      });
      if (error) {
        // El estudiante no puede borrar de Storage (solo admin/docente): el huérfano se limpia al archivar el salón.
        throw rpcError(error, "No pudimos enviar tu respuesta. Inténtalo de nuevo en unos minutos.");
      }
      return mapSubmission(data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.classroomSubmissions(classroomId) }),
  });
}

export function useGiveFeedback(classroomId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ submissionId, feedback }: { submissionId: number; feedback: string }) => {
      const { error } = await supabase.rpc("give_submission_feedback", { p_submission_id: submissionId, p_feedback: feedback });
      if (error) throw rpcError(error, "No pudimos guardar el comentario. Inténtalo de nuevo en unos minutos.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.classroomSubmissions(classroomId) }),
  });
}
