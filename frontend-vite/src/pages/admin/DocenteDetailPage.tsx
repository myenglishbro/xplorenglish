import { Link, useParams } from "react-router-dom";
import { useUserDetail, usePrograms, useUserEmails } from "@/features/users/hooks";
import { useTeacherClassrooms } from "@/features/teachers/hooks";
import { Card } from "@/components/ui/surfaces/Card";
import { Tag } from "@/components/ui/core/Tag";
import { Icon } from "@/components/ui/core/Icon";
import { Spinner } from "@/components/ui/feedback/Spinner";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { UserEditForm } from "@/components/admin/users/UserEditForm";
import { TeacherProfileForm } from "@/components/admin/teachers/TeacherProfileForm";

function cardTitle(text: string) {
  return (
    <h2 style={{ margin: 0, font: "var(--weight-bold) var(--text-h4-size)/var(--text-h4-lh) var(--font-display)", color: "var(--text-heading)" }}>
      {text}
    </h2>
  );
}


/** Portado de src/app/admin/docentes/[id]/page.tsx. */
export function DocenteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const userQuery = useUserDetail(id ?? "");
  const classroomsQuery = useTeacherClassrooms(id ?? "");
  const programsQuery = usePrograms();
  const emailsQuery = useUserEmails(id ? [id] : []);

  if (userQuery.isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-6) 0" }}>
        <Spinner size={28} label="Cargando…" />
      </div>
    );
  }

  const user = userQuery.data;
  if (userQuery.isError || !user || user.role !== "teacher" || !user.teacherProfile) {
    return <EmptyState icon="warning" title="Este docente no existe">Vuelve al listado de Docentes.</EmptyState>;
  }

  const teacherProfile = user.teacherProfile;
  const classrooms = classroomsQuery.data ?? [];
  const programs = programsQuery.data ?? [];
  const email = id ? emailsQuery.data?.emails[id] ?? null : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div>
        <Link
          to="/admin/docentes"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, font: "var(--weight-semibold) 13px/1 var(--font-body)", color: "var(--text-muted)", textDecoration: "none" }}
        >
          <Icon name="arrow-left" size={14} /> Volver a Docentes
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
          <Tag tone={teacherProfile.status === "active" ? "success" : "danger"}>
            Estado docente: {teacherProfile.status === "active" ? "Activo" : "Inactivo"}
          </Tag>
          <Tag tone={user.status === "active" ? "success" : "neutral"}>
            Estado de cuenta: {user.status === "active" ? "Activo" : "Inactivo"}
          </Tag>
        </div>
        {email && <p style={{ margin: "8px 0 0", color: "var(--text-muted)" }}>{email}</p>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "var(--space-5)" }}>
        <Card header={cardTitle("Datos personales")}>
          <UserEditForm user={user} programs={programs} />
        </Card>

        <Card header={cardTitle("Perfil docente")}>
          <TeacherProfileForm
            profileId={user.id}
            hourlyRate={teacherProfile.hourlyRate}
            bio={teacherProfile.bio}
            status={teacherProfile.status === "inactive" ? "inactive" : "active"}
          />
        </Card>
      </div>

      <Card header={cardTitle("Salones asignados")}>
        {classrooms.length === 0 ? (
          <EmptyState icon="chalkboard" title="Sin salones asignados">
            Para asignar a este docente a un salón, ve al salón desde Salones y agrégalo ahí.
          </EmptyState>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {classrooms.map((c) => (
              <div
                key={c.id}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, borderTop: "1px solid var(--border-subtle)", paddingTop: "var(--space-2)" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ font: "var(--weight-semibold) var(--text-body-sm-size)/1.3 var(--font-body)", color: "var(--text-heading)" }}>
                    {c.name}
                  </span>
                  <Tag tone="neutral" size="sm">Nivel {c.level}</Tag>
                </div>
                <Link to={`/admin/salones/${c.id}`} style={{ font: "var(--weight-semibold) 13px/1 var(--font-body)", color: "var(--text-accent)" }}>
                  Ver salón →
                </Link>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
