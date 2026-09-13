import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser, getCurrentProfile } from "@/lib/auth/session";
import { Card } from "@/components/ui/surfaces/Card";
import { Logo } from "@/components/ui/core/Logo";
import { RegisterForm } from "./RegisterForm";

export default async function RegisterPage() {
  const user = await getAuthUser();
  if (user) {
    const profile = await getCurrentProfile();
    // Redirect temporal a "/" hasta que existan las rutas por rol.
    redirect(profile ? "/" : "/complete-profile");
  }

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
            <span className="xp-eyebrow">{"// CREA TU CUENTA"}</span>
            <h1
              style={{
                font: "var(--weight-bold) var(--text-h2-size)/var(--text-h2-lh) var(--font-display)",
                letterSpacing: "var(--text-h2-ls)",
                color: "var(--text-heading)",
                margin: "6px 0 0",
              }}
            >
              Regístrate en X-plore English
            </h1>
          </div>

          <RegisterForm />

          <p style={{ font: "var(--weight-regular) var(--text-body-sm-size)/1.5 var(--font-body)", color: "var(--text-muted)" }}>
            ¿Ya tienes cuenta? <Link href="/login">Inicia sesión</Link>
          </p>
        </div>
      </Card>
    </main>
  );
}
