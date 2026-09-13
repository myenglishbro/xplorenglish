import { redirect } from "next/navigation";
import { getAuthUser, getCurrentProfile } from "@/lib/auth/session";
import { Card } from "@/components/ui/surfaces/Card";
import { Logo } from "@/components/ui/core/Logo";
import { Alert, type AlertTone } from "@/components/ui/feedback/Alert";
import { CompleteProfileForm } from "./CompleteProfileForm";

const ERROR_MESSAGES: Record<string, { tone: AlertTone; message: string }> = {
  dni_taken: { tone: "danger", message: "Este DNI ya está registrado en otra cuenta." },
  missing_data: { tone: "warning", message: "Nos faltan algunos datos para activar tu cuenta. Complétalos abajo." },
  unexpected: { tone: "danger", message: "Algo salió mal al completar tu perfil. Inténtalo de nuevo." },
};

export default async function CompleteProfilePage({ searchParams }: { searchParams: { error?: string } }) {
  const user = await getAuthUser();
  if (!user) {
    redirect("/login");
  }

  const profile = await getCurrentProfile();
  if (profile) {
    // Ya no hay nada que completar -- red de seguridad universal, no un paso obligatorio.
    redirect("/");
  }

  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const defaults = {
    first_name: typeof metadata.first_name === "string" ? metadata.first_name : "",
    last_name: typeof metadata.last_name === "string" ? metadata.last_name : "",
    dni: typeof metadata.dni === "string" ? metadata.dni : "",
    phone: typeof metadata.phone === "string" ? metadata.phone : "",
  };

  const errorKey = typeof searchParams.error === "string" ? searchParams.error : undefined;
  const errorInfo = errorKey ? ERROR_MESSAGES[errorKey] : undefined;

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--surface-page)",
        padding: "var(--space-6)",
      }}
    >
      <Card accent="brand" style={{ maxWidth: 440, width: "100%" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          <Logo height={40} />
          <div>
            <span className="xp-eyebrow">{"// UN ÚLTIMO PASO"}</span>
            <h1
              style={{
                font: "var(--weight-bold) var(--text-h2-size)/var(--text-h2-lh) var(--font-display)",
                letterSpacing: "var(--text-h2-ls)",
                color: "var(--text-heading)",
                margin: "6px 0 0",
              }}
            >
              Completa tu perfil
            </h1>
          </div>

          {errorInfo && <Alert tone={errorInfo.tone}>{errorInfo.message}</Alert>}

          <CompleteProfileForm defaultValues={defaults} />
        </div>
      </Card>
    </main>
  );
}
