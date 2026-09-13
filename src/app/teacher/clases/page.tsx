import { createClient } from "@/lib/supabase/server";
import { getRoleSessions } from "@/server/scheduling/queries";
import { listAssignableTeachers } from "@/server/admin/classrooms/queries";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { Card } from "@/components/ui/surfaces/Card";
import { TeacherSessionsTable } from "@/components/teacher/scheduling/TeacherSessionsTable";

export default async function TeacherClasesPage() {
  const supabase = createClient();
  const [{ upcoming, past }, teachers] = await Promise.all([getRoleSessions(supabase, new Date()), listAssignableTeachers(supabase)]);

  const teacherOptions = teachers.map((t) => ({ id: t.id, name: `${t.firstName} ${t.lastName}` }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <h1
        style={{
          font: "var(--weight-bold) var(--text-h2-size)/var(--text-h2-lh) var(--font-display)",
          letterSpacing: "var(--text-h2-ls)",
          color: "var(--text-heading)",
          margin: 0,
        }}
      >
        Mis clases
      </h1>

      <Card header={<span style={{ font: "var(--weight-bold) 15px/1 var(--font-display)", color: "var(--text-heading)" }}>Próximas clases</span>} pad={upcoming.length === 0}>
        {upcoming.length === 0 ? (
          <EmptyState icon="video-camera" title="Sin clases próximas">
            Cuando tengas una sesión programada, aparecerá aquí.
          </EmptyState>
        ) : (
          <TeacherSessionsTable sessions={upcoming} teacherOptions={teacherOptions} showActions />
        )}
      </Card>

      <Card header={<span style={{ font: "var(--weight-bold) 15px/1 var(--font-display)", color: "var(--text-heading)" }}>Clases pasadas</span>} pad={past.length === 0}>
        {past.length === 0 ? (
          <EmptyState icon="clock-counter-clockwise" title="Sin clases pasadas todavía" />
        ) : (
          <TeacherSessionsTable sessions={past} teacherOptions={teacherOptions} showActions={false} />
        )}
      </Card>
    </div>
  );
}
