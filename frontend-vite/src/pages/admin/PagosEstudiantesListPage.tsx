import { useSearchParams } from "react-router-dom";
import { useStudentPayments } from "@/features/paymentsAdmin/hooks";
import { useAssignableStudents } from "@/features/classroomsAdmin/hooks";
import type { PaymentStatus, ReceiptStatusFilter } from "@/server/payments/types";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { Spinner } from "@/components/ui/feedback/Spinner";
import { Card } from "@/components/ui/surfaces/Card";
import { PaymentsFilterBar } from "@/components/admin/payments/PaymentsFilterBar";
import { PaymentsTable } from "@/components/admin/payments/PaymentsTable";
import { CreateHourPackageButton } from "@/components/admin/payments/CreateHourPackageButton";
import { Pagination } from "@/components/admin/users/Pagination";

const VALID_STATUSES: PaymentStatus[] = ["pending", "completed", "failed", "refunded"];
const VALID_RECEIPT_STATUSES: ReceiptStatusFilter[] = ["pending", "issued", "sent", "not_applicable", "unregistered"];

/** Portado de src/app/admin/pagos-estudiantes/page.tsx. Paginación server-side (page en la URL,
 * mismo patrón que Usuarios/Estudiantes) -- placeholderData mantiene la tabla anterior visible
 * mientras llega la página siguiente, en vez de reemplazar toda la pantalla por un spinner. */
export function PagosEstudiantesListPage() {
  const [searchParams] = useSearchParams();
  const statusParam = searchParams.get("status");
  const status = VALID_STATUSES.includes(statusParam as PaymentStatus) ? (statusParam as PaymentStatus) : undefined;
  const receiptStatusParam = searchParams.get("receiptStatus");
  const receiptStatus = VALID_RECEIPT_STATUSES.includes(receiptStatusParam as ReceiptStatusFilter) ? (receiptStatusParam as ReceiptStatusFilter) : undefined;
  const studentId = searchParams.get("studentId") ?? undefined;
  const page = Number(searchParams.get("page")) > 0 ? Number(searchParams.get("page")) : 1;
  const hasFilters = !!studentId || !!status || !!receiptStatus;

  const paymentsQuery = useStudentPayments({ studentId, status, receiptStatus, page });
  const studentsQuery = useAssignableStudents();
  const students = studentsQuery.data ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "var(--space-3)" }}>
        <h1
          style={{
            font: "var(--weight-bold) var(--text-h2-size)/var(--text-h2-lh) var(--font-display)",
            letterSpacing: "var(--text-h2-ls)",
            color: "var(--text-heading)",
            margin: 0,
          }}
        >
          Pagos de estudiantes
        </h1>
        <CreateHourPackageButton students={students} />
      </div>

      <PaymentsFilterBar students={students} />

      {paymentsQuery.isPending ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-6) 0" }}>
          <Spinner size={28} label="Cargando…" />
        </div>
      ) : paymentsQuery.isError || !paymentsQuery.data ? (
        <EmptyState icon="warning" title="No pudimos cargar los pagos">Recarga la página para intentarlo de nuevo.</EmptyState>
      ) : (
        <>
          <Card pad={paymentsQuery.data.items.length === 0} style={{ opacity: paymentsQuery.isFetching ? 0.6 : 1, transition: "opacity var(--duration-fast) var(--ease-standard)" }}>
            {paymentsQuery.data.items.length === 0 ? (
              hasFilters ? (
                <EmptyState icon="credit-card" title="Sin resultados">
                  No se encontraron pagos con los filtros seleccionados.
                </EmptyState>
              ) : (
                <EmptyState icon="credit-card" title="Sin pagos todavía">
                  Registra el primer pago para crear un paquete de horas.
                </EmptyState>
              )
            ) : (
              <PaymentsTable payments={paymentsQuery.data.items} />
            )}
          </Card>

          <Pagination
            page={paymentsQuery.data.page}
            pageSize={paymentsQuery.data.pageSize}
            totalCount={paymentsQuery.data.totalCount}
            basePath="/admin/pagos-estudiantes"
            searchParams={{ studentId, status, receiptStatus }}
          />
        </>
      )}
    </div>
  );
}
