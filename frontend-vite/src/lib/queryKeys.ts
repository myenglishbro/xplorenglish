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
  adminClassroomCompatibility: (id: number) => ["admin-classroom-compatibility", id] as const,
  adminProgramsPanel: () => ["admin-programs-panel"] as const,
  adminStudentPayments: (filters: { studentId?: string; status?: string }) => ["admin-student-payments", filters] as const,
  adminPaymentDetail: (id: number) => ["admin-payment", id] as const,
  adminPayrollPeriods: () => ["admin-payroll-periods"] as const,
  adminTeacherDebtSummary: () => ["admin-teacher-debt-summary"] as const,
  adminWeekSessions: (filters: { weekStart: string; weekEnd: string; classroomId?: number; teacherId?: string }) =>
    ["admin-week-sessions", filters] as const,
  adminClassroomOptions: () => ["admin-classroom-options"] as const,
  adminAllClassSchedules: () => ["admin-all-class-schedules"] as const,
  adminClassSchedules: (classroomId: number) => ["admin-class-schedules", classroomId] as const,
  adminPrimaryTeacherByClassroom: () => ["admin-primary-teacher-by-classroom"] as const,
  adminSessionDetail: (id: number) => ["admin-session", id] as const,
  adminSessionAttendanceRoster: (id: number) => ["admin-session-attendance", id] as const,
  adminHourPackages: () => ["admin-hour-packages"] as const,
  adminStudentHoursMovements: (studentId: string) => ["admin-student-hours-movements", studentId] as const,
  adminExpenses: () => ["admin-expenses"] as const,
  /** Prefijo estable "admin-financial-report" -- las mutaciones de gastos invalidan por prefijo
   * (sin startDate/endDate) para refrescar el reporte sin importar qué periodo esté viendo el
   * admin en ese momento; ver features/expensesAdmin/hooks.ts. */
  adminFinancialReport: (startDate: string, endDate: string) => ["admin-financial-report", startDate, endDate] as const,
  adminFinancialTrend: (monthsBack: number) => ["admin-financial-trend", monthsBack] as const,
};
