export type BalanceStatus = "normal" | "low" | "empty";

/**
 * Slice G -- regla de negocio ÚNICA de clasificación de saldo, separada de su presentación (ver
 * getStudentBalanceStatus más abajo). Fuente del saldo SIEMPRE hours_movements (SUM(minutes_delta)),
 * nunca hours_packages.remainingMinutes ni otra estructura legacy -- eso lo resuelve cada query, esta
 * función solo clasifica el número ya calculado.
 *
 * balance > 120        -> "normal"
 * 1 <= balance <= 120   -> "low"
 * balance <= 0          -> "empty" (incluye negativo: register_class/correct_class ya impiden que el
 *                          saldo baje de 0 en operación normal; si datos legacy lo dejaran negativo,
 *                          NO se inventa un cuarto estado -- se trata igual que "empty").
 */
export function classifyStudentBalance(balance: number): BalanceStatus {
  if (balance > 120) return "normal";
  if (balance >= 1) return "low";
  return "empty";
}

export type BalanceTone = "success" | "warning" | "danger";

export interface BalanceStatusPresentation {
  status: BalanceStatus;
  label: string;
  tone: BalanceTone;
}

const PRESENTATION: Record<BalanceStatus, { label: string; tone: BalanceTone }> = {
  normal: { label: "Saldo normal", tone: "success" },
  low: { label: "Saldo bajo", tone: "warning" },
  empty: { label: "Sin saldo", tone: "danger" },
};

/**
 * Helper central de presentación del saldo -- ÚNICA fuente de "label"/"tone" en toda la app
 * (Admin/Teacher/Student). Ningún componente debe reimplementar `if (balance <= 120) ...`.
 */
export function getStudentBalanceStatus(balance: number): BalanceStatusPresentation {
  const status = classifyStudentBalance(balance);
  return { status, ...PRESENTATION[status] };
}

/**
 * Aviso discreto exclusivo de Student sobre su propio saldo (Slice G, sección 9) -- nunca alarmista,
 * nunca lenguaje de "vencimiento" (los paquetes no vencen por tiempo). null cuando balance > 120
 * (no se muestra ningún aviso).
 */
export function getStudentBalanceNotice(balance: number): string | null {
  const status = classifyStudentBalance(balance);
  if (status === "low") return "Tu paquete está próximo a agotarse.";
  if (status === "empty") return "No tienes minutos disponibles.";
  return null;
}
