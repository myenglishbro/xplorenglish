import { createClient } from "@/lib/supabase/server";
import { getStudentHoursPackages, getStudentAttendanceHistory, summarizeHoursPackages } from "@/server/hours/queries";
import { Card } from "@/components/ui/surfaces/Card";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { HoursSummaryCard } from "@/components/student/hours/HoursSummaryCard";
import { PackagesTable } from "@/components/student/hours/PackagesTable";
import { AttendanceHistoryTable } from "@/components/student/hours/AttendanceHistoryTable";

/**
 * 100% solo lectura. Ningún studentId se recibe de fuera -- las 3 queries dejan que RLS
 * (hours_packages_select_own / hours_movements_select_own / session_attendance_select) filtre
 * por auth.uid() del usuario ya autenticado (StudentLayout ya exige requireRole("student")).
 */
export default async function StudentHorasPage() {
  const supabase = createClient();
  const [packages, history] = await Promise.all([getStudentHoursPackages(supabase), getStudentAttendanceHistory(supabase)]);
  const summary = summarizeHoursPackages(packages);

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
        Mis horas
      </h1>

      <HoursSummaryCard summary={summary} />

      <Card header={<span style={{ font: "var(--weight-bold) 15px/1 var(--font-display)", color: "var(--text-heading)" }}>Mis paquetes</span>} pad={packages.length === 0}>
        {packages.length === 0 ? (
          <EmptyState icon="package" title="Todavía no tienes paquetes de horas">
            Cuando compres un paquete, aparecerá aquí junto con tu saldo restante.
          </EmptyState>
        ) : (
          <PackagesTable packages={packages} />
        )}
      </Card>

      <Card
        header={<span style={{ font: "var(--weight-bold) 15px/1 var(--font-display)", color: "var(--text-heading)" }}>Historial de clases y horas</span>}
        pad={history.length === 0}
      >
        {history.length === 0 ? (
          <EmptyState icon="clock-counter-clockwise" title="Todavía no hay historial">
            Cuando asistas a una clase, tu asistencia y minutos cobrados aparecerán aquí.
          </EmptyState>
        ) : (
          <AttendanceHistoryTable items={history} />
        )}
      </Card>
    </div>
  );
}
