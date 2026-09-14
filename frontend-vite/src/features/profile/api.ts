import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

type Client = SupabaseClient<Database>;

export interface UpdateProfileNameInput {
  firstName: string;
  lastName: string;
  phone: string;
}

/**
 * Mismas 3 columnas que updateMy{Teacher,Student}ProfileAction (Next) -- la autoridad real de qué
 * campos son editables por un caller no-admin es el trigger private.protect_profile_update
 * (BEFORE UPDATE, 0012_profile_update_security.sql), que corre sin importar si el UPDATE llega
 * desde una Server Action o directo del browser. Por eso esta mutación es segura browser-direct:
 * el trigger rechazaría (PROFILE_FIELD_LOCKED) cualquier intento de tocar dni/role/level/etc,
 * este código ni siquiera se lo ofrece.
 */
export async function updateMyProfileName(supabase: Client, profileId: string, input: UpdateProfileNameInput): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ first_name: input.firstName, last_name: input.lastName, phone: input.phone })
    .eq("id", profileId);
  if (error) throw error;
}
