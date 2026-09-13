import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPaymentDetail } from "@/server/payments/queries";
import { Icon } from "@/components/ui/core/Icon";
import { Card } from "@/components/ui/surfaces/Card";
import { Tag } from "@/components/ui/core/Tag";
import { PaymentProofSection } from "@/components/admin/payments/PaymentProofSection";
import { formatCurrencyAmount } from "@/lib/format/currency";
import { formatMinutesAsHours } from "@/lib/format/minutes";
import { formatLongDateInLima } from "@/lib/datetime/lima";

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente",
  completed: "Completado",
  failed: "Fallido",
  refunded: "Reembolsado",
};

const PACKAGE_STATUS_LABEL: Record<string, string> = {
  active: "Activo",
  exhausted: "Agotado",
  expired: "Vencido",
};

const MOVEMENT_TYPE_LABEL: Record<string, string> = {
  purchase: "Compra",
  consumption: "Consumo",
  refund: "Reembolso",
  adjustment: "Ajuste",
  expiration: "Vencimiento",
};

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "6px 0", borderTop: "1px solid var(--border-subtle)" }}>
      <span style={{ color: "var(--text-muted)", fontSize: "var(--text-body-sm-size)" }}>{label}</span>
      <span style={{ font: "var(--weight-semibold) var(--text-body-sm-size)/1.3 var(--font-body)", color: "var(--text-heading)" }}>{value}</span>
    </div>
  );
}

export default async function AdminPaymentDetailPage({ params }: { params: { id: string } }) {
  const paymentId = Number(params.id);
  if (!Number.isFinite(paymentId)) notFound();

  const supabase = createClient();
  const payment = await getPaymentDetail(supabase, paymentId);
  if (!payment) notFound();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div>
        <Link
          href="/admin/pagos-estudiantes"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, font: "var(--weight-semibold) 13px/1 var(--font-body)", color: "var(--text-muted)", textDecoration: "none" }}
        >
          <Icon name="arrow-left" size={14} /> Volver a pagos
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
            {payment.studentName}
          </h1>
          <Tag tone={payment.status === "completed" ? "success" : payment.status === "pending" ? "warning" : payment.status === "failed" ? "danger" : "neutral"}>
            {PAYMENT_STATUS_LABEL[payment.status]}
          </Tag>
        </div>
      </div>

      <Card header={<span style={{ font: "var(--weight-bold) 15px/1 var(--font-display)", color: "var(--text-heading)" }}>Pago</span>}>
        <DetailRow label="Estudiante" value={payment.studentName} />
        <DetailRow label="Monto" value={formatCurrencyAmount(payment.amount, payment.currency)} />
        <DetailRow label="Moneda" value={payment.currency} />
        <DetailRow label="Método de pago" value={payment.paymentMethod} />
        <DetailRow label="Estado" value={PAYMENT_STATUS_LABEL[payment.status]} />
        <DetailRow label="Referencia" value={payment.reference ?? "—"} />
        <DetailRow label="Pagado el" value={payment.paidAt ? formatLongDateInLima(new Date(payment.paidAt)) : "—"} />
        <DetailRow label="Creado el" value={formatLongDateInLima(new Date(payment.createdAt))} />
      </Card>

      {payment.package ? (
        <Card header={<span style={{ font: "var(--weight-bold) 15px/1 var(--font-display)", color: "var(--text-heading)" }}>Paquete relacionado</span>}>
          <DetailRow label="Etiqueta" value={payment.package.packageLabel} />
          <DetailRow label="Minutos comprados" value={formatMinutesAsHours(payment.package.totalMinutes)} />
          <DetailRow label="Saldo actual" value={formatMinutesAsHours(payment.package.remainingMinutes)} />
          <DetailRow label="Precio pagado" value={formatCurrencyAmount(payment.package.pricePaid, payment.currency)} />
          <DetailRow label="Comprado el" value={formatLongDateInLima(new Date(payment.package.purchasedAt))} />
          <DetailRow label="Vence" value={payment.package.expiresAt ? formatLongDateInLima(new Date(payment.package.expiresAt)) : "—"} />
          <DetailRow label="Estado del paquete" value={PACKAGE_STATUS_LABEL[payment.package.status]} />
        </Card>
      ) : (
        <Card header={<span style={{ font: "var(--weight-bold) 15px/1 var(--font-display)", color: "var(--text-heading)" }}>Paquete relacionado</span>}>
          <span style={{ color: "var(--text-muted)", fontSize: "var(--text-body-sm-size)" }}>
            Este pago no tiene ningún paquete asociado (no debería ocurrir vía el flujo normal).
          </span>
        </Card>
      )}

      <Card header={<span style={{ font: "var(--weight-bold) 15px/1 var(--font-display)", color: "var(--text-heading)" }}>Movimientos de horas</span>}>
        {payment.ledger.length === 0 ? (
          <span style={{ color: "var(--text-muted)", fontSize: "var(--text-body-sm-size)" }}>Sin movimientos.</span>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {payment.ledger.map((movement) => (
              <div key={movement.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, borderTop: "1px solid var(--border-subtle)", paddingTop: 6 }}>
                <span style={{ font: "var(--weight-semibold) var(--text-body-sm-size)/1.3 var(--font-body)", color: "var(--text-heading)" }}>
                  {MOVEMENT_TYPE_LABEL[movement.movementType] ?? movement.movementType}
                </span>
                <span style={{ color: "var(--text-muted)", fontSize: "var(--text-caption-size)" }}>
                  {movement.minutesDelta > 0 ? "+" : ""}
                  {movement.minutesDelta} min · {movement.createdByName} · {formatLongDateInLima(new Date(movement.createdAt))}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card header={<span style={{ font: "var(--weight-bold) 15px/1 var(--font-display)", color: "var(--text-heading)" }}>Comprobante</span>}>
        <PaymentProofSection studentId={payment.studentId} paymentId={payment.id} hasProof={payment.hasProof} />
      </Card>
    </div>
  );
}
