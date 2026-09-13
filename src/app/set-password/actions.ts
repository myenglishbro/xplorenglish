"use server";

import { createClient } from "@/lib/supabase/server";

export type MarkInvitationAcceptedState = { error?: string };

/**
 * Se llama justo después de que el estudiante establece su contraseña, ya con la sesión que el
 * propio SDK detectó del fragmento de la URL de invitación. mark_invitation_accepted() no recibe
 * ningún id -- usa auth.uid() del lado del servidor, así que si esta llamada tiene éxito es
 * prueba directa de que el servidor (esta Server Action) reconoce la misma sesión que el
 * navegador acaba de establecer.
 */
export async function markInvitationAcceptedAction(): Promise<MarkInvitationAcceptedState> {
  const supabase = createClient();
  const { error } = await supabase.rpc("mark_invitation_accepted");

  if (error) {
    return { error: error.message };
  }

  return {};
}
