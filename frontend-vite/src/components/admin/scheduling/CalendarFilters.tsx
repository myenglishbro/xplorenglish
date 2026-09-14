import { useSearchParams } from "react-router-dom";
import { Select } from "@/components/ui/forms/Select";
import type { ClassroomOption } from "@/server/scheduling/types";

export interface CalendarFiltersProps {
  classrooms: ClassroomOption[];
  teachers: { id: string; name: string }[];
}

/** Mismo patrón que UsersFilterBar: el estado vive en la URL, no en React state. */
export function CalendarFilters({ classrooms, teachers }: CalendarFiltersProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  function applyParams(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(next)) {
      if (value === "" || value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    setSearchParams(params);
  }

  const classroomOptions = [{ value: "all", label: "Todos los salones" }, ...classrooms.map((c) => ({ value: String(c.id), label: c.name }))];
  const teacherOptions = [{ value: "all", label: "Todos los docentes" }, ...teachers.map((t) => ({ value: t.id, label: t.name }))];

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)" }}>
      <div style={{ width: 220 }}>
        <Select value={searchParams.get("classroomId") ?? "all"} options={classroomOptions} onChange={(e) => applyParams({ classroomId: e.target.value })} />
      </div>
      <div style={{ width: 220 }}>
        <Select value={searchParams.get("teacherId") ?? "all"} options={teacherOptions} onChange={(e) => applyParams({ teacherId: e.target.value })} />
      </div>
    </div>
  );
}
