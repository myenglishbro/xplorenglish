import { useNavigate } from "react-router-dom";
import { DataTable, type DataTableColumn } from "@/components/ui/surfaces/DataTable";
import { Tag } from "@/components/ui/core/Tag";
import { TwoLineCell } from "@/components/admin/TwoLineCell";
import { Icon } from "@/components/ui/core/Icon";
import { getStudentBalanceStatus } from "@/lib/hours/balanceStatus";
import type { ClassroomListItem } from "@/server/admin/classrooms/types";

export function ClassroomsTable({ items }: { items: ClassroomListItem[] }) {
  const navigate = useNavigate();

  const columns: DataTableColumn<ClassroomListItem>[] = [
    {
      key: "name",
      header: "Salón",
      render: (row) => <TwoLineCell strong primary={row.name} secondary={`${row.programName} · ${row.level}`} />,
    },
    {
      key: "studentName",
      header: "Estudiante",
      render: (row) => {
        if (!row.studentName) return <span style={{ color: "var(--text-muted)" }}>Sin asignar</span>;
        const balanceStatus = row.studentBalance === null ? null : getStudentBalanceStatus(row.studentBalance);
        return (
          <TwoLineCell
            primary={row.studentName}
            secondary={
              row.studentBalance === null ? undefined : (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  {row.studentBalance} min
                  {balanceStatus && balanceStatus.status !== "normal" && (
                    <Tag tone={balanceStatus.tone} size="sm">
                      {balanceStatus.label}
                    </Tag>
                  )}
                </span>
              )
            }
          />
        );
      },
    },
    {
      key: "teachers",
      header: "Docente(s)",
      render: (row) => {
        if (row.teachers.length === 0) return <span style={{ color: "var(--text-muted)" }}>Sin asignar</span>;
        const names = row.teachers.map((t) => `${t.firstName} ${t.lastName}`);
        const label = names.length === 1 ? names[0] : `${names[0]} +${names.length - 1} más`;
        return (
          <span
            title={names.length > 1 ? names.join("\n") : undefined}
            style={{ display: "inline-block", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          >
            {label}
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
