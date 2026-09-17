import { StatCard } from "@/components/ui/surfaces/StatCard";
import { Tag } from "@/components/ui/core/Tag";
import { Alert } from "@/components/ui/feedback/Alert";
import { formatMinutesAsHours } from "@/lib/format/minutes";
import { getStudentBalanceStatus, getStudentBalanceNotice } from "@/lib/hours/balanceStatus";
import type { StudentHoursSummary } from "@/server/hours/types";

/**
 * Puramente de presentación -- summary ya viene calculado desde el servidor
 * (getStudentHoursSummary), este componente solo formatea y distribuye en tarjetas.
 * Slice G: clasificación de saldo (Tag + aviso discreto) vía el helper central
 * getStudentBalanceStatus/getStudentBalanceNotice -- nunca recalculada acá.
 */
export function HoursSummaryCard({ summary }: { summary: StudentHoursSummary }) {
  const balanceStatus = getStudentBalanceStatus(summary.availableMinutes);
  const notice = getStudentBalanceNotice(summary.availableMinutes);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--space-4)" }}>
        <div style={{ position: "relative" }}>
          <StatCard label="Minutos disponibles" value={formatMinutesAsHours(summary.availableMinutes)} icon="clock" tone="brand" />
          <Tag tone={balanceStatus.tone} size="sm" style={{ position: "absolute", top: 14, right: 14 }}>
            {balanceStatus.label}
          </Tag>
        </div>
        <StatCard label="Paquetes activos" value={summary.activePackages} icon="package" tone="accent" />
        <StatCard label="Paquetes agotados" value={summary.exhaustedPackages} icon="package" tone="accent" />
        <StatCard label="Paquetes vencidos" value={summary.expiredPackages} icon="package" tone="accent" />
      </div>
      {notice && <Alert tone={balanceStatus.tone === "danger" ? "danger" : "warning"}>{notice}</Alert>}
    </div>
  );
}
