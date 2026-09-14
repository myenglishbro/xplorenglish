// Portado de src/server/scheduling/actions.ts (RPC_ERROR_MESSAGES/parseRpcError) -- misma
// convención 'CODIGO: mensaje' de los RPC de dominio (0009), solo traduce el código a un mensaje
// amigable, nunca muestra el mensaje crudo de Postgres tal cual.
const RPC_ERROR_MESSAGES: Record<string, string> = {
  UNAUTHENTICATED: "Tu sesión expiró. Vuelve a iniciar sesión.",
  NOT_AUTHORIZED: "No tienes permisos para realizar esta acción.",
  SESSION_NOT_FOUND: "La sesión no existe.",
  SESSION_ALREADY_COMPLETED: "No se puede reasignar el docente de una sesión ya completada.",
  TEACHER_NOT_FOUND: "Ese docente no existe.",
  TEACHER_INACTIVE: "Ese docente está inactivo.",
  INVALID_CHANGE_TYPE: "Tipo de cambio no reconocido.",
  INVALID_SESSION_STATUS: "La sesión no está en un estado válido para esta acción.",
  INVALID_TIME_RANGE: "El horario ingresado no es válido.",
  TEACHER_MISMATCH: "La sesión ya fue iniciada por otro docente.",
  MISSING_ACTUAL_TEACHER: "Falta definir el docente que dictó la sesión.",
  INVALID_DURATION: "No pudimos calcular una duración válida para esta sesión.",
  ATTENDANCE_NOT_FOUND: "No existe una fila de asistencia para este estudiante en esta sesión.",
  INVALID_MINUTES: "Los minutos no pueden ser negativos.",
};

export function parseRpcError(error: { message: string }): string {
  const [codeRaw, ...rest] = error.message.split(":");
  const code = codeRaw?.trim() ?? "";

  if (code === "INSUFFICIENT_BALANCE") {
    const detail = rest.join(":").trim();
    return detail ? detail.charAt(0).toUpperCase() + detail.slice(1) + "." : "Saldo insuficiente.";
  }

  return RPC_ERROR_MESSAGES[code] ?? "No pudimos completar la acción. Inténtalo de nuevo en unos minutos.";
}
