import { Card } from "@/components/ui/surfaces/Card";
import { Spinner } from "@/components/ui/feedback/Spinner";
import { useClassroomPeople } from "@/features/classroomOverview/hooks";
import { useClassSchedules } from "@/features/schedulingAdmin/hooks";
import { DAY_OF_WEEK_LABELS } from "@/server/scheduling/types";

function sectionLabel(text: string) {
  return (
    <div
      style={{
        font: "var(--weight-bold) var(--text-micro-size)/1 var(--font-display)",
        textTransform: "uppercase",
        letterSpacing: ".08em",
        color: "var(--text-muted)",
        marginBottom: 8,
      }}
    >
      {text}
    </div>
  );
}

/**
 * "Datos generales" del salón (Slice F) -- estudiante, profesores habilitados y horario
 * referencial. Compartida por Teacher/Student/Admin (lectura). Nombres de personas vía
 * get_classroom_people (RPC) -- profiles_select no permite leer perfiles ajenos directamente.
 *
 * Slice F.1: la sección "Estudiante" se omite para role="student" -- el propio estudiante ya sabe
 * quién es y su nombre ya se muestra en el AppShell; mostrarlo de nuevo acá era una redundancia
 * señalada explícitamente. Teacher/Admin la siguen viendo (sí es información nueva para ellos).
 */
export function ClassroomInfoCard({ classroomId, role }: { classroomId: number; role?: "teacher" | "student" | "admin" }) {
  const peopleQuery = useClassroomPeople(classroomId);
  const schedulesQuery = useClassSchedules(classroomId);

  return (
    <Card>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "var(--space-5)" }}>
        {role !== "student" && (
          <div>
            {sectionLabel("Estudiante")}
            {peopleQuery.isLoading ? (
              <Spinner size={18} />
            ) : peopleQuery.data?.studentName ? (
              <div style={{ font: "var(--weight-semibold) var(--text-body-size)/1.3 var(--font-body)", color: "var(--text-heading)" }}>
                {peopleQuery.data.studentName}
              </div>
            ) : (
              <div style={{ color: "var(--text-muted)" }}>Sin estudiante asignado</div>
            )}
          </div>
        )}

        <div>
          {sectionLabel("Profesores habilitados")}
          {peopleQuery.isLoading ? (
            <Spinner size={18} />
          ) : peopleQuery.data && peopleQuery.data.teachers.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {peopleQuery.data.teachers.map((t) => (
                <span key={t.id}>
                  {t.firstName} {t.lastName}
                </span>
              ))}
            </div>
          ) : (
            <div style={{ color: "var(--text-muted)" }}>Sin profesores habilitados</div>
          )}
        </div>

        <div>
          {sectionLabel("Horario semanal referencial")}
          {schedulesQuery.isLoading ? (
            <Spinner size={18} />
          ) : schedulesQuery.data && schedulesQuery.data.filter((s) => s.isActive).length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {schedulesQuery.data
                .filter((s) => s.isActive)
                .map((s) => (
                  <span key={s.id}>
                    {DAY_OF_WEEK_LABELS[s.dayOfWeek]} {s.startTime.slice(0, 5)}–{s.endTime.slice(0, 5)}
                  </span>
                ))}
            </div>
          ) : (
            <div style={{ color: "var(--text-muted)" }}>Sin horario configurado</div>
          )}
        </div>
      </div>
    </Card>
  );
}
