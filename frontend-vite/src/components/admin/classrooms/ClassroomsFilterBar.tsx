import { useSearchParams } from "react-router-dom";
import { Select } from "@/components/ui/forms/Select";
import { ACADEMIC_LEVELS, type ProgramOption } from "@/server/admin/users/types";

const STATUS_OPTIONS = [
  { value: "all", label: "Todos los estados" },
  { value: "active", label: "Activo" },
  { value: "archived", label: "Archivado" },
];

export interface ClassroomsFilterBarProps {
  programs: ProgramOption[];
}

export function ClassroomsFilterBar({ programs }: ClassroomsFilterBarProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  const programOptions = [{ value: "all", label: "Todos los programas" }, ...programs.map((p) => ({ value: String(p.id), label: p.name }))];
  const levelOptions = [{ value: "all", label: "Todos los niveles" }, ...ACADEMIC_LEVELS.map((l) => ({ value: l, label: l }))];

  function applyParams(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(next)) {
      if (value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    setSearchParams(params);
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)" }}>
      <div style={{ width: 220 }}>
        <Select value={searchParams.get("program") ?? "all"} options={programOptions} onChange={(e) => applyParams({ program: e.target.value })} />
      </div>
      <div style={{ width: 180 }}>
        <Select value={searchParams.get("level") ?? "all"} options={levelOptions} onChange={(e) => applyParams({ level: e.target.value })} />
      </div>
      <div style={{ width: 200 }}>
        <Select value={searchParams.get("status") ?? "all"} options={STATUS_OPTIONS} onChange={(e) => applyParams({ status: e.target.value })} />
      </div>
    </div>
  );
}
