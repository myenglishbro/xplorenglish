import { useMutation, useQueryClient } from "@tanstack/react-query";
import { secureApiCall, ApiError } from "@/lib/apiClient";
import { createStudentSchema, type CreateStudentInput } from "@/server/admin/students/validation";

export type CreateStudentFieldErrors = Partial<Record<keyof CreateStudentInput, string>>;

/**
 * Backend seguro -- requiere auth.admin.createUser() (service_role), nunca puede ir
 * browser-direct. Ver src/app/api/admin/students/route.ts (Next), que replica
 * createStudentAction (server/admin/students/actions.ts) exactamente: DNI pre-check +
 * auth.admin.createUser() + RPC admin_provision_student_profile() + compensación.
 */
export function useCreateStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateStudentInput) => {
      const parsed = createStudentSchema.safeParse(input);
      if (!parsed.success) {
        const fieldErrors: CreateStudentFieldErrors = {};
        for (const issue of parsed.error.issues) {
          const key = issue.path[0];
          if (typeof key === "string") fieldErrors[key as keyof CreateStudentFieldErrors] = issue.message;
        }
        throw { fieldErrors } as { fieldErrors: CreateStudentFieldErrors };
      }
      try {
        return await secureApiCall<{ profileId: string; email: string; tempPassword: string }>("/api/admin/students", {
          method: "POST",
          body: parsed.data,
        });
      } catch (err) {
        if (err instanceof ApiError && err.fieldErrors) {
          throw { fieldErrors: err.fieldErrors } as { fieldErrors: CreateStudentFieldErrors };
        }
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
}
