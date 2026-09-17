import { Spinner } from "@/components/ui/feedback/Spinner";
import { Alert } from "@/components/ui/feedback/Alert";
import { TeacherPaymentSummaryList } from "@/components/admin/payroll/TeacherPaymentSummaryList";
import { useTeacherPaymentSummaries } from "@/features/payrollAdmin/hooks";

/**
 * Admin -> Pagos a profesores (Slice E). Reemplaza por completo el flujo viejo de
 * periodos/recibos/aprobación: una sola lista por profesor, con sus clases pendientes calculadas
 * directamente desde class_records (admin_teacher_payment_summary).
 */
export function PagosDocentesListPage() {
  const summaryQuery = useTeacherPaymentSummaries();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div>
        <h1
          style={{
            font: "var(--weight-bold) var(--text-h2-size)/var(--text-h2-lh) var(--font-display)",
            letterSpacing: "var(--text-h2-ls)",
            color: "var(--text-heading)",
            margin: 0,
          }}
        >
          Pagos a profesores
        </h1>
        <p style={{ margin: "4px 0 0", color: "var(--text-muted)" }}>Selecciona un profesor para ver sus clases y marcar cuáles pagar.</p>
      </div>

      {summaryQuery.isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-6) 0" }}>
          <Spinner size={28} label="Cargando…" />
        </div>
      ) : summaryQuery.isError || !summaryQuery.data ? (
        <Alert tone="danger">No pudimos cargar los pagos a profesores. Recarga la página para intentarlo de nuevo.</Alert>
      ) : (
        <TeacherPaymentSummaryList items={summaryQuery.data} />
      )}
    </div>
  );
}
