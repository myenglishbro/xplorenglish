import { Link } from "react-router-dom";
import { useHoursPackages, useStudentBalance } from "@/features/hours/hooks";
import { useMyWeeklyScheduleAsStudent } from "@/features/classrooms/hooks";
import { summarizeHoursPackages } from "@/server/hours/queries";
import { Card } from "@/components/ui/surfaces/Card";
import { Button } from "@/components/ui/core/Button";
import { Spinner } from "@/components/ui/feedback/Spinner";
import { Alert } from "@/components/ui/feedback/Alert";
import { HoursSummaryCard } from "@/components/student/hours/HoursSummaryCard";
import { WeeklySchedule } from "@/components/schedule/WeeklySchedule";

function cardTitle(text: string) {
  return (
    <h2 style={{ margin: 0, font: "var(--weight-bold) var(--text-h4-size)/var(--text-h4-lh) var(--font-display)", color: "var(--text-heading)" }}>
      {text}
    </h2>
  );
}

function teacherNamesLabel(names: string[]): string {
  if (names.length === 0) return "Sin docente asignado";
  if (names.length === 1) return names[0]!;
  return `${names[0]} +${names.length - 1}`;
}

/**
 * Slice F: se retira "Próxima clase"/"Últimas clases" (dependían de sessions, eliminada en
 * Slice A) -- el historial de clases ahora vive dentro de cada salón (ver SalonDetailPage).
 * Slice F.1: el saldo mostrado (HoursSummaryCard) es el saldo TOTAL real del ledger
 * (useStudentBalance/getStudentTotalBalance), nunca la suma de remainingMinutes por paquete --
 * esa suma nunca reflejaba el consumo de register_class/correct_class (ver server/hours/queries.ts).
 */
export function StudentHomePage() {
  const packagesQuery = useHoursPackages();
  const balanceQuery = useStudentBalance();
  const scheduleQuery = useMyWeeklyScheduleAsStudent();

  if (packagesQuery.isLoading || balanceQuery.isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-6) 0" }}>
        <Spinner size={28} label="Cargando…" />
      </div>
    );
  }

  if (packagesQuery.isError || !packagesQuery.data || balanceQuery.isError || balanceQuery.data === undefined) {
    return <Alert tone="danger">No pudimos cargar tu inicio. Recarga la página.</Alert>;
  }

  const summary = summarizeHoursPackages(packagesQuery.data, balanceQuery.data);

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

      <Card header={cardTitle("Mi horario semanal")}>
        {scheduleQuery.isLoading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-5) 0" }}>
            <Spinner size={24} label="Cargando…" />
          </div>
        ) : scheduleQuery.isError || !scheduleQuery.data ? (
          <Alert tone="danger">No pudimos cargar tu horario. Recarga la página para intentarlo de nuevo.</Alert>
        ) : (
          <WeeklySchedule
            blocks={scheduleQuery.data}
            emptyTitle="No tienes clases programadas en tu horario semanal."
            renderBlock={(block) => (
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <span style={{ font: "var(--weight-bold) 11px/1.25 var(--font-body)", color: "var(--text-heading)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {block.startTime.slice(0, 5)}–{block.endTime.slice(0, 5)}
                </span>
                <span style={{ font: "var(--weight-semibold) 10.5px/1.25 var(--font-body)", color: "var(--text-body)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {block.classroomName}
                </span>
                <span style={{ font: "var(--weight-regular) 10px/1.25 var(--font-body)", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {teacherNamesLabel(block.teacherNames)}
                </span>
              </div>
            )}
          />
        )}
      </Card>

      <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
        <Link to="/student/salones">
          <Button variant="accent" icon="chalkboard">Mis salones</Button>
        </Link>
        <Link to="/student/horas">
          <Button variant="secondary" icon="clock">Mis horas</Button>
        </Link>
      </div>
    </div>
  );
}
