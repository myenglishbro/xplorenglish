import { Card } from "@/components/ui/surfaces/Card";
import { Logo } from "@/components/ui/core/Logo";
import { SetPasswordForm } from "./SetPasswordForm";

// Server Component deliberadamente sin ningún chequeo de sesión (getAuthUser/requireProfile):
// en la primera carga -- justo después del redirect de Supabase Auth -- el servidor todavía NO
// tiene la sesión (llega como fragmento de URL, solo el navegador la ve). Toda la lógica que
// depende de la sesión vive en SetPasswordForm (Client Component).
export default function SetPasswordPage() {
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
      <Card accent="accent" style={{ maxWidth: 440, width: "100%" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          <Logo height={40} />
          <div>
            <span className="xp-eyebrow">{"// ACTIVA TU ACCESO"}</span>
            <h1
              style={{
                font: "var(--weight-bold) var(--text-h2-size)/var(--text-h2-lh) var(--font-display)",
                letterSpacing: "var(--text-h2-ls)",
                color: "var(--text-heading)",
                margin: "6px 0 0",
              }}
            >
              Crea tu contraseña
            </h1>
          </div>

          <SetPasswordForm />
        </div>
      </Card>
    </main>
  );
}
