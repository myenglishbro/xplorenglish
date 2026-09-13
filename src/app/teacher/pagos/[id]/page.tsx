import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAuthUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getPayrollPeriodDetail } from "@/server/payroll/queries";
import { PAYROLL_STATUS_LABEL, PAYROLL_STATUS_TONE } from "@/server/payroll/types";
import { formatMinutesAsHours } from "@/lib/format/minutes";
import { formatCurrencyAmount } from "@/lib/format/currency";
import { formatShortDateInLima, formatTimeInLima, formatLongDateInLima } from "@/lib/datetime/lima";
import { Card } from "@/components/ui/surfaces/Card";
import { Tag } from "@/components/ui/core/Tag";
import { Icon } from "@/components/ui/core/Icon";
import { TeacherReceiptSection } from "@/components/teacher/payroll/TeacherReceiptSection";

function cardTitle(text: string) {
  return (
    <h2 style={{ margin: 0, font: "var(--weight-bold) var(--text-h4-size)/var(--text-h4-lh) var(--font-display)", color: "var(--text-heading)" }}>
      {text}
    </h2>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "6px 0", borderTop: "1px solid var(--border-subtle)" }}>
      <span style={{ color: "var(--text-muted)", fontSize: "var(--text-body-sm-size)" }}>{label}</span>
      <span style={{ font: "var(--weight-semibold) var(--text-body-sm-size)/1.3 var(--font-body)", color: "var(--text-heading)" }}>{value}</span>
    </div>
  );
}

/** period_start/period_end son `date` puro -- formatear con split simple, nunca con
 * new Date()/timeZone (mismo criterio que el resto de pantallas de payroll). */
function formatDateOnly(d: string): string {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

export default async function TeacherPayrollPeriodDetailPage({ params }: { params: { id: string } }) {
  const periodId = Number(params.id);
  if (!Number.isFinite(periodId)) notFound();

  const authUser = await getAuthUser();
  const supabase = createClient();
  const period = authUser ? await getPayrollPeriodDetail(supabase, periodId) : null;

  // Defensa explícita además de RLS: nunca se muestra información de un periodo que no sea del
  // caller autenticado, aunque RLS ya lo bloquearía (teacher_payment_periods_select_own, 0008).
  if (!period || !authUser || period.teacherId !== authUser.id) {
    notFound();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div>
        <Link
          href="/teacher/pagos"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, font: "var(--weight-semibold) 13px/1 var(--font-body)", color: "var(--text-muted)", textDecoration: "none" }}
        >
          <Icon name="arrow-left" size={14} /> Volver a Mis pagos
        </Link>
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12, marginTop: 8 }}>
          <h1
            style={{
              font: "var(--weight-bold) var(--text-h2-size)/var(--text-h2-lh) var(--font-display)",
              letterSpacing: "var(--text-h2-ls)",
              color: "var(--text-heading)",
              margin: 0,
            }}
          >
            {formatDateOnly(period.periodStart)} – {formatDateOnly(period.periodEnd)}
          </h1>
          <Tag tone={PAYROLL_STATUS_TONE[period.status]}>{PAYROLL_STATUS_LABEL[period.status]}</Tag>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "var(--space-5)" }}>
        <Card header={cardTitle("Resumen")}>
          <DetailRow label="Inicio" value={formatDateOnly(period.periodStart)} />
          <DetailRow label="Fin" value={formatDateOnly(period.periodEnd)} />
          <DetailRow label="Total horas" value={formatMinutesAsHours(period.totalMinutes)} />
          <DetailRow label="Monto total" value={formatCurrencyAmount(period.totalAmount, "PEN")} />
          <DetailRow label="Estado" value={PAYROLL_STATUS_LABEL[period.status]} />
          {period.paidAt && <DetailRow label="Pagado el" value={formatLongDateInLima(new Date(period.paidAt))} />}
        </Card>

        <Card header={cardTitle("Recibo")}>
          <TeacherReceiptSection periodId={period.id} teacherId={period.teacherId} status={period.status} receipt={period.receipt} />
        </Card>
      </div>

      <Card header={cardTitle("Clases incluidas")}>
        {period.hours.length === 0 ? (
          <span style={{ color: "var(--text-muted)", fontSize: "var(--text-body-sm-size)" }}>Sin clases asociadas.</span>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {period.hours.map((hour) => (
              <div
                key={hour.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "10px 14px",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  background: "var(--surface-card)",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ whiteSpace: "nowrap", color: "var(--text-muted)", fontSize: "var(--text-body-sm-size)" }}>
                    {formatShortDateInLima(hour.sessionDate)} · {formatTimeInLima(hour.sessionDate)}
                  </span>
                  <span style={{ font: "var(--weight-semibold) var(--text-body-sm-size)/1.3 var(--font-body)", color: "var(--text-heading)" }}>
                    {hour.classroomName}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: "var(--text-body-sm-size)" }}>
                  <span>{formatMinutesAsHours(hour.billableMinutes)}</span>
                  <span style={{ color: "var(--text-muted)" }}>S/ {hour.hourlyRateSnapshot.toFixed(2)}/h</span>
                  <span style={{ font: "var(--weight-semibold) var(--text-body-sm-size)/1.3 var(--font-body)", color: "var(--text-heading)" }}>
                    {formatCurrencyAmount(hour.amount, "PEN")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
