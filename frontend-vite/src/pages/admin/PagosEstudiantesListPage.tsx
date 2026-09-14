import { useSearchParams } from "react-router-dom";
import { useStudentPayments } from "@/features/paymentsAdmin/hooks";
import { useAssignableStudents } from "@/features/classroomsAdmin/hooks";
import type { PaymentStatus } from "@/server/payments/types";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { Spinner } from "@/components/ui/feedback/Spinner";
import { PaymentsFilterBar } from "@/components/admin/payments/PaymentsFilterBar";
import { PaymentsTable } from "@/components/admin/payments/PaymentsTable";
import { CreateHourPackageButton } from "@/components/admin/payments/CreateHourPackageButton";

const VALID_STATUSES: PaymentStatus[] = ["pending", "completed", "failed", "refunded"];

/** Portado de src/app/admin/pagos-estudiantes/page.tsx. */
export function PagosEstudiantesListPage() {
  const [searchParams] = useSearchParams();
  const statusParam = searchParams.get("status");
  const status = VALID_STATUSES.includes(statusParam as PaymentStatus) ? (statusParam as PaymentStatus) : undefined;
  const studentId = searchParams.get("studentId") ?? undefined;

  const paymentsQuery = useStudentPayments({ studentId, status });
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

      {paymentsQuery.isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-6) 0" }}>
          <Spinner size={28} label="Cargando…" />
        </div>
      ) : paymentsQuery.isError || !paymentsQuery.data ? (
        <EmptyState icon="warning" title="No pudimos cargar los pagos">Recarga la página para intentarlo de nuevo.</EmptyState>
      ) : paymentsQuery.data.length === 0 ? (
        <EmptyState icon="credit-card" title="Sin pagos todavía">
          Registra el primer pago para crear un paquete de horas.
        </EmptyState>
      ) : (
        <PaymentsTable payments={paymentsQuery.data} />
      )}
    </div>
  );
}
