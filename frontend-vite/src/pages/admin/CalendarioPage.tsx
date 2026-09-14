import { useSearchParams } from "react-router-dom";
import { getWeekRangeInLima } from "@/lib/datetime/lima";
import { useWeekSessions, useClassroomOptions, usePrimaryTeacherByClassroom, useAllClassSchedules } from "@/features/schedulingAdmin/hooks";
import { useAssignableTeachers } from "@/features/classroomsAdmin/hooks";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { Spinner } from "@/components/ui/feedback/Spinner";
import { CalendarFilters } from "@/components/admin/scheduling/CalendarFilters";
import { WeekNav } from "@/components/admin/scheduling/WeekNav";
import { SessionsWeekTable } from "@/components/admin/scheduling/SessionsWeekTable";
import { CreateSessionButton } from "@/components/admin/scheduling/CreateSessionButton";
import { ClassSchedulesButton } from "@/components/admin/scheduling/ClassSchedulesButton";
import { GenerateSessionsButton } from "@/components/admin/scheduling/GenerateSessionsButton";

/** Portado de src/app/admin/calendario/page.tsx. */
export function CalendarioPage() {
  const [searchParams] = useSearchParams();
  const anchor = searchParams.get("week") ? new Date(`${searchParams.get("week")}T12:00:00Z`) : new Date();
  const { start: weekStart, end: weekEnd } = getWeekRangeInLima(anchor);

  const classroomId = searchParams.get("classroomId") ? Number(searchParams.get("classroomId")) : undefined;
  const teacherId = searchParams.get("teacherId") || undefined;

  const sessionsQuery = useWeekSessions({ weekStart, weekEnd, classroomId, teacherId });
  const classroomsQuery = useClassroomOptions();
  const teachersQuery = useAssignableTeachers();
  const primaryTeacherQuery = usePrimaryTeacherByClassroom();
  const schedulesQuery = useAllClassSchedules();

  const classrooms = classroomsQuery.data ?? [];
  const teachers = teachersQuery.data ?? [];
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
          <CreateSessionButton classrooms={classrooms} teacherOptions={teacherOptions} primaryTeacherByClassroom={primaryTeacherQuery.data ?? {}} />
          <ClassSchedulesButton classrooms={classrooms} schedules={schedulesQuery.data ?? []} />
          <GenerateSessionsButton classrooms={classrooms} />
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "var(--space-3)" }}>
        <WeekNav
          weekStartIso={weekStart.toISOString()}
          basePath="/admin/calendario"
          searchParams={{ classroomId: searchParams.get("classroomId") ?? undefined, teacherId: searchParams.get("teacherId") ?? undefined }}
        />
        <CalendarFilters classrooms={classrooms} teachers={teacherOptions} />
      </div>

      {sessionsQuery.isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-6) 0" }}>
          <Spinner size={28} label="Cargando…" />
        </div>
      ) : sessionsQuery.isError || !sessionsQuery.data ? (
        <EmptyState icon="warning" title="No pudimos cargar las sesiones">Recarga la página para intentarlo de nuevo.</EmptyState>
      ) : sessionsQuery.data.length === 0 ? (
        <EmptyState icon="calendar-blank" title="Sin sesiones esta semana">
          Crea una sesión individual para esta semana.
        </EmptyState>
      ) : (
        <SessionsWeekTable sessions={sessionsQuery.data} teacherOptions={teacherOptions} />
      )}
    </div>
  );
}
