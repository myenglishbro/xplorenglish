import { useHoursPackages, useAttendanceHistory, useStudentBalance } from "@/features/hours/hooks";
import { summarizeHoursPackages } from "@/server/hours/queries";
import { Card } from "@/components/ui/surfaces/Card";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { Spinner } from "@/components/ui/feedback/Spinner";
import { Alert } from "@/components/ui/feedback/Alert";
import { HoursSummaryCard } from "@/components/student/hours/HoursSummaryCard";
import { PackagesTable } from "@/components/student/hours/PackagesTable";
import { AttendanceHistoryTable } from "@/components/student/hours/AttendanceHistoryTable";

export function StudentHorasPage() {
  const packagesQuery = useHoursPackages();
  const historyQuery = useAttendanceHistory();
  const balanceQuery = useStudentBalance();

  const isLoading = packagesQuery.isLoading || historyQuery.isLoading || balanceQuery.isLoading;
  const hasData = packagesQuery.data && historyQuery.data && balanceQuery.data !== undefined;
  const isError = packagesQuery.isError || historyQuery.isError || balanceQuery.isError || !hasData;

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

      {isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-5) 0" }}>
          <Spinner size={24} label="Cargando horas…" />
        </div>
      ) : isError || !packagesQuery.data || !historyQuery.data || balanceQuery.data === undefined ? (
        <Alert tone="danger">No pudimos cargar tus horas. Recarga la página.</Alert>
      ) : (
        <>
          <HoursSummaryCard summary={summarizeHoursPackages(packagesQuery.data, balanceQuery.data)} />

          <Card header={<span style={{ font: "var(--weight-bold) 15px/1 var(--font-display)", color: "var(--text-heading)" }}>Mis paquetes</span>} pad={packagesQuery.data.length === 0}>
            {packagesQuery.data.length === 0 ? (
              <EmptyState icon="package" title="Todavía no tienes paquetes de horas">
                Cuando compres un paquete, aparecerá aquí junto con tu saldo restante.
              </EmptyState>
            ) : (
              <PackagesTable packages={packagesQuery.data} />
            )}
          </Card>

          <Card
            header={<span style={{ font: "var(--weight-bold) 15px/1 var(--font-display)", color: "var(--text-heading)" }}>Historial de clases y horas</span>}
            pad={historyQuery.data.length === 0}
          >
            {historyQuery.data.length === 0 ? (
              <EmptyState icon="clock-counter-clockwise" title="Todavía no hay historial">
                Cuando asistas a una clase, tu asistencia y minutos cobrados aparecerán aquí.
              </EmptyState>
            ) : (
              <AttendanceHistoryTable items={historyQuery.data} />
            )}
          </Card>
        </>
      )}
    </div>
  );
}
