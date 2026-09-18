import { useState } from "react";
import { Alert } from "@/components/ui/feedback/Alert";
import { Spinner } from "@/components/ui/feedback/Spinner";
import { Select } from "@/components/ui/forms/Select";
import { DAY_OF_WEEK_LABELS, WEEK_DISPLAY_ORDER } from "@/features/availability/types";
import { coversInterval } from "@/features/availability/coverage";
import { useAllTeacherAvailability } from "@/features/teachers/hooks";

const SLOT_MINUTES = 60;
const START_MINUTES = 6 * 60;
const END_MINUTES = 23 * 60;
const SLOT_STARTS = Array.from(
  { length: (END_MINUTES - START_MINUTES) / SLOT_MINUTES },
  (_, index) => START_MINUTES + index * SLOT_MINUTES
);

function timeLabel(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/** Consulta semanal de los mismos bloques de teacher_availability, sin acciones de edición. */
export function AllTeachersAvailabilityGrid() {
  const { data: teachers, isLoading, isError } = useAllTeacherAvailability();
  const [selectedTeacherId, setSelectedTeacherId] = useState("all");

  if (isLoading) {
    return <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-6) 0" }}><Spinner size={28} label="Cargando disponibilidad…" /></div>;
  }
  if (isError || !teachers) {
    return <Alert tone="danger">No pudimos cargar la disponibilidad de docentes. Recarga la página para intentarlo de nuevo.</Alert>;
  }

  const selectedTeacher = teachers.find((teacher) => teacher.id === selectedTeacherId && teacher.teacherStatus === "active");
  const visibleTeachers = selectedTeacher ? [selectedTeacher] : teachers;
  const teacherOptions = [
    { value: "all", label: "Todos los docentes" },
    ...teachers.filter((teacher) => teacher.teacherStatus === "active").map((teacher) => ({ value: teacher.id, label: teacher.name })),
  ];

  const cells = new Map<string, { id: string; name: string }[]>();
  for (const teacher of visibleTeachers) {
    for (const day of WEEK_DISPLAY_ORDER) {
      for (const minute of SLOT_STARTS) {
        if (!coversInterval(teacher.availability, day, minute, minute + SLOT_MINUTES)) continue;
        const key = `${day}-${minute}`;
        const names = cells.get(key) ?? [];
        if (!names.some((person) => person.id === teacher.id)) names.push({ id: teacher.id, name: teacher.name });
        cells.set(key, names);
      }
    }
  }

  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", maxWidth: 340, marginBottom: "var(--space-4)" }}>
        <label htmlFor="availability-teacher" style={{ font: "var(--weight-semibold) var(--text-body-sm-size)/1.3 var(--font-body)", color: "var(--text-heading)" }}>
          Docente
        </label>
        <Select id="availability-teacher" value={selectedTeacher?.id ?? "all"} options={teacherOptions} onChange={(event) => setSelectedTeacherId(event.target.value)} />
      </div>

      {selectedTeacher && (
        <h3 style={{ margin: "0 0 var(--space-3)", font: "var(--weight-semibold) var(--text-body-size)/1.4 var(--font-display)", color: "var(--text-heading)" }}>
          Disponibilidad semanal de {selectedTeacher.name}
        </h3>
      )}
      <p style={{ margin: "0 0 var(--space-4)", color: "var(--text-muted)" }}>
        Bloques de 1 hora, de 06:00 a 23:00. Solo consulta.
      </p>
      {selectedTeacher && selectedTeacher.availability.length === 0 && (
        <p style={{ margin: "0 0 var(--space-4)", color: "var(--text-muted)" }}>No hay disponibilidad registrada para este docente.</p>
      )}

      <div style={{ maxWidth: "100%", overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", minWidth: 1000, width: "100%", tableLayout: "fixed", font: "var(--weight-regular) 12px/1.35 var(--font-body)" }}>
          <thead>
            <tr>
              <th scope="col" style={{ position: "sticky", left: 0, zIndex: 2, width: 76, background: "var(--surface-sunken)", color: "var(--text-heading)", textAlign: "left", padding: "10px 12px", borderBottom: "1px solid var(--border-subtle)" }}>Hora</th>
              {WEEK_DISPLAY_ORDER.map((day) => (
                <th key={day} scope="col" style={{ textAlign: "left", padding: "10px 12px", fontWeight: "var(--weight-bold)", color: "var(--text-heading)", background: "var(--surface-sunken)", borderBottom: "1px solid var(--border-subtle)" }}>
                  {DAY_OF_WEEK_LABELS[day]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SLOT_STARTS.map((minute) => (
              <tr key={minute}>
                <th scope="row" style={{ position: "sticky", left: 0, zIndex: 1, background: "var(--surface-sunken)", textAlign: "left", verticalAlign: "top", padding: "10px 12px", fontWeight: "var(--weight-semibold)", color: "var(--text-heading)", borderBottom: "1px solid var(--border-subtle)", whiteSpace: "nowrap" }}>
                  {timeLabel(minute)}–{timeLabel(minute + SLOT_MINUTES)}
                </th>
                {WEEK_DISPLAY_ORDER.map((day) => {
                  const names = cells.get(`${day}-${minute}`) ?? [];
                  return (
                    <td key={day} style={{ verticalAlign: "top", height: selectedTeacher ? 42 : 72, padding: "8px 10px", borderBottom: "1px solid var(--border-subtle)", borderLeft: "1px solid var(--border-subtle)", background: names.length ? "var(--cyan-50)" : undefined }}>
                      {selectedTeacher ? (
                        names.length > 0 && <span style={{ fontWeight: "var(--weight-semibold)", color: "var(--cyan-700)" }}>Disponible</span>
                      ) : names.length > 0 ? (
                        <>
                          <div style={{ fontWeight: "var(--weight-bold)", color: "var(--cyan-700)", marginBottom: 2 }}>
                            {names.length} {names.length === 1 ? "disponible" : "disponibles"}
                          </div>
                          {names.slice(0, 2).map((person) => (
                            <div key={person.id} title={person.name} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text-body)" }}>{person.name}</div>
                          ))}
                          {names.length > 2 && (
                            <details style={{ marginTop: 2 }}>
                              <summary style={{ cursor: "pointer", color: "var(--cyan-700)", fontWeight: "var(--weight-semibold)" }}>+{names.length - 2} más</summary>
                              <ul style={{ margin: "6px 0 0", paddingLeft: 16, color: "var(--text-body)" }}>
                                {names.map((person) => <li key={person.id}>{person.name}</li>)}
                              </ul>
                            </details>
                          )}
                        </>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
