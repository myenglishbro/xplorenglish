import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/auth/useAuth";
import { queryKeys } from "@/lib/queryKeys";
import { listExpenses } from "@/server/expenses/queries";
import { expenseSchema, type ExpenseInput } from "@/server/expenses/validation";

export type ExpenseFieldErrors = Partial<Record<keyof ExpenseInput, string>>;

/** Forma cruda que envía el formulario -- todo `unknown`, mismo criterio que
 * useUpdateTeacherProfile (features/teachers/hooks.ts): el mutationFn nunca asume un tipo ya
 * validado en el límite, safeParse es quien realmente decide la forma final (ExpenseInput). Evita
 * que TS exija que el formulario ya conozca las transformaciones de z.coerce/z.transform (amount
 * como string en el input crudo, number después de expenseSchema). */
interface RawExpenseInput {
  expenseDate: unknown;
  category: unknown;
  description: unknown;
  amount: unknown;
  paymentMethod: unknown;
  notes: unknown;
}

export function useAdminExpenses() {
  return useQuery({
    queryKey: queryKeys.adminExpenses(),
    queryFn: () => listExpenses(supabase),
  });
}

function parseExpenseInput(input: RawExpenseInput) {
  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: ExpenseFieldErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string") fieldErrors[key as keyof ExpenseFieldErrors] = issue.message;
    }
    throw { fieldErrors } as { fieldErrors: ExpenseFieldErrors };
  }
  return parsed.data;
}

/**
 * Un gasto afecta tanto la lista de "Otros gastos" (Slice 2) como cualquier reporte financiero que
 * lo incluya (Slice 5) -- se invalida por PREFIJO ("admin-financial-report"/"admin-financial-trend",
 * sin startDate/endDate/monthsBack) para refrescar TODOS los meses/rangos cacheados a la vez, sin
 * que este hook necesite saber en qué periodo está parado el admin ahora mismo. TanStack Query
 * matchea por prefijo de array por defecto (exact:false), así que esto alcanza cualquier
 * queryKeys.adminFinancialReport(...)/adminFinancialTrend(...) ya cacheado.
 */
function invalidateExpenses(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: queryKeys.adminExpenses() });
  queryClient.invalidateQueries({ queryKey: ["admin-financial-report"] });
  queryClient.invalidateQueries({ queryKey: ["admin-financial-trend"] });
}

/**
 * `created_by` nunca se pide en el formulario -- se establece acá con el admin autenticado
 * (useAuth().user.id), nunca con un valor que el cliente pudiera manipular en el payload del
 * formulario. RLS (business_expenses_admin_all, 0024) es quien realmente decide si esta escritura
 * procede; esto solo evita que un admin tenga que escribir su propio id a mano.
 */
export function useCreateExpense() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: RawExpenseInput) => {
      const data = parseExpenseInput(input);
      if (!user) throw new Error("Tu sesión expiró. Vuelve a iniciar sesión.");

      const { error } = await supabase.from("business_expenses").insert({
        expense_date: data.expenseDate,
        category: data.category,
        description: data.description,
        amount: data.amount,
        payment_method: data.paymentMethod,
        notes: data.notes,
        created_by: user.id,
      });
      if (error) throw new Error("No pudimos registrar el gasto. Inténtalo de nuevo en unos minutos.");
    },
    onSuccess: () => invalidateExpenses(queryClient),
  });
}

/** `updated_at` se fija explícitamente en cada UPDATE -- este proyecto no tiene (ni en esta
 * migración ni en ninguna otra) un trigger genérico que lo haga solo, ver 0024. */
export function useUpdateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ expenseId, input }: { expenseId: number; input: RawExpenseInput }) => {
      const data = parseExpenseInput(input);
      const { error } = await supabase
        .from("business_expenses")
        .update({
          expense_date: data.expenseDate,
          category: data.category,
          description: data.description,
          amount: data.amount,
          payment_method: data.paymentMethod,
          notes: data.notes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", expenseId);
      if (error) throw new Error("No pudimos guardar los cambios. Inténtalo de nuevo en unos minutos.");
    },
    onSuccess: () => invalidateExpenses(queryClient),
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (expenseId: number) => {
      const { error } = await supabase.from("business_expenses").delete().eq("id", expenseId);
      if (error) throw new Error("No pudimos eliminar el gasto. Inténtalo de nuevo en unos minutos.");
    },
    onSuccess: () => invalidateExpenses(queryClient),
  });
}
