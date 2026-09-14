export interface MyTeacherProfileSummary {
  bio: string | null;
  hourlyRate: number;
  status: string;
}

export interface MyTeacherProfile {
  id: string;
  firstName: string;
  lastName: string;
  /** Solo lectura acá -- el trigger private.protect_profile_update (0012) bloquea cualquier
   * intento de cambiarlo desde un caller no-admin, así que esta pantalla ni siquiera lo ofrece
   * como editable. */
  dni: string;
  phone: string;
  /** null si el docente todavía no tiene fila en teacher_profiles (no debería ocurrir para un
   * role='teacher' real, pero la query no lo asume). */
  teacherProfile: MyTeacherProfileSummary | null;
}
