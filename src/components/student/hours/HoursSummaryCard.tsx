import { StatCard } from "@/components/ui/surfaces/StatCard";
import { formatMinutesAsHours } from "@/lib/format/minutes";
import type { StudentHoursSummary } from "@/server/hours/types";

/** Puramente de presentación -- summary ya viene calculado desde el servidor
 * (getStudentHoursSummary), este componente solo formatea y distribuye en tarjetas. */
export function HoursSummaryCard({ summary }: { summary: StudentHoursSummary }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--space-4)" }}>
      <StatCard label="Minutos disponibles" value={formatMinutesAsHours(summary.availableMinutes)} icon="clock" tone="brand" />
      <StatCard label="Paquetes activos" value={summary.activePackages} icon="package" tone="accent" />
      <StatCard label="Paquetes agotados" value={summary.exhaustedPackages} icon="package" tone="accent" />
      <StatCard label="Paquetes vencidos" value={summary.expiredPackages} icon="package" tone="accent" />
    </div>
  );
}
