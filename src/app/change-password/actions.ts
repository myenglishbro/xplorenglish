"use server";

import { createClient } from "@/lib/supabase/server";

export type MarkPasswordChangedState = { error?: string };

/**
 * Se llama justo después de que auth.updateUser({password}) tiene éxito desde la sesión del
 * propio estudiante. mark_password_changed() no recibe ningún id -- usa auth.uid() del lado del
 * servidor, así que si esta llamada tiene éxito es prueba directa de que el servidor (esta
 * Server Action) reconoce la misma sesión que el navegador acaba de usar para cambiar la
 * contraseña. Mismo patrón que markInvitationAcceptedAction() en /set-password.
 */
export async function markPasswordChangedAction(): Promise<MarkPasswordChangedState> {
  const supabase = createClient();
  const { error } = await supabase.rpc("mark_password_changed");

  if (error) {
    return { error: error.message };
  }

  return {};
}
