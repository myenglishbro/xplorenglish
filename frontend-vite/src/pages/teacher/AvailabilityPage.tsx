import { Alert } from "@/components/ui/feedback/Alert";
import { Spinner } from "@/components/ui/feedback/Spinner";
import { WeeklyAvailabilityGrid } from "@/features/availability/components/WeeklyAvailabilityGrid";
import { useAvailability, useSetAvailability } from "@/features/availability/hooks";
import { TeacherSkillsCard } from "@/features/teacherSkills/components/TeacherSkillsCard";

/**
 * Slice D: perfil docente mínimo -- "Mis niveles" (recomendación de skills) + "Mi disponibilidad"
 * (grilla semanal). Ninguna de las dos secciones bloquea nada; ambas usan RPCs de reemplazo total
 * (set_my_teacher_skills / set_my_teacher_availability), nunca un RPC por celda/checkbox.
 */
export function AvailabilityPage() {
  const { data: blocks, isLoading, isError, error, refetch } = useAvailability();
  const setAvailability = useSetAvailability();

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
          Mi disponibilidad y niveles
        </h1>
        <p style={{ margin: "4px 0 0", color: "var(--text-muted)" }}>Esta información solo se usa para recomendarte al configurar un salón.</p>
      </div>

      <TeacherSkillsCard />

      {isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-5) 0" }}>
          <Spinner size={24} label="Cargando disponibilidad…" />
        </div>
      ) : isError ? (
        <Alert tone="danger">
          No pudimos cargar tu disponibilidad ({error instanceof Error ? error.message : "error desconocido"}).{" "}
          <button
            type="button"
            onClick={() => refetch()}
            style={{ textDecoration: "underline", background: "none", border: 0, padding: 0, font: "inherit", color: "inherit", cursor: "pointer" }}
          >
            Reintentar
          </button>
        </Alert>
      ) : (
        <WeeklyAvailabilityGrid
          value={blocks ?? []}
          onSave={(newBlocks) => setAvailability.mutateAsync(newBlocks)}
          isSaving={setAvailability.isPending}
          saveError={setAvailability.isError ? (setAvailability.error as Error).message : null}
          justSaved={setAvailability.isSuccess}
        />
      )}
    </div>
  );
}
