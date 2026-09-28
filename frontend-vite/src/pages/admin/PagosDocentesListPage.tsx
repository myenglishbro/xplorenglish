import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Spinner } from "@/components/ui/feedback/Spinner";
import { Alert } from "@/components/ui/feedback/Alert";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { TeacherPaymentSummaryList } from "@/components/admin/payroll/TeacherPaymentSummaryList";
import { TeachersFilterBar } from "@/components/admin/teachers/TeachersFilterBar";
import { Pagination } from "@/components/admin/users/Pagination";
import { useTeacherPaymentSummaries } from "@/features/payrollAdmin/hooks";

const PAGE_SIZE = 20;

/**
 * Admin -> Pagos a profesores (Slice E). Reemplaza por completo el flujo viejo de
 * periodos/recibos/aprobación: una sola lista por profesor, con sus clases pendientes calculadas
 * directamente desde class_records (admin_teacher_payment_summary).
 *
 * Búsqueda + paginación CLIENT-SIDE sobre el resultado ya cargado -- deliberado: esta pantalla no
 * lista pagos (dataset que crece sin límite), lista UNA FILA POR DOCENTE ACTIVO, acotada por el
 * mismo universo que Admin > Docentes. Paginar/buscar de verdad en la DB exigiría agregar
 * parámetros de búsqueda/paginación al RPC admin_teacher_payment_summary (cambiar su firma), que
 * es exactamente el tipo de cambio de RPC que este trabajo evita salvo autorización explícita
 * (ver reporte final). Si el número de docentes activos creciera a cientos, esa migración de RPC
 * sería la optimización recomendada -- no es necesaria hoy.
 */
export function PagosDocentesListPage() {
  const summaryQuery = useTeacherPaymentSummaries();
  const [searchParams] = useSearchParams();
  const search = searchParams.get("q") ?? "";
  const page = Number(searchParams.get("page")) > 0 ? Number(searchParams.get("page")) : 1;

  const filtered = useMemo(() => {
    const all = summaryQuery.data ?? [];
    const term = search.trim().toLowerCase();
    return term ? all.filter((t) => t.teacherName.toLowerCase().includes(term)) : all;
  }, [summaryQuery.data, search]);

  const totalCount = filtered.length;
  const from = (page - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(from, from + PAGE_SIZE);

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

      <TeachersFilterBar />

      {summaryQuery.isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-6) 0" }}>
          <Spinner size={28} label="Cargando…" />
        </div>
      ) : summaryQuery.isError || !summaryQuery.data ? (
        <Alert tone="danger">No pudimos cargar los pagos a profesores. Recarga la página para intentarlo de nuevo.</Alert>
      ) : pageItems.length === 0 ? (
        search ? (
          <EmptyState icon="credit-card" title="No se encontraron docentes">
            No hay docentes que coincidan con "{search}".
          </EmptyState>
        ) : (
          <EmptyState icon="credit-card" title="Todavía no hay profesores">
            Cuando haya profesores activos, aparecerán acá con sus clases pendientes de pago.
          </EmptyState>
        )
      ) : (
        <>
          <TeacherPaymentSummaryList items={pageItems} />
          <Pagination page={page} pageSize={PAGE_SIZE} totalCount={totalCount} basePath="/admin/pagos-docentes" searchParams={{ q: search || undefined }} />
        </>
      )}
    </div>
  );
}
