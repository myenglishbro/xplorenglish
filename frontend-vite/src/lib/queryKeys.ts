/** Query keys coherentes por dominio -- un solo lugar para que lecturas y las invalidaciones de
 * sus mutaciones nunca diverjan. Todas incluyen el id del usuario actual cuando aplica, para que
 * el cache nunca mezcle datos de una sesión anterior (ej. logout + login con otra cuenta). */
export const queryKeys = {
  availability: (teacherId?: string) => ["teacher-availability", teacherId] as const,
  teacherClassrooms: (teacherId?: string) => ["teacher-classrooms", teacherId] as const,
  studentClassrooms: (studentId?: string) => ["student-classrooms", studentId] as const,
  sessions: (userId?: string) => ["sessions", userId] as const,
  payrollPeriods: (teacherId?: string) => ["payroll-periods", teacherId] as const,
  payrollPeriodDetail: (id: number) => ["payroll-period", id] as const,
  teacherProfile: (id?: string) => ["teacher-profile", id] as const,
  studentProfile: (id?: string) => ["student-profile", id] as const,
  hoursPackages: (studentId?: string) => ["hours-packages", studentId] as const,
  attendanceHistory: (studentId?: string) => ["attendance-history", studentId] as const,
  contentTree: (classroomId: number) => ["content-tree", classroomId] as const,
  classroomHeader: (role: "teacher" | "student", classroomId: number) => ["classroom-header", role, classroomId] as const,
};
