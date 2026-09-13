import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getAuthUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getMyStudentProfile } from "@/server/student/profile/queries";
import { Card } from "@/components/ui/surfaces/Card";
import { Tag } from "@/components/ui/core/Tag";
import { MyStudentProfileForm } from "@/components/student/profile/MyStudentProfileForm";

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

/**
 * email sale de getAuthUser().email (la sesión ya lo trae) -- nunca de la Admin API, a
 * diferencia de /admin/usuarios donde se resuelve el email de OTRO usuario. Acá es la propia
 * sesión, así que no hace falta ningún privilegio extra.
 */
export default async function StudentPerfilPage() {
  const authUser = await getAuthUser();
  const supabase = createClient();
  const profile = authUser ? await getMyStudentProfile(supabase, authUser.id) : null;

  if (!profile) notFound();

  const email = authUser?.email ?? null;

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
            <ReadOnlyField label="Email" value={email ?? "—"} />
          </div>
          <MyStudentProfileForm profile={profile} />
        </Card>

        <Card header={cardTitle("Información académica")}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            <ReadOnlyField label="Nivel actual" value={profile.level} />
            <ReadOnlyField label="Programa" value={profile.programName ?? "Sin programa asignado"} />
            <div>
              <span style={{ color: "var(--text-muted)" }}>Estado de cuenta: </span>
              <Tag tone={profile.status === "active" ? "success" : "danger"} size="sm">
                {profile.status === "active" ? "Activo" : "Inactivo"}
              </Tag>
            </div>
            <p style={{ margin: "var(--space-2) 0 0", color: "var(--text-muted)", fontSize: "var(--text-caption-size)" }}>
              Nivel, programa y estado los gestiona el admin.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
