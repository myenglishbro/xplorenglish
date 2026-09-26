export interface MyTeacherProfileSummary {
  bio: string | null;
  hourlyRate: number;
  status: string;
  /** teacher_profiles.receipt_drive_url (FIX 2, segunda etapa) -- carpeta de Google Drive para
   * recibos por honorarios; null si Admin todavía no la configuró. Solo lectura para el docente:
   * teacher_profiles no tiene policy de UPDATE para no-admin (0003). */
  receiptDriveUrl: string | null;
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
