import { useNavigate } from "react-router-dom";
import { DataTable, type DataTableColumn } from "@/components/ui/surfaces/DataTable";
import { Tag } from "@/components/ui/core/Tag";
import { CopyableText } from "@/components/admin/CopyableText";
import { TwoLineCell } from "@/components/admin/TwoLineCell";
import { Icon } from "@/components/ui/core/Icon";
import { formatShortDateInLima } from "@/lib/datetime/lima";
import { Avatar, HoursMeter, RoleBadge, StatusIcons } from "@/components/admin/users/userCells";
import type { UserListItem } from "@/server/admin/users/types";

function ContactLine({ icon, title, value }: { icon: string; title: string; value: string | null }) {
  return (
    <span title={title} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: value ? "var(--text-body)" : "var(--text-muted)" }}>
      <Icon name={icon} weight="regular" size={15} color="var(--text-muted)" />
      {value || "—"}
    </span>
  );
}

function ClassroomCell({ row, navigate }: { row: UserListItem; navigate: ReturnType<typeof useNavigate> }) {
  if (!row.classroom) return <span style={{ color: "var(--text-muted)", fontSize: "var(--text-caption-size)" }}>Sin salón</span>;
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        navigate(`/admin/salones/${row.classroom!.id}`);
      }}
      style={{
        background: "none",
        border: "none",
        padding: 0,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        color: "var(--text-link)",
        font: "var(--weight-semibold) var(--text-body-sm-size)/1.3 var(--font-body)",
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <Icon name="chalkboard" weight="regular" size={15} />
      {row.classroom.name}
    </button>
  );
}

export interface UsersTableProps {
  items: UserListItem[];
  mode: "usuarios" | "estudiantes";
  /** profileId -> correo (get_user_emails). undefined mientras carga; la celda muestra "—". */
  emails?: Record<string, string | null>;
}

export function UsersTable({ items, mode, emails }: UsersTableProps) {
  const navigate = useNavigate();

  const nameColumn: DataTableColumn<UserListItem> = {
    key: "name",
    header: mode === "estudiantes" ? "Estudiante" : "Usuario",
    render: (row) => {
      const email = emails?.[row.id];
      return (
        <span style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <Avatar firstName={row.firstName} lastName={row.lastName} />
          <TwoLineCell
            strong
            primary={`${row.firstName} ${row.lastName}`}
            secondary={email ? <CopyableText value={email} label="Copiar correo" /> : "—"}
          />
        </span>
      );
    },
  };

  const statusColumn: DataTableColumn<UserListItem> = {
    key: "status",
    header: "Estado",
    render: (row) => <StatusIcons status={row.status} archived={row.archivedAt !== null} accessStatus={mode === "estudiantes" ? row.accessStatus : null} />,
  };

  const usuariosColumns: DataTableColumn<UserListItem>[] = [
    nameColumn,
    {
      key: "contact",
      header: "Contacto",
      render: (row) => (
        <span style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <ContactLine icon="identification-card" title="DNI" value={row.dni} />
          <ContactLine icon="phone" title="Celular" value={row.phone} />
        </span>
      ),
    },
    {
      key: "role",
      header: "Rol",
      render: (row) => (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <RoleBadge role={row.role} />
          {row.role === "student" && <span style={{ color: "var(--text-muted)", fontSize: "var(--text-caption-size)" }}>{row.level}</span>}
        </span>
      ),
    },
    statusColumn,
    {
      key: "createdAt",
      header: "Registro",
      render: (row) => formatShortDateInLima(row.createdAt),
    },
  ];

  const estudiantesColumns: DataTableColumn<UserListItem>[] = [
    nameColumn,
    {
      key: "dni",
      header: "DNI",
      render: (row) => <span style={{ fontVariantNumeric: "tabular-nums" }}>{row.dni}</span>,
    },
    {
      key: "programName",
      header: "Programa",
      render: (row) => (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ color: row.programName ? "var(--text-body)" : "var(--text-muted)" }}>{row.programName ?? "Sin programa"}</span>
          <Tag tone="accent" size="sm">
            {row.level}
          </Tag>
        </span>
      ),
    },
    {
      key: "classroom",
      header: "Salón",
      render: (row) => <ClassroomCell row={row} navigate={navigate} />,
    },
    {
      key: "hours",
      header: "Horas",
      render: (row) => <HoursMeter purchasedMinutes={row.hoursPurchasedMinutes} balanceMinutes={row.hoursBalanceMinutes} />,
    },
    statusColumn,
  ];

  const columns = [...(mode === "estudiantes" ? estudiantesColumns : usuariosColumns)];
  columns.push({
    key: "action",
    header: "",
    align: "right",
    render: () => <Icon name="caret-right" size={16} color="var(--text-muted)" />,
  });

  return <DataTable columns={columns} rows={items} onRowClick={(row) => navigate(`/admin/usuarios/${row.id}`)} />;
}
