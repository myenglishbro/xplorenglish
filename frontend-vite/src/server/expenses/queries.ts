import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { ExpenseCategory, ExpenseListItem } from "./types";

type Client = SupabaseClient<Database>;

interface ExpenseRow {
  id: number;
  expense_date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  payment_method: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by_profile: { first_name: string; last_name: string } | null;
}

const EXPENSE_SELECT = `
  id, expense_date, category, description, amount, payment_method, notes, created_at, updated_at,
  created_by_profile:profiles!business_expenses_created_by_fkey(first_name, last_name)
`;

function mapRow(row: ExpenseRow): ExpenseListItem {
  return {
    id: row.id,
    expenseDate: row.expense_date,
    category: row.category,
    description: row.description,
    amount: row.amount,
    paymentMethod: row.payment_method,
    notes: row.notes,
    createdByName: row.created_by_profile ? `${row.created_by_profile.first_name} ${row.created_by_profile.last_name}` : "—",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * RLS-safe, sin service_role: business_expenses_admin_all (0024) ya garantiza que solo un admin
 * ve/escribe filas -- esta query nunca vuelve a chequear el rol. Orden: gasto más reciente
 * primero por `expense_date` (la fecha económica, no `created_at`); `id desc` como desempate
 * estable para dos gastos del mismo día.
 */
export async function listExpenses(supabase: Client): Promise<ExpenseListItem[]> {
  const { data, error } = await supabase
    .from("business_expenses")
    .select(EXPENSE_SELECT)
    .order("expense_date", { ascending: false })
    .order("id", { ascending: false })
    .returns<ExpenseRow[]>();

  if (error) throw error;
  return data.map(mapRow);
}
