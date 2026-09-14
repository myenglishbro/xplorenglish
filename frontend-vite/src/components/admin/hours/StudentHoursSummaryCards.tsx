import { StatCard } from "@/components/ui/surfaces/StatCard";
import { formatMinutesAsHours } from "@/lib/format/minutes";

export interface StudentHoursSummary {
  acquiredMinutes: number;
  consumedMinutes: number;
  availableMinutes: number;
}

/** Puramente de presentación -- summary se deriva sumando los paquetes ya cargados
 * (listHourPackagesForAdmin), nunca se calcula ni se escribe nada acá. availableMinutes es la
 * suma de remainingMinutes (ledger), la única fuente de verdad del saldo. */
export function StudentHoursSummaryCards({ summary }: { summary: StudentHoursSummary }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--space-4)" }}>
      <StatCard label="Horas adquiridas" value={formatMinutesAsHours(summary.acquiredMinutes)} icon="package" tone="accent" />
      <StatCard label="Horas consumidas" value={formatMinutesAsHours(summary.consumedMinutes)} icon="clock-counter-clockwise" tone="accent" />
      <StatCard label="Horas disponibles" value={formatMinutesAsHours(summary.availableMinutes)} icon="clock" tone="brand" />
    </div>
  );
}
