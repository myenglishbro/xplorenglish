import { createClient } from "@/lib/supabase/server";
import { listStudentPayments } from "@/server/payments/queries";
import { listAssignableStudents } from "@/server/admin/classrooms/queries";
import type { PaymentStatus } from "@/server/payments/types";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { PaymentsFilterBar } from "@/components/admin/payments/PaymentsFilterBar";
import { PaymentsTable } from "@/components/admin/payments/PaymentsTable";
import { CreateHourPackageButton } from "@/components/admin/payments/CreateHourPackageButton";

const VALID_STATUSES: PaymentStatus[] = ["pending", "completed", "failed", "refunded"];

export interface AdminPagosEstudiantesPageProps {
  searchParams: { studentId?: string; status?: string };
}

export default async function AdminPagosEstudiantesPage({ searchParams }: AdminPagosEstudiantesPageProps) {
  const status = VALID_STATUSES.includes(searchParams.status as PaymentStatus) ? (searchParams.status as PaymentStatus) : undefined;

  const supabase = createClient();
  const [payments, students] = await Promise.all([
    listStudentPayments(supabase, { studentId: searchParams.studentId, status }),
    listAssignableStudents(supabase),
  ]);

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

      {payments.length === 0 ? (
        <EmptyState icon="credit-card" title="Sin pagos todavía">
          Registra el primer pago para crear un paquete de horas.
        </EmptyState>
      ) : (
        <PaymentsTable payments={payments} />
      )}
    </div>
  );
}
