import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { useAuth } from "@/auth/useAuth";
import { exerciseContentSchema } from "@/server/questionBank/validation";
import type { ExerciseContent, ExerciseKind, ExerciseListItem } from "@/server/questionBank/types";

/** Banco compartido: RLS (0048) deja leer a todo docente/admin; la query no filtra por autor. */
export function useExercises() {
  return useQuery({
    queryKey: queryKeys.exercises(),
    queryFn: async (): Promise<ExerciseListItem[]> => {
      const { data, error } = await supabase.from("exercises").select("*").order("created_at", { ascending: false });
      if (error) throw new Error("No pudimos cargar el banco de preguntas.");
      const items: ExerciseListItem[] = [];
      for (const row of data) {
        // Si un registro no cumple el formato actual se omite en vez de romper toda la lista.
        const parsed = exerciseContentSchema.safeParse(row.content);
        if (!parsed.success) continue;
        items.push({
          id: row.id,
          createdBy: row.created_by,
          kind: row.kind as ExerciseKind,
          title: row.title,
          level: row.level,
          content: parsed.data,
          createdAt: row.created_at,
        });
      }
      return items;
    },
  });
}

/** Temas ya usados en el banco, sin repetir (ignora mayúsculas) y ordenados. */
export function uniqueTopics(items: ExerciseListItem[]): string[] {
  const seen = new Map<string, string>();
  for (const e of items) {
    const t = e.content.topic?.trim();
    if (t && !seen.has(t.toLowerCase())) seen.set(t.toLowerCase(), t);
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

export function useCreateExercise() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (content: ExerciseContent) => {
      if (!user) throw new Error("Tu sesión expiró. Vuelve a iniciar sesión.");
      const { error } = await supabase
        .from("exercises")
        .insert({ created_by: user.id, kind: content.kind, title: content.title, level: content.level || null, content });
      if (error) throw new Error("No pudimos guardar el ejercicio. Inténtalo de nuevo en unos minutos.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.exercises() }),
  });
}

export function useUpdateExercise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, content }: { id: number; content: ExerciseContent }) => {
      const { error } = await supabase
        .from("exercises")
        .update({ kind: content.kind, title: content.title, level: content.level || null, content, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw new Error("No pudimos guardar los cambios. Inténtalo de nuevo en unos minutos.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.exercises() }),
  });
}

export function useDeleteExercise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("exercises").delete().eq("id", id);
      if (error) throw new Error("No pudimos eliminar el ejercicio. Inténtalo de nuevo en unos minutos.");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.exercises() }),
  });
}
