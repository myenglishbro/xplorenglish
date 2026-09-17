import { Link, useParams } from "react-router-dom";
import { Icon } from "@/components/ui/core/Icon";
import { Spinner } from "@/components/ui/feedback/Spinner";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { Alert } from "@/components/ui/feedback/Alert";
import { TeacherPaymentStatement } from "@/components/admin/payroll/TeacherPaymentStatement";
import { useTeacherName, useTeacherPaymentStatement } from "@/features/payrollAdmin/hooks";

/**
 * Estado de cuenta de un profesor (Slice E). Reemplaza el detalle de "periodo de pago" viejo --
 * la ruta ahora identifica directamente al profesor, no un periodo.
 */
export function PagoDocenteDetailPage() {
  const { id: teacherId } = useParams<{ id: string }>();
  const nameQuery = useTeacherName(teacherId);
  const statementQuery = useTeacherPaymentStatement(teacherId);

  if (!teacherId) {
    return (
      <EmptyState icon="warning" title="Este profesor no existe">
        Vuelve al listado de Pagos a profesores.
      </EmptyState>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div>
        <Link
          to="/admin/pagos-docentes"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, font: "var(--weight-semibold) 13px/1 var(--font-body)", color: "var(--text-muted)", textDecoration: "none" }}
        >
          <Icon name="arrow-left" size={14} /> Volver a Pagos a profesores
        </Link>
        <h1
          style={{
            marginTop: 8,
            font: "var(--weight-bold) var(--text-h2-size)/var(--text-h2-lh) var(--font-display)",
            letterSpacing: "var(--text-h2-ls)",
            color: "var(--text-heading)",
          }}
        >
          {nameQuery.data ?? "…"}
        </h1>
      </div>

      {statementQuery.isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-6) 0" }}>
          <Spinner size={28} label="Cargando…" />
        </div>
      ) : statementQuery.isError || !statementQuery.data ? (
        <Alert tone="danger">No pudimos cargar el estado de cuenta. Recarga la página para intentarlo de nuevo.</Alert>
      ) : (
        <TeacherPaymentStatement teacherId={teacherId} rows={statementQuery.data} />
      )}
    </div>
  );
}
