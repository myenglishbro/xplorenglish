import { createClient } from "@/lib/supabase/server";
import { getWeekRangeInLima } from "@/lib/datetime/lima";
import {
  getWeekSessions,
  getClassroomOptions,
  getAllClassSchedules,
  getPrimaryTeacherByClassroom,
} from "@/server/scheduling/queries";
import { listAssignableTeachers } from "@/server/admin/classrooms/queries";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { CalendarFilters } from "@/components/admin/scheduling/CalendarFilters";
import { WeekNav } from "@/components/admin/scheduling/WeekNav";
import { SessionsWeekTable } from "@/components/admin/scheduling/SessionsWeekTable";
import { CreateSessionButton } from "@/components/admin/scheduling/CreateSessionButton";
import { ClassSchedulesButton } from "@/components/admin/scheduling/ClassSchedulesButton";
import { GenerateSessionsButton } from "@/components/admin/scheduling/GenerateSessionsButton";

export interface AdminCalendarioPageProps {
  searchParams: { week?: string; classroomId?: string; teacherId?: string };
}

export default async function AdminCalendarioPage({ searchParams }: AdminCalendarioPageProps) {
  const anchor = searchParams.week ? new Date(`${searchParams.week}T12:00:00Z`) : new Date();
  const { start: weekStart, end: weekEnd } = getWeekRangeInLima(anchor);

  const classroomId = searchParams.classroomId ? Number(searchParams.classroomId) : undefined;
  const teacherId = searchParams.teacherId || undefined;

  const supabase = createClient();
  const [sessions, classrooms, teachers, schedules, primaryTeacherByClassroom] = await Promise.all([
    getWeekSessions(supabase, { weekStart, weekEnd, classroomId, teacherId }),
    getClassroomOptions(supabase),
    listAssignableTeachers(supabase),
    getAllClassSchedules(supabase),
    getPrimaryTeacherByClassroom(supabase),
  ]);

  const teacherOptions = teachers.map((t) => ({ id: t.id, name: `${t.firstName} ${t.lastName}` }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "var(--space-3)" }}>
        <h1
          style={{
            font: "var(--weight-bold) var(--text-h2-size)/var(--text-h2-lh) var(--font-display)",
            letterSpacing: "var(--text-h2-ls)",
            color: "var(--text-heading)",
            margin: 0,
          }}
        >
          Calendario
        </h1>
        <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
          <CreateSessionButton classrooms={classrooms} teacherOptions={teacherOptions} primaryTeacherByClassroom={primaryTeacherByClassroom} />
          <ClassSchedulesButton classrooms={classrooms} schedules={schedules} />
          <GenerateSessionsButton classrooms={classrooms} />
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "var(--space-3)" }}>
        <WeekNav
          weekStartIso={weekStart.toISOString()}
          basePath="/admin/calendario"
          searchParams={{ classroomId: searchParams.classroomId, teacherId: searchParams.teacherId }}
        />
        <CalendarFilters classrooms={classrooms} teachers={teacherOptions} />
      </div>

      {sessions.length === 0 ? (
        <EmptyState icon="calendar-blank" title="Sin sesiones esta semana">
          Crea una sesión individual o genera varias desde los horarios semanales configurados.
        </EmptyState>
      ) : (
        <SessionsWeekTable sessions={sessions} teacherOptions={teacherOptions} />
      )}
    </div>
  );
}
