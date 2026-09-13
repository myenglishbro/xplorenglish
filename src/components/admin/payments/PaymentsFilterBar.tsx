"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/forms/Select";

const STATUS_OPTIONS = [
  { value: "all", label: "Todos los estados" },
  { value: "pending", label: "Pendiente" },
  { value: "completed", label: "Completado" },
  { value: "failed", label: "Fallido" },
  { value: "refunded", label: "Reembolsado" },
];

export interface PaymentsFilterBarProps {
  students: { id: string; firstName: string; lastName: string }[];
}

/** Mismo patrón que CalendarFilters/UsersFilterBar: el filtro vive en la URL, no en React state. */
export function PaymentsFilterBar({ students }: PaymentsFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function applyParams(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === "" || value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  const studentOptions = [{ value: "all", label: "Todos los estudiantes" }, ...students.map((s) => ({ value: s.id, label: `${s.firstName} ${s.lastName}` }))];

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)" }}>
      <div style={{ width: 240 }}>
        <Select value={searchParams.get("studentId") ?? "all"} options={studentOptions} onChange={(e) => applyParams({ studentId: e.target.value })} />
      </div>
      <div style={{ width: 200 }}>
        <Select value={searchParams.get("status") ?? "all"} options={STATUS_OPTIONS} onChange={(e) => applyParams({ status: e.target.value })} />
      </div>
    </div>
  );
}
