import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth/session";
import { getUserDetail, getRoleChanges, listPrograms } from "@/server/admin/users/queries";
import type { UserRole } from "@/server/admin/users/types";
import { Card } from "@/components/ui/surfaces/Card";
import { Tag } from "@/components/ui/core/Tag";
import { Icon } from "@/components/ui/core/Icon";
import { UserEditForm } from "@/components/admin/users/UserEditForm";
import { StatusToggle } from "@/components/admin/users/StatusToggle";
import { PromoteToTeacherPanel } from "@/components/admin/users/PromoteToTeacherPanel";
import { ResetTempPasswordPanel } from "@/components/admin/users/ResetTempPasswordPanel";
import { RoleChangesHistory } from "@/components/admin/users/RoleChangesHistory";

const ROLE_LABEL: Record<UserRole, string> = { admin: "Admin", teacher: "Docente", student: "Estudiante" };
const ROLE_TONE: Record<UserRole, "brand" | "accent" | "neutral"> = { admin: "brand", teacher: "accent", student: "neutral" };

function cardTitle(text: string) {
  return (
    <h2 style={{ margin: 0, font: "var(--weight-bold) var(--text-h4-size)/var(--text-h4-lh) var(--font-display)", color: "var(--text-heading)" }}>
      {text}
    </h2>
  );
}

export default async function AdminUserDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [user, authUser] = await Promise.all([getUserDetail(supabase, params.id), getAuthUser()]);

  if (!user) {
    notFound();
  }

  const [roleChanges, programs] = await Promise.all([getRoleChanges(supabase, user.id), listPrograms(supabase)]);

  const isSelf = authUser?.id === user.id;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div>
        <Link
          href="/admin/usuarios"
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
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "var(--space-5)" }}>
        <Card header={cardTitle("Datos del perfil")}>
          <UserEditForm user={user} programs={programs} />
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
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
