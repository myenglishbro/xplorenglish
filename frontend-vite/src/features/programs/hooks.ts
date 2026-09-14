import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { listProgramsForAdmin } from "@/server/admin/programs/queries";
import { programSchema, type ProgramInput } from "@/server/admin/programs/validation";

export function useProgramsPanel() {
  return useQuery({
    queryKey: queryKeys.adminProgramsPanel(),
    queryFn: () => listProgramsForAdmin(supabase),
  });
}

export type ProgramFieldErrors = Partial<Record<keyof ProgramInput, string>>;

function invalidatePrograms(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: queryKeys.adminProgramsPanel() });
  queryClient.invalidateQueries({ queryKey: ["admin-programs"] });
}

/** RLS (programs_admin_write, 0003) ya autoriza a admin sin necesidad de RPC -- browser-direct. */
export function useCreateProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProgramInput) => {
      const parsed = programSchema.safeParse(input);
      if (!parsed.success) {
        const fieldErrors: ProgramFieldErrors = {};
        for (const issue of parsed.error.issues) {
          const key = issue.path[0];
          if (typeof key === "string") fieldErrors[key as keyof ProgramFieldErrors] = issue.message;
        }
        throw { fieldErrors } as { fieldErrors: ProgramFieldErrors };
      }
      const { error } = await supabase.from("programs").insert(parsed.data);
      if (error) throw new Error("No pudimos crear el programa. Inténtalo de nuevo en unos minutos.");
    },
    onSuccess: () => invalidatePrograms(queryClient),
  });
}

export function useUpdateProgram(programId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProgramInput) => {
      const parsed = programSchema.safeParse(input);
      if (!parsed.success) {
        const fieldErrors: ProgramFieldErrors = {};
        for (const issue of parsed.error.issues) {
          const key = issue.path[0];
          if (typeof key === "string") fieldErrors[key as keyof ProgramFieldErrors] = issue.message;
        }
        throw { fieldErrors } as { fieldErrors: ProgramFieldErrors };
      }
      const { error } = await supabase.from("programs").update(parsed.data).eq("id", programId);
      if (error) throw new Error("No pudimos guardar los cambios. Inténtalo de nuevo en unos minutos.");
    },
    onSuccess: () => invalidatePrograms(queryClient),
  });
}

export function useSetProgramActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ programId, isActive }: { programId: number; isActive: boolean }) => {
      const { error } = await supabase.from("programs").update({ is_active: isActive }).eq("id", programId);
      if (error) throw new Error("No pudimos actualizar el estado del programa. Inténtalo de nuevo en unos minutos.");
    },
    onSuccess: () => invalidatePrograms(queryClient),
  });
}
