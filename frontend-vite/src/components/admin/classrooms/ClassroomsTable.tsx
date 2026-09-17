import { useNavigate } from "react-router-dom";
import { DataTable, type DataTableColumn } from "@/components/ui/surfaces/DataTable";
import { Tag } from "@/components/ui/core/Tag";
import { Icon } from "@/components/ui/core/Icon";
import { getStudentBalanceStatus } from "@/lib/hours/balanceStatus";
import type { ClassroomListItem } from "@/server/admin/classrooms/types";

export function ClassroomsTable({ items }: { items: ClassroomListItem[] }) {
  const navigate = useNavigate();

  const columns: DataTableColumn<ClassroomListItem>[] = [
    {
      key: "name",
      header: "Salón",
      render: (row) => <span style={{ font: "var(--weight-semibold) var(--text-body-sm-size)/1.3 var(--font-body)", color: "var(--text-heading)" }}>{row.name}</span>,
    },
    { key: "programName", header: "Programa" },
    { key: "level", header: "Nivel" },
    {
      key: "studentName",
      header: "Estudiante",
      render: (row) => row.studentName ?? <span style={{ color: "var(--text-muted)" }}>Sin asignar</span>,
    },
    { key: "enabledTeacherCount", header: "Profesores", align: "center" },
    {
      key: "studentBalance",
      header: "Saldo",
      render: (row) => {
        if (row.studentBalance === null) return <span style={{ color: "var(--text-muted)" }}>—</span>;
        const balanceStatus = getStudentBalanceStatus(row.studentBalance);
        return (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span>{row.studentBalance} min</span>
            {balanceStatus.status !== "normal" && <Tag tone={balanceStatus.tone} size="sm">{balanceStatus.label}</Tag>}
          </span>
        );
      },
    },
    {
      key: "status",
      header: "Estado",
      render: (row) => <Tag tone={row.status === "active" ? "success" : "neutral"}>{row.status === "active" ? "Activo" : "Archivado"}</Tag>,
    },
    {
      key: "action",
      header: "",
      align: "right",
      render: () => <Icon name="caret-right" size={16} color="var(--text-muted)" />,
    },
  ];

  return <DataTable columns={columns} rows={items} onRowClick={(row) => navigate(`/admin/salones/${row.id}`)} />;
}
