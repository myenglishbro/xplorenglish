import type { ReactNode } from "react";
import { useAuth } from "@/auth/useAuth";
import { useMyTeacherProfile } from "@/features/profile/hooks";
import { Card } from "@/components/ui/surfaces/Card";
import { Tag } from "@/components/ui/core/Tag";
import { Spinner } from "@/components/ui/feedback/Spinner";
import { Alert } from "@/components/ui/feedback/Alert";
import { MyTeacherProfileForm } from "@/components/teacher/profile/MyTeacherProfileForm";

function cardTitle(text: string) {
  return (
    <h2 style={{ margin: 0, font: "var(--weight-bold) var(--text-h4-size)/var(--text-h4-lh) var(--font-display)", color: "var(--text-heading)" }}>
      {text}
    </h2>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <span style={{ color: "var(--text-muted)" }}>{label}: </span>
      <strong>{value}</strong>
    </div>
  );
}

export function TeacherPerfilPage() {
  const { user } = useAuth();
  const { data: profile, isLoading, isError } = useMyTeacherProfile();

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-6) 0" }}>
        <Spinner size={28} label="Cargando perfil…" />
      </div>
    );
  }

  if (isError || !profile) {
    return <Alert tone="danger">No pudimos cargar tu perfil. Recarga la página.</Alert>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <h1
        style={{
          font: "var(--weight-bold) var(--text-h2-size)/var(--text-h2-lh) var(--font-display)",
          letterSpacing: "var(--text-h2-ls)",
          color: "var(--text-heading)",
          margin: 0,
        }}
      >
        Mi perfil
      </h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "var(--space-5)" }}>
        <Card header={cardTitle("Datos personales")}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", marginBottom: "var(--space-4)" }}>
            <ReadOnlyField label="DNI" value={profile.dni} />
            <ReadOnlyField label="Email" value={user?.email ?? "—"} />
          </div>
          <MyTeacherProfileForm profile={profile} />
        </Card>

        <Card header={cardTitle("Perfil docente")}>
          {profile.teacherProfile ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Tarifa por hora: </span>
                <strong>S/ {profile.teacherProfile.hourlyRate.toFixed(2)}</strong>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Estado docente: </span>
                <Tag tone={profile.teacherProfile.status === "active" ? "success" : "danger"} size="sm">
                  {profile.teacherProfile.status === "active" ? "Activo" : "Inactivo"}
                </Tag>
              </div>
              <div>
                <span style={{ color: "var(--text-muted)" }}>Bio: </span>
                {profile.teacherProfile.bio ? (
                  <p style={{ margin: "4px 0 0", color: "var(--text-body)" }}>{profile.teacherProfile.bio}</p>
                ) : (
                  <span style={{ color: "var(--text-muted)" }}>Sin bio todavía.</span>
                )}
              </div>
              <p style={{ margin: "var(--space-2) 0 0", color: "var(--text-muted)", fontSize: "var(--text-caption-size)" }}>
                Tarifa y estado docente los gestiona el admin.
              </p>
            </div>
          ) : (
            <span style={{ color: "var(--text-muted)" }}>Sin perfil docente todavía.</span>
          )}
        </Card>
      </div>
    </div>
  );
}
