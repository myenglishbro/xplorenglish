import { Link } from "react-router-dom";
import { useHoursPackages, useStudentBalance } from "@/features/hours/hooks";
import { summarizeHoursPackages } from "@/server/hours/queries";
import { Button } from "@/components/ui/core/Button";
import { Spinner } from "@/components/ui/feedback/Spinner";
import { Alert } from "@/components/ui/feedback/Alert";
import { HoursSummaryCard } from "@/components/student/hours/HoursSummaryCard";

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
