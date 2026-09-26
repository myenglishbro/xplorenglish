import React from "react";
import { Card } from "@/components/ui/surfaces/Card";
import { DataTable, type DataTableColumn } from "@/components/ui/surfaces/DataTable";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { Spinner } from "@/components/ui/feedback/Spinner";
import { Alert } from "@/components/ui/feedback/Alert";
import { Tag } from "@/components/ui/core/Tag";
import { Button } from "@/components/ui/core/Button";
import { Field } from "@/components/ui/forms/Field";
import { Select } from "@/components/ui/forms/Select";
import { formatMinutesAsHours } from "@/lib/format/minutes";
import { formatCurrencyAmount } from "@/lib/format/currency";
import { formatShortDateInLima, formatTimeInLima } from "@/lib/datetime/lima";
import { useMyPaymentStatement, useMyStudentsForTeacher } from "@/features/payroll/hooks";
import { useMyTeacherProfile } from "@/features/profile/hooks";
import { MyPaymentsReport } from "@/components/teacher/payroll/MyPaymentsReport";
import { FINANCIAL_STATUS_LABEL, FINANCIAL_STATUS_TONE, type TeacherPaymentStatementRow } from "@/server/payroll/types";

interface Row extends TeacherPaymentStatementRow {
  [key: string]: unknown;
}

const ALL_STUDENTS = "all";

/**
 * "Mis pagos" (Teacher) -- fix post-Slice F. Lectura mínima de solo lectura sobre class_records +
 * teacher_payments (misma fuente que Admin, Slice E). Sin selección/pago: eso es exclusivo de
 * Admin (Pagos a profesores). No es un módulo nuevo, solo la versión de solo lectura del mismo dato.
 *
 * FIX 8 (segunda etapa): filtro por alumno. El estado vive acá (no dentro de MyPaymentsReport)
 * porque controla DOS secciones a la vez -- el reporte financiero de arriba y el historial
 * cronológico de abajo -- y ambas deben quedar sincronizadas con la misma selección.
 */
export function TeacherPagosPage() {
  const [selectedStudentId, setSelectedStudentId] = React.useState<string>(ALL_STUDENTS);
  const studentsQuery = useMyStudentsForTeacher();
  const students = studentsQuery.data ?? [];
  const activeStudentId = selectedStudentId === ALL_STUDENTS ? null : selectedStudentId;
  const activeStudentName = students.find((s) => s.studentId === activeStudentId)?.studentName ?? null;

  const { data: rows, isLoading, isError } = useMyPaymentStatement(activeStudentId);
  const profileQuery = useMyTeacherProfile();
  const receiptDriveUrl = profileQuery.data?.teacherProfile?.receiptDriveUrl ?? null;

  const studentOptions = [{ value: ALL_STUDENTS, label: "Todos mis alumnos" }, ...students.map((s) => ({ value: s.studentId, label: s.studentName }))];

  const columns: DataTableColumn<Row>[] = [
    {
      key: "occurredAt",
      header: "Fecha",
      render: (row) => (
        <span style={{ whiteSpace: "nowrap" }}>
          {formatShortDateInLima(row.occurredAt)} · {formatTimeInLima(row.occurredAt)}
        </span>
      ),
    },
    { key: "classroomName", header: "Salón" },
    { key: "minutes", header: "Minutos", align: "right", render: (row) => (row.minutes > 0 ? formatMinutesAsHours(row.minutes) : "—") },
    { key: "amount", header: "Monto", align: "right", render: (row) => (row.amount != null ? formatCurrencyAmount(row.amount, "PEN") : "—") },
    {
      key: "financialStatus",
      header: "Estado",
      render: (row) => <Tag tone={FINANCIAL_STATUS_TONE[row.financialStatus]}>{FINANCIAL_STATUS_LABEL[row.financialStatus]}</Tag>,
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <h1
          style={{
            font: "var(--weight-bold) var(--text-h2-size)/var(--text-h2-lh) var(--font-display)",
            letterSpacing: "var(--text-h2-ls)",
            color: "var(--text-heading)",
            margin: 0,
          }}
        >
          Mis pagos
        </h1>
        {profileQuery.data && (
          receiptDriveUrl ? (
            <a href={receiptDriveUrl} target="_blank" rel="noopener noreferrer">
              <Button type="button" variant="secondary" size="sm" icon="upload-simple">
                Subir recibo por honorarios
              </Button>
            </a>
          ) : (
            <span style={{ font: "var(--weight-regular) 13px/1 var(--font-body)", color: "var(--text-muted)" }}>
              Carpeta de recibos no configurada. Contacta con Administración.
            </span>
          )
        )}
      </div>

      <div style={{ maxWidth: 320 }}>
        <Field label="Alumno" htmlFor="myPaymentsStudentFilter">
          <Select
            id="myPaymentsStudentFilter"
            value={selectedStudentId}
            options={studentOptions}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            disabled={studentsQuery.isLoading}
          />
        </Field>
      </div>

      <MyPaymentsReport studentId={activeStudentId} studentName={activeStudentName} />

      <div>
        <h2 style={{ margin: "0 0 4px", font: "var(--weight-bold) var(--text-h4-size)/var(--text-h4-lh) var(--font-display)", color: "var(--text-heading)" }}>
          Detalle de clases
        </h2>
        <p style={{ margin: "0 0 var(--space-3)", color: "var(--text-muted)" }}>
          Historial cronológico de tus clases remunerables, pagadas y pendientes -- distinto de "Pagos recibidos" de arriba, que solo cuenta dinero ya pagado.
          {activeStudentId && " Filtrado al alumno seleccionado arriba."}
        </p>

        {isLoading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-5) 0" }}>
            <Spinner size={24} label="Cargando…" />
          </div>
        ) : isError || !rows ? (
          <Alert tone="danger">No pudimos cargar tus pagos. Recarga la página.</Alert>
        ) : rows.length === 0 ? (
          <Card>
            <EmptyState icon="credit-card" title="Todavía no tienes clases remunerables">
              Cuando registres una clase PRESENTE o AUSENTE, aparecerá aquí.
            </EmptyState>
          </Card>
        ) : (
          <Card pad={false}>
            <DataTable columns={columns} rows={rows} dense />
          </Card>
        )}
      </div>
    </div>
  );
}
