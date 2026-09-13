"use client";

import React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { SearchInput } from "@/components/ui/forms/SearchInput";
import { Select } from "@/components/ui/forms/Select";

const ROLE_OPTIONS = [
  { value: "all", label: "Todos los roles" },
  { value: "admin", label: "Admin" },
  { value: "teacher", label: "Docente" },
  { value: "student", label: "Estudiante" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "Todos los estados" },
  { value: "active", label: "Activo" },
  { value: "inactive", label: "Inactivo" },
];

export interface UsersFilterBarProps {
  showRoleFilter?: boolean;
}

export function UsersFilterBar({ showRoleFilter = true }: UsersFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = React.useState(searchParams.get("q") ?? "");

  function applyParams(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === "" || value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)", alignItems: "center" }}>
      <div style={{ flex: "1 1 280px", minWidth: 240 }}>
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onSubmit={(value) => applyParams({ q: value ?? "" })}
          placeholder="Buscar por nombre, apellido o DNI"
        />
      </div>
      {showRoleFilter && (
        <div style={{ width: 200 }}>
          <Select value={searchParams.get("role") ?? "all"} options={ROLE_OPTIONS} onChange={(e) => applyParams({ role: e.target.value })} />
        </div>
      )}
      <div style={{ width: 200 }}>
        <Select value={searchParams.get("status") ?? "all"} options={STATUS_OPTIONS} onChange={(e) => applyParams({ status: e.target.value })} />
      </div>
    </div>
  );
}
