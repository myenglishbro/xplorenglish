import type { Database } from "@/types/database.types";

export interface MyStudentProfile {
  id: string;
  firstName: string;
  lastName: string;
  /** Solo lectura acá -- el trigger private.protect_profile_update (0012) bloquea cualquier
   * intento de cambiarlo desde un caller no-admin, así que esta pantalla ni siquiera lo ofrece
   * como editable. */
  dni: string;
  phone: string;
  level: Database["public"]["Enums"]["academic_level"];
  programName: string | null;
  status: string;
}
