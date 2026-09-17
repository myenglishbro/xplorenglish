import { Link, useParams } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { useUserDetail, useRoleChanges, usePrograms, useArchiveUser, useRestoreUser } from "@/features/users/hooks";
import type { UserRole } from "@/server/admin/users/types";
import { Card } from "@/components/ui/surfaces/Card";
import { Tag } from "@/components/ui/core/Tag";
import { Icon } from "@/components/ui/core/Icon";
import { Spinner } from "@/components/ui/feedback/Spinner";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { UserEditForm } from "@/components/admin/users/UserEditForm";
import { StatusToggle } from "@/components/admin/users/StatusToggle";
import { PromoteToTeacherPanel } from "@/components/admin/users/PromoteToTeacherPanel";
import { ResetTempPasswordPanel } from "@/components/admin/users/ResetTempPasswordPanel";
import { RoleChangesHistory } from "@/components/admin/users/RoleChangesHistory";
import { ReasonConfirmButton } from "@/components/admin/ReasonConfirmButton";
import { formatLongDateInLima } from "@/lib/datetime/lima";

const ROLE_LABEL: Record<UserRole, string> = { admin: "Admin", teacher: "Docente", student: "Estudiante" };
const ROLE_TONE: Record<UserRole, "brand" | "accent" | "neutral"> = { admin: "brand", teacher: "accent", student: "neutral" };

function cardTitle(text: string) {
  return (
    <h2 style={{ margin: 0, font: "var(--weight-bold) var(--text-h4-size)/var(--text-h4-lh) var(--font-display)", color: "var(--text-heading)" }}>
      {text}
    </h2>
  );
}

/** Portado de src/app/admin/usuarios/[id]/page.tsx. */
export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user: authUser } = useAuth();
  const userQuery = useUserDetail(id ?? "");
  const roleChangesQuery = useRoleChanges(id ?? "");
  const programsQuery = usePrograms();
  const archiveMutation = useArchiveUser(id ?? "");
  const restoreMutation = useRestoreUser(id ?? "");

  if (userQuery.isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-6) 0" }}>
        <Spinner size={28} label="Cargando…" />
      </div>
    );
  }

  if (userQuery.isError || !userQuery.data) {
    return <EmptyState icon="warning" title="Este usuario no existe">Vuelve al listado de usuarios.</EmptyState>;
  }

  const user = userQuery.data;
  const roleChanges = roleChangesQuery.data ?? [];
  const programs = programsQuery.data ?? [];
  const isSelf = authUser?.id === user.id;
  const isArchived = user.archivedAt !== null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div>
        <Link
          to="/admin/usuarios"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, font: "var(--weight-semibold) 13px/1 var(--font-body)", color: "var(--text-muted)", textDecoration: "none" }}
        >
          <Icon name="arrow-left" size={14} /> Volver a Usuarios
        </Link>
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12, marginTop: 8 }}>
          <h1
            style={{
              font: "var(--weight-bold) var(--text-h2-size)/var(--text-h2-lh) var(--font-display)",
              letterSpacing: "var(--text-h2-ls)",
              color: "var(--text-heading)",
              margin: 0,
            }}
          >
            {user.firstName} {user.lastName}
          </h1>
          <Tag tone={ROLE_TONE[user.role]}>{ROLE_LABEL[user.role]}</Tag>
          <Tag tone={user.status === "active" ? "success" : "danger"}>{user.status === "active" ? "Activo" : "Inactivo"}</Tag>
          {user.accessStatus && (
            <Tag tone={user.accessStatus === "activated" ? "success" : "warning"}>
              Acceso {user.accessStatus === "activated" ? "activado" : "pendiente"}
            </Tag>
          )}
          {isArchived && <Tag tone="neutral">Archivado</Tag>}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "var(--space-5)" }}>
        <Card header={cardTitle("Datos del perfil")}>
          <UserEditForm user={user} programs={programs} />
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          <Card header={cardTitle("Archivo")}>
            {isArchived ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "var(--text-body-sm-size)" }}>
                  Archivado el {user.archivedAt ? formatLongDateInLima(new Date(user.archivedAt)) : "—"}. No aparece como candidato en salones ni
                  puede promoverse a docente. Su historial y su cuenta no se ven afectados.
                </p>
                <ReasonConfirmButton
                  label="Restaurar usuario"
                  icon="arrow-counter-clockwise"
                  variant="secondary"
                  confirmTitle="Restaurar usuario"
                  confirmDescription="El usuario vuelve a considerarse operativo (puede asignarse a salones, promoverse a docente, etc.). Esto no cambia su estado activo/inactivo."
                  confirmLabel="Restaurar"
                  reasonPlaceholder="Ej. corrección administrativa, reincorporación…"
                  action={async (reason) => {
                    try {
                      await restoreMutation.mutateAsync(reason);
                      return {};
                    } catch (err) {
                      return { error: err instanceof Error ? err.message : "No pudimos restaurar el usuario." };
                    }
                  }}
                />
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "var(--text-body-sm-size)" }}>
                  Archivar deja de considerar a este usuario como candidato operativo (no aparece para asignar a salones ni para promover a
                  docente). No elimina su cuenta, historial, pagos ni clases.
                </p>
                <ReasonConfirmButton
                  label="Archivar usuario"
                  icon="archive"
                  variant="secondary"
                  destructive
                  disabled={isSelf}
                  confirmTitle="Archivar usuario"
                  confirmDescription="El usuario deja de ser un candidato operativo. Su historial se conserva íntegro y puede restaurarse en cualquier momento."
                  confirmLabel="Archivar"
                  reasonPlaceholder="Ej. dejó la academia, cuenta duplicada…"
                  action={async (reason) => {
                    try {
                      await archiveMutation.mutateAsync(reason);
                      return {};
                    } catch (err) {
                      return { error: err instanceof Error ? err.message : "No pudimos archivar el usuario." };
                    }
                  }}
                />
                {isSelf && (
                  <span style={{ font: "var(--weight-regular) var(--text-caption-size)/1.4 var(--font-body)", color: "var(--text-muted)" }}>
                    No puedes archivar tu propio perfil.
                  </span>
                )}
              </div>
            )}
          </Card>

          <Card header={cardTitle("Estado de la cuenta")}>
            <StatusToggle userId={user.id} status={user.status} isSelf={isSelf} />
            {user.accessStatus && (
              <p style={{ marginTop: "var(--space-3)", font: "var(--weight-regular) var(--text-caption-size)/1.4 var(--font-body)", color: "var(--text-muted)" }}>
                {user.accessStatus === "activated"
                  ? "Este estudiante ya configuró su contraseña y puede iniciar sesión."
                  : "Todavía no configuró su contraseña definitiva: sigue usando la temporal (o una invitación pendiente de aceptar)."}
                {" "}Esto es independiente de si su cuenta está activa o inactiva arriba.
              </p>
            )}
          </Card>

          {user.role === "student" && (
            <Card header={cardTitle("Acceso")}>
              <ResetTempPasswordPanel userId={user.id} fullName={`${user.firstName} ${user.lastName}`} />
            </Card>
          )}

          {user.role === "student" && user.status === "active" && (
            <Card header={cardTitle("Rol")}>
              <PromoteToTeacherPanel userId={user.id} fullName={`${user.firstName} ${user.lastName}`} />
            </Card>
          )}

          {user.role === "teacher" && user.teacherProfile && (
            <Card header={cardTitle("Perfil docente")}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div>
                  <span style={{ color: "var(--text-muted)" }}>Tarifa por hora: </span>
                  <strong>S/ {user.teacherProfile.hourlyRate.toFixed(2)}</strong>
                </div>
                <div>
                  <span style={{ color: "var(--text-muted)" }}>Estado docente: </span>
                  <Tag tone={user.teacherProfile.status === "active" ? "success" : "danger"} size="sm">
                    {user.teacherProfile.status === "active" ? "Activo" : "Inactivo"}
                  </Tag>
                </div>
                {user.teacherProfile.bio && <p style={{ margin: 0, color: "var(--text-body)" }}>{user.teacherProfile.bio}</p>}
              </div>
            </Card>
          )}
        </div>
      </div>

      <Card header={cardTitle("Historial de cambios de rol")}>
        <RoleChangesHistory entries={roleChanges} />
      </Card>
    </div>
  );
}
