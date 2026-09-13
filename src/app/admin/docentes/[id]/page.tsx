import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserDetail, listPrograms } from "@/server/admin/users/queries";
import { listMyClassroomsAsTeacher } from "@/server/teacher/classrooms/queries";
import { Card } from "@/components/ui/surfaces/Card";
import { Tag } from "@/components/ui/core/Tag";
import { Icon } from "@/components/ui/core/Icon";
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

const TEACHER_ROLE_LABEL: Record<string, string> = { PRIMARY: "Titular", SUBSTITUTE: "Suplente" };

export default async function AdminTeacherDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  // Las 4 son independientes entre sí -- solo necesitan params.id (o nada) -- corren en paralelo.
  // El email es una sola llamada puntual (getUserById para ESTE id), no un loop: distinto del
  // listado, donde listTeachers() ya resuelve todos los emails de una vez vía listUsers().
  const [user, classrooms, authUserResult, programs] = await Promise.all([
    getUserDetail(supabase, params.id),
    listMyClassroomsAsTeacher(supabase, params.id),
    createAdminClient().auth.admin.getUserById(params.id),
    listPrograms(supabase),
  ]);

  if (!user || user.role !== "teacher" || !user.teacherProfile) {
    notFound();
  }

  const email = authUserResult.data.user?.email ?? null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div>
        <Link
          href="/admin/docentes"
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
          <Tag tone={user.teacherProfile.status === "active" ? "success" : "danger"}>
            Estado docente: {user.teacherProfile.status === "active" ? "Activo" : "Inactivo"}
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
            hourlyRate={user.teacherProfile.hourlyRate}
            bio={user.teacherProfile.bio}
            status={user.teacherProfile.status === "inactive" ? "inactive" : "active"}
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
                  <Tag tone={c.role === "PRIMARY" ? "brand" : "accent"} size="sm">{TEACHER_ROLE_LABEL[c.role]}</Tag>
                </div>
                <Link href={`/admin/salones/${c.id}`} style={{ font: "var(--weight-semibold) 13px/1 var(--font-body)", color: "var(--text-accent)" }}>
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
