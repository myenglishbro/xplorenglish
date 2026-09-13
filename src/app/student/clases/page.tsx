import { createClient } from "@/lib/supabase/server";
import { getRoleSessions } from "@/server/scheduling/queries";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { Card } from "@/components/ui/surfaces/Card";
import { StudentSessionsTable } from "@/components/student/scheduling/StudentSessionsTable";

export default async function StudentClasesPage() {
  const supabase = createClient();
  const { upcoming, past } = await getRoleSessions(supabase, new Date());

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
            Cuando tu docente programe una clase, aparecerá aquí.
          </EmptyState>
        ) : (
          <StudentSessionsTable sessions={upcoming} />
        )}
      </Card>

      <Card header={<span style={{ font: "var(--weight-bold) 15px/1 var(--font-display)", color: "var(--text-heading)" }}>Clases pasadas</span>} pad={past.length === 0}>
        {past.length === 0 ? (
          <EmptyState icon="clock-counter-clockwise" title="Sin clases pasadas todavía" />
        ) : (
          <StudentSessionsTable sessions={past} />
        )}
      </Card>
    </div>
  );
}
