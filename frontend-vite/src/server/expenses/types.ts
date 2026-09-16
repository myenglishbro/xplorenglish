import type { Database } from "@/types/database.types";

export type ExpenseCategory = Database["public"]["Enums"]["expense_category"];

/** Único listado de categorías -- fuente de verdad reutilizada por validation.ts (z.enum) y por
 * el <Select> del formulario, para que ambos nunca puedan divergir de los 9 valores reales del
 * enum `expense_category` (0024_business_expenses.sql). `satisfies` (no `as`) asegura en tiempo de
 * compilación que esta lista sigue siendo exactamente el enum de la BD, sin ensancharlo a `string[]`. */
export const EXPENSE_CATEGORIES = [
  "marketing",
  "software",
  "services",
  "rent",
  "equipment",
  "materials",
  "administration",
  "taxes",
  "other",
] as const satisfies readonly ExpenseCategory[];

/** Etiquetas amigables en español -- en BD siempre se conserva el valor exacto del enum. */
export const EXPENSE_CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  marketing: "Publicidad / Marketing",
  software: "Software / Plataformas",
  services: "Servicios",
  rent: "Alquiler",
  equipment: "Equipos",
  materials: "Materiales",
  administration: "Administración",
  taxes: "Impuestos",
  other: "Otros",
};

export interface ExpenseListItem {
  // Índice requerido por DataTable<T extends Record<string, unknown>> -- mismo criterio que
  // PayrollPeriodListItem/PaymentListItem.
  [key: string]: unknown;
  id: number;
  /** date puro "YYYY-MM-DD" (columna `date`, sin hora/zona) -- nunca pasar por Date()/timeZone,
   * formatear con split simple. Es la fecha ECONÓMICA del gasto, nunca `createdAt`. */
  expenseDate: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  paymentMethod: string;
  notes: string | null;
  createdByName: string;
  /** Cuándo se registró el gasto en el sistema -- puramente informativo, nunca se usa para
   * atribuir el gasto a un mes/periodo (eso es expenseDate). */
  createdAt: string;
  updatedAt: string;
}
