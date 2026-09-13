import { Card } from "@/components/ui/surfaces/Card";
import { Logo } from "@/components/ui/core/Logo";
import { Alert } from "@/components/ui/feedback/Alert";

export default function CheckEmailPage({ searchParams }: { searchParams: { email?: string } }) {
  const email = typeof searchParams.email === "string" ? searchParams.email : undefined;

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
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <Logo height={40} />
          <div>
            <span className="xp-eyebrow">{"// CONFIRMA TU CORREO"}</span>
            <h1
              style={{
                font: "var(--weight-bold) var(--text-h2-size)/var(--text-h2-lh) var(--font-display)",
                letterSpacing: "var(--text-h2-ls)",
                color: "var(--text-heading)",
                margin: "6px 0 0",
              }}
            >
              Revisa tu correo
            </h1>
          </div>

          <p style={{ font: "var(--weight-regular) var(--text-body-size)/1.6 var(--font-body)", color: "var(--text-body)" }}>
            {email ? (
              <>
                Te enviamos un enlace a <strong>{email}</strong>.
              </>
            ) : (
              "Te enviamos un enlace de confirmación."
            )}{" "}
            Ábrelo desde este mismo dispositivo para activar tu cuenta.
          </p>

          <Alert tone="info" title="¿No te llegó?">
            Revisa tu carpeta de spam. Si pasaron varios minutos y sigue sin aparecer, vuelve a
            intentar el registro con el mismo correo.
          </Alert>
        </div>
      </Card>
    </main>
  );
}
