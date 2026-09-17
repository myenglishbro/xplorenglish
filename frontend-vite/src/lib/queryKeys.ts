/** Query keys coherentes por dominio -- un solo lugar para que lecturas y las invalidaciones de
 * sus mutaciones nunca diverjan. Todas incluyen el id del usuario actual cuando aplica, para que
 * el cache nunca mezcle datos de una sesión anterior (ej. logout + login con otra cuenta). */
export const queryKeys = {
  availability: (teacherId?: string) => ["teacher-availability", teacherId] as const,
  teacherClassrooms: (teacherId?: string) => ["teacher-classrooms", teacherId] as const,
  studentClassrooms: (studentId?: string) => ["student-classrooms", studentId] as const,
  teacherProfile: (id?: string) => ["teacher-profile", id] as const,
  studentProfile: (id?: string) => ["student-profile", id] as const,
  hoursPackages: (studentId?: string) => ["hours-packages", studentId] as const,
  attendanceHistory: (studentId?: string) => ["attendance-history", studentId] as const,
  /** Saldo TOTAL del estudiante (SUM(hours_movements.minutes_delta) del ledger completo) -- fuente
   * única para el "saldo" mostrado en inicio/mis horas. register_class/correct_class invalidan
   * esta clave (junto con classroomBalance) para que ambas vistas nunca queden desincronizadas. */
  studentBalance: (studentId?: string) => ["student-balance", studentId] as const,
  classroomBalance: (classroomId: number) => ["classroom-balance", classroomId] as const,
  classroomHistory: (classroomId: number) => ["classroom-history", classroomId] as const,
  /** get_student_balance_alerts (Slice G) -- una sola clave por usuario autenticado: la RPC ya
   * decide el alcance (todos los estudiantes para Admin, solo los suyos para Teacher), así que no
   * hace falta parametrizarla más que por quién la pide. */
  studentBalanceAlerts: (callerId?: string) => ["student-balance-alerts", callerId] as const,
  contentTree: (classroomId: number) => ["content-tree", classroomId] as const,
  classroomHeader: (role: "teacher" | "student", classroomId: number) => ["classroom-header", role, classroomId] as const,
  adminDashboard: () => ["admin-dashboard"] as const,
  adminUsers: (filters: { search: string; role: string; status: string; page: number }) =>
    ["admin-users", filters] as const,
  adminUserDetail: (id: string) => ["admin-user", id] as const,
  adminRoleChanges: (id: string) => ["admin-role-changes", id] as const,
  adminPrograms: (activeOnly?: boolean) => ["admin-programs", !!activeOnly] as const,
  adminUserEmails: (ids: string[]) => ["admin-user-emails", [...ids].sort()] as const,
  adminTeachers: () => ["admin-teachers"] as const,
  adminClassrooms: (filters: { programId?: number; level?: string; status?: string }) => ["admin-classrooms", filters] as const,
  adminClassroomDetail: (id: number) => ["admin-classroom", id] as const,
  adminAssignableTeachers: () => ["admin-assignable-teachers"] as const,
  adminAssignableStudents: () => ["admin-assignable-students"] as const,
  adminProgramsPanel: () => ["admin-programs-panel"] as const,
  adminStudentPayments: (filters: { studentId?: string; status?: string }) => ["admin-student-payments", filters] as const,
  adminPaymentDetail: (id: number) => ["admin-payment", id] as const,
  adminTeacherPaymentSummary: () => ["admin-teacher-payment-summary"] as const,
  adminTeacherPaymentStatement: (teacherId: string) => ["admin-teacher-payment-statement", teacherId] as const,
  adminAllClassSchedules: () => ["admin-all-class-schedules"] as const,
  adminClassSchedules: (classroomId: number) => ["admin-class-schedules", classroomId] as const,
  adminHourPackages: () => ["admin-hour-packages"] as const,
  adminStudentHoursMovements: (studentId: string) => ["admin-student-hours-movements", studentId] as const,
  adminExpenses: () => ["admin-expenses"] as const,
  /** Prefijo estable "admin-financial-report" -- las mutaciones de gastos invalidan por prefijo
   * (sin startDate/endDate) para refrescar el reporte sin importar qué periodo esté viendo el
   * admin en ese momento; ver features/expensesAdmin/hooks.ts. */
  adminFinancialReport: (startDate: string, endDate: string) => ["admin-financial-report", startDate, endDate] as const,
  adminFinancialTrend: (monthsBack: number) => ["admin-financial-trend", monthsBack] as const,
  /** Documentos institucionales globales (políticas/reglamentos) -- dos claves separadas porque
   * Admin ve publicados+sin publicar (institutionalDocumentsAdmin) y Teacher/Student solo
   * publicados (institutionalDocuments); una mutación admin invalida ambas. */
  institutionalDocuments: () => ["institutional-documents"] as const,
  institutionalDocumentsAdmin: () => ["institutional-documents-admin"] as const,
  adminAuditLogs: () => ["admin-audit-logs"] as const,
};
