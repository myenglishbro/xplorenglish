import { Card } from "@/components/ui/surfaces/Card";
import { Spinner } from "@/components/ui/feedback/Spinner";
import { Alert } from "@/components/ui/feedback/Alert";
import { Tag } from "@/components/ui/core/Tag";
import { useClassroomBalance, useClassroomHistory } from "@/features/classRecords/hooks";
import { getStudentBalanceStatus } from "@/lib/hours/balanceStatus";
import { RegisterClassButton } from "./RegisterClassButton";
import { ClassRecordHistoryTable } from "./ClassRecordHistoryTable";

/** "Sin estudiante asignado" no es un estado de saldo (no hay estudiante del cual calcularlo) --
 * el resto SIEMPRE viene del helper central getStudentBalanceStatus, nunca recalculado acá. */
function balanceTag(minutes: number | null): { label: string; tone: "success" | "warning" | "danger" | "neutral" } {
  if (minutes === null) return { label: "Sin estudiante asignado", tone: "neutral" };
  return getStudentBalanceStatus(minutes);
}

export interface ClassroomClassesSectionProps {
  classroomId: number;
  hasStudent: boolean;
  /** Solo Teacher registra clases y ve "Corregir" en sus propias filas. */
  role: "teacher" | "student" | "admin";
  currentTeacherId?: string;
}

/**
 * Sección "Registrar clase" + saldo + historial (Slice F) -- compartida por Teacher/Student/Admin,
 * cada uno con el nivel de detalle que le corresponde. Fuente única: class_records + saldo vía
 * get_classroom_student_balance. Sin alertas globales todavía (Slice G) -- solo el dato dentro del
 * salón, como pide el slice.
 */
export function ClassroomClassesSection({ classroomId, hasStudent, role, currentTeacherId }: ClassroomClassesSectionProps) {
  const balanceQuery = useClassroomBalance(classroomId);
  const historyQuery = useClassroomHistory(classroomId);

  const balance = balanceTag(balanceQuery.data ?? (hasStudent ? 0 : null));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <Card>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <span style={{ font: "var(--weight-bold) 18px/1 var(--font-display)", color: "var(--text-heading)" }}>
              {balanceQuery.isLoading ? "…" : balanceQuery.data !== undefined && balanceQuery.data !== null ? `${balanceQuery.data} min disponibles` : "—"}
            </span>
            <Tag tone={balance.tone}>{balance.label}</Tag>
          </div>
          {role === "teacher" && <RegisterClassButton classroomId={classroomId} disabled={!hasStudent} />}
        </div>
        {role === "teacher" && !hasStudent && (
          <Alert tone="warning" style={{ marginTop: "var(--space-3)" }}>
            Este salón no tiene un estudiante asignado -- no se pueden registrar clases PRESENTE/AUSENTE hasta que Admin asigne uno.
          </Alert>
        )}
      </Card>

      {historyQuery.isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-5) 0" }}>
          <Spinner size={24} label="Cargando historial…" />
        </div>
      ) : historyQuery.isError || !historyQuery.data ? (
        <Alert tone="danger">No pudimos cargar el historial de este salón.</Alert>
      ) : (
        <ClassRecordHistoryTable
          classroomId={classroomId}
          items={historyQuery.data}
          currentTeacherId={role === "teacher" ? currentTeacherId : undefined}
          showFinancials={role === "admin"}
        />
      )}
    </div>
  );
}
