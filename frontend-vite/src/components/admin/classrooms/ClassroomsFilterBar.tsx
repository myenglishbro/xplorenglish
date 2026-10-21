import React from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/core/Button";
import { Select } from "@/components/ui/forms/Select";
import { SearchInput } from "@/components/ui/forms/SearchInput";
import type { AssignableTeacher } from "@/server/admin/classrooms/types";
import { ACADEMIC_LEVELS, type ProgramOption } from "@/server/admin/users/types";

const STATUS_OPTIONS = [
  { value: "all", label: "Todos los estados" },
  { value: "active", label: "Activo" },
  { value: "archived", label: "Finalizado" },
];

export interface ClassroomsFilterBarProps {
  programs: ProgramOption[];
  teachers: AssignableTeacher[];
}

export function ClassroomsFilterBar({ programs, teachers }: ClassroomsFilterBarProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = React.useState(searchParams.get("q") ?? "");

  const programOptions = [{ value: "all", label: "Todos los programas" }, ...programs.map((p) => ({ value: String(p.id), label: p.name }))];
  const teacherOptions = [
    { value: "all", label: "Todos los docentes" },
    ...teachers.map((t) => ({ value: t.id, label: `${t.firstName} ${t.lastName}` })),
  ];
  const levelOptions = [{ value: "all", label: "Todos los niveles" }, ...ACADEMIC_LEVELS.map((l) => ({ value: l, label: l }))];

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

  const secondaryActiveCount = (searchParams.get("program") ? 1 : 0) + (searchParams.get("level") ? 1 : 0);
  const [moreOpen, setMoreOpen] = React.useState(secondaryActiveCount > 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)", alignItems: "center" }}>
        <div style={{ flex: "1 1 280px", minWidth: 240 }}>
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onSubmit={(value) => applyParams({ q: value ?? "" })}
            placeholder="Buscar por salón, estudiante o docente"
          />
        </div>
        <div style={{ width: 220 }}>
          <Select value={searchParams.get("teacher") ?? "all"} options={teacherOptions} onChange={(e) => applyParams({ teacher: e.target.value })} />
        </div>
        <div style={{ width: 180 }}>
          {/* Distinto del resto de filtros (applyParams borra el param cuando vale "all"): acá "all"
              debe quedar explícito en la URL (?status=all), porque el default de la página ya NO es
              "all" sino "active" (operación diaria) -- si "Todos los estados" borrara el param,
              la selección "rebotaría" a "Activo" en el siguiente render en vez de mantenerse. */}
          <Select
            value={searchParams.get("status") ?? "active"}
            options={STATUS_OPTIONS}
            onChange={(e) => {
              const params = new URLSearchParams(searchParams);
              params.set("status", e.target.value);
              setSearchParams(params);
            }}
          />
        </div>
        <Button variant="ghost" icon="sliders-horizontal" onClick={() => setMoreOpen((open) => !open)}>
          {secondaryActiveCount > 0 ? `Más filtros (${secondaryActiveCount})` : "Más filtros"}
        </Button>
      </div>
      {moreOpen && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)" }}>
          <div style={{ width: 220 }}>
            <Select value={searchParams.get("program") ?? "all"} options={programOptions} onChange={(e) => applyParams({ program: e.target.value })} />
          </div>
          <div style={{ width: 180 }}>
            <Select value={searchParams.get("level") ?? "all"} options={levelOptions} onChange={(e) => applyParams({ level: e.target.value })} />
          </div>
        </div>
      )}
    </div>
  );
}
