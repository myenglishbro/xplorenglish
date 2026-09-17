export interface ClassroomBasics {
  id: number;
  name: string;
  level: string;
  programName: string | null;
  description: string | null;
  scheduleNotes: string | null;
}

export interface ClassroomTeacherName {
  id: string;
  firstName: string;
  lastName: string;
}

/** Resuelto vía get_classroom_people (RPC) porque profiles_select (0003) solo permite leer la
 * propia fila o ser admin -- un profesor/alumno no puede leer el nombre del otro directamente. */
export interface ClassroomPeople {
  studentId: string | null;
  studentName: string | null;
  teachers: ClassroomTeacherName[];
}
