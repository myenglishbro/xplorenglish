"use client";

import { useRouter } from "next/navigation";
import { DataTable, type DataTableColumn } from "@/components/ui/surfaces/DataTable";
import { Tag } from "@/components/ui/core/Tag";
import { Icon } from "@/components/ui/core/Icon";
import type { TeacherListItem } from "@/server/admin/teachers/types";

/**
 * Columna "Estado" muestra teacher_profiles.status (¿está operativo como docente?), no
 * profiles.status -- ver decisión documentada en admin/docentes/page.tsx. profiles.status
 * ("Estado de cuenta") queda solo en el detalle, donde tiene su propio rótulo distinto.
 */
export function TeachersTable({ items }: { items: TeacherListItem[] }) {
  const router = useRouter();

  const columns: DataTableColumn<TeacherListItem>[] = [
    {
      key: "name",
      header: "Nombre completo",
      render: (row) => (
        <span style={{ font: "var(--weight-semibold) var(--text-body-sm-size)/1.3 var(--font-body)", color: "var(--text-heading)" }}>
          {row.firstName} {row.lastName}
        </span>
      ),
    },
    {
      key: "email",
      header: "Email",
      render: (row) => row.email ?? <span style={{ color: "var(--text-muted)" }}>—</span>,
    },
    { key: "phone", header: "Teléfono" },
    {
      key: "hourlyRate",
      header: "Tarifa/hora",
      align: "right",
      render: (row) => `S/ ${row.hourlyRate.toFixed(2)}`,
    },
    {
      key: "teacherStatus",
      header: "Estado",
      render: (row) => (
        <Tag tone={row.teacherStatus === "active" ? "success" : "danger"}>{row.teacherStatus === "active" ? "Activo" : "Inactivo"}</Tag>
      ),
    },
    { key: "activeClassroomCount", header: "Salones", align: "center" },
    {
      key: "action",
      header: "",
      align: "right",
      render: () => <Icon name="caret-right" size={16} color="var(--text-muted)" />,
    },
  ];

  return <DataTable columns={columns} rows={items} onRowClick={(row) => router.push(`/admin/docentes/${row.id}`)} />;
}
