import { Modal } from "@/components/ui/surfaces/Modal";
import { Tag } from "@/components/ui/core/Tag";
import { Spinner } from "@/components/ui/feedback/Spinner";
import { Alert } from "@/components/ui/feedback/Alert";
import { WeeklyAvailabilityGrid } from "@/features/availability/components/WeeklyAvailabilityGrid";
import { useTeacherAvailabilityAndSkills } from "@/features/teachers/hooks";

export interface TeacherAvailabilityModalProps {
  open: boolean;
  onClose: () => void;
  teacherId: string;
  teacherName: string;
}

/** Read-only para Admin -- ver AJUSTE 5. Reutiliza WeeklyAvailabilityGrid en modo readOnly, misma
 * fuente de verdad (teacher_availability/teacher_skills) que el propio docente ve/edita. */
export function TeacherAvailabilityModal({ open, onClose, teacherId, teacherName }: TeacherAvailabilityModalProps) {
  const { data, isLoading, isError } = useTeacherAvailabilityAndSkills(teacherId);

  return (
    <Modal open={open} onClose={onClose} title={`Disponibilidad de ${teacherName}`} width={700}>
      {isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-6) 0" }}>
          <Spinner size={24} label="Cargando…" />
        </div>
      ) : isError ? (
        <Alert tone="danger">No pudimos cargar la disponibilidad. Inténtalo de nuevo en unos minutos.</Alert>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {data && data.skillNames.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {data.skillNames.map((name) => (
                <Tag key={name} tone="accent" size="sm">
                  {name}
                </Tag>
              ))}
            </div>
          )}
          <WeeklyAvailabilityGrid
            value={data?.availability ?? []}
            onSave={async () => {}}
            isSaving={false}
            readOnly
          />
        </div>
      )}
    </Modal>
  );
}
