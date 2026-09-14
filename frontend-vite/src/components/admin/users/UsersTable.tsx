import { useNavigate } from "react-router-dom";
import { DataTable, type DataTableColumn } from "@/components/ui/surfaces/DataTable";
import { Tag } from "@/components/ui/core/Tag";
import { Icon } from "@/components/ui/core/Icon";
import { formatShortDateInLima } from "@/lib/datetime/lima";
import type { AccessStatus, UserListItem, UserRole } from "@/server/admin/users/types";

const ROLE_LABEL: Record<UserRole, string> = { admin: "Admin", teacher: "Docente", student: "Estudiante" };
const ROLE_TONE: Record<UserRole, "brand" | "accent" | "neutral"> = { admin: "brand", teacher: "accent", student: "neutral" };

function AccessTag({ accessStatus }: { accessStatus: AccessStatus | null }) {
  if (accessStatus === null) return <span style={{ color: "var(--text-muted)" }}>—</span>;
  return accessStatus === "activated" ? (
    <Tag tone="success">Activado</Tag>
  ) : (
    <Tag tone="warning">Pendiente</Tag>
  );
}

export interface UsersTableProps {
  items: UserListItem[];
  mode: "usuarios" | "estudiantes";
}

export function UsersTable({ items, mode }: UsersTableProps) {
  const navigate = useNavigate();

  const baseColumns: DataTableColumn<UserListItem>[] = [
    {
      key: "name",
      header: "Nombre completo",
      render: (row) => (
        <span style={{ font: "var(--weight-semibold) var(--text-body-sm-size)/1.3 var(--font-body)", color: "var(--text-heading)" }}>
          {row.firstName} {row.lastName}
        </span>
      ),
    },
    { key: "dni", header: "DNI" },
  ];

  const usuariosColumns: DataTableColumn<UserListItem>[] = [
    ...baseColumns,
    { key: "phone", header: "Teléfono" },
    {
      key: "role",
      header: "Rol",
      render: (row) => <Tag tone={ROLE_TONE[row.role]}>{ROLE_LABEL[row.role]}</Tag>,
    },
    {
      key: "level",
      header: "Nivel",
      render: (row) => (row.role === "student" ? row.level : "—"),
    },
    {
      key: "status",
      header: "Estado",
      render: (row) => <Tag tone={row.status === "active" ? "success" : "danger"}>{row.status === "active" ? "Activo" : "Inactivo"}</Tag>,
    },
    {
      key: "createdAt",
      header: "Registro",
      render: (row) => formatShortDateInLima(row.createdAt),
    },
  ];

  const estudiantesColumns: DataTableColumn<UserListItem>[] = [
    ...baseColumns,
    { key: "level", header: "Nivel" },
    {
      key: "programName",
      header: "Programa",
      render: (row) => row.programName ?? "Sin programa",
    },
    {
      key: "status",
      header: "Estado",
      render: (row) => <Tag tone={row.status === "active" ? "success" : "danger"}>{row.status === "active" ? "Activo" : "Inactivo"}</Tag>,
    },
    {
      key: "accessStatus",
      header: "Acceso",
      render: (row) => <AccessTag accessStatus={row.accessStatus} />,
    },
    {
      key: "createdAt",
      header: "Registro",
      render: (row) => formatShortDateInLima(row.createdAt),
    },
  ];

  const columns = mode === "estudiantes" ? estudiantesColumns : usuariosColumns;
  columns.push({
    key: "action",
    header: "",
    align: "right",
    render: () => <Icon name="caret-right" size={16} color="var(--text-muted)" />,
  });

  return <DataTable columns={columns} rows={items} onRowClick={(row) => navigate(`/admin/usuarios/${row.id}`)} />;
}
