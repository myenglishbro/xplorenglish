import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getStudentHoursPackages, summarizeHoursPackages } from "@/server/hours/queries";
import { getRoleSessions } from "@/server/scheduling/queries";
import { Card } from "@/components/ui/surfaces/Card";
import { Button } from "@/components/ui/core/Button";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { HoursSummaryCard } from "@/components/student/hours/HoursSummaryCard";
import { StudentSessionsTable } from "@/components/student/scheduling/StudentSessionsTable";

/**
 * Dashboard simple: agrega 3 queries de solo lectura que ya existen (las mismas que usan
 * /student/horas y /student/clases) en Promise.all -- ninguna query ni componente de servidor
 * nuevo, solo composición de lo ya construido.
 */
export default async function StudentHomePage() {
  const supabase = createClient();
  const [packages, { upcoming, past }] = await Promise.all([
    getStudentHoursPackages(supabase),
    getRoleSessions(supabase, new Date()),
  ]);
  const summary = summarizeHoursPackages(packages);
  const nextSession = upcoming[0];
  const recentSessions = past.slice(0, 5);

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
        Inicio
      </h1>

      <HoursSummaryCard summary={summary} />

      <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
        <Link href="/student/salones">
          <Button variant="accent" icon="chalkboard">
            Mis salones
          </Button>
        </Link>
        <Link href="/student/horas">
          <Button variant="secondary" icon="clock">
            Mis horas
          </Button>
        </Link>
      </div>

      <Card
        header={<span style={{ font: "var(--weight-bold) 15px/1 var(--font-display)", color: "var(--text-heading)" }}>Próxima clase</span>}
        pad={!nextSession}
      >
        {!nextSession ? (
          <EmptyState icon="video-camera" title="Sin clases próximas">
            Cuando tu docente programe una clase, aparecerá aquí.
          </EmptyState>
        ) : (
          <StudentSessionsTable sessions={[nextSession]} />
        )}
      </Card>

      <Card
        header={<span style={{ font: "var(--weight-bold) 15px/1 var(--font-display)", color: "var(--text-heading)" }}>Últimas clases</span>}
        pad={recentSessions.length === 0}
      >
        {recentSessions.length === 0 ? (
          <EmptyState icon="clock-counter-clockwise" title="Sin clases pasadas todavía" />
        ) : (
          <StudentSessionsTable sessions={recentSessions} />
        )}
      </Card>
    </div>
  );
}
