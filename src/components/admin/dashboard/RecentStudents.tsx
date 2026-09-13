import { Avatar } from "@/components/ui/surfaces/Avatar";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { formatShortDateInLima } from "@/lib/datetime/lima";
import type { RecentStudent } from "@/server/dashboard/types";

export function RecentStudents({ students }: { students: RecentStudent[] }) {
  if (students.length === 0) {
    return (
      <EmptyState icon="user-plus" title="Sin registros recientes">
        Todavía no se ha registrado ningún estudiante.
      </EmptyState>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      {students.map((student) => (
        <div key={student.id} style={{ display: "flex", alignItems: "center", padding: "6px 0" }}>
          <Avatar name={student.fullName} subtitle={`Registrado el ${formatShortDateInLima(student.createdAt)}`} tone="brand" />
        </div>
      ))}
    </div>
  );
}
