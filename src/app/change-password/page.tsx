import { redirect } from "next/navigation";
import { getAuthUser, getCurrentProfile } from "@/lib/auth/session";
import { Card } from "@/components/ui/surfaces/Card";
import { Logo } from "@/components/ui/core/Logo";
import { ChangePasswordForm } from "./ChangePasswordForm";

// Server Component con guard propio, deliberadamente SIN requireProfile(): requireProfile()
// redirige AQUÍ cuando must_change_password=true, así que si esta página llamara a
// requireProfile() se generaría un loop de redirect contra sí misma. El único chequeo real es
// "hay sesión" -- getAuthUser(), sin exigir profile ni rol.
export default async function ChangePasswordPage() {
  const user = await getAuthUser();
  if (!user) {
    redirect("/login");
  }

  const profile = await getCurrentProfile();
  if (!profile) {
    // No debería ocurrir para una cuenta creada por admin (el profile se crea junto con la
    // identidad de Auth), pero si pasa, /complete-profile es la red de seguridad universal.
    redirect("/complete-profile");
  }

  if (!profile.must_change_password) {
    // Ya no hay nada que cambiar aquí -- red de seguridad, no un paso obligatorio.
    redirect("/");
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
      <Card accent="accent" style={{ maxWidth: 440, width: "100%" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          <Logo height={40} />
          <div>
            <span className="xp-eyebrow">{"// ÚLTIMO PASO"}</span>
            <h1
              style={{
                font: "var(--weight-bold) var(--text-h2-size)/var(--text-h2-lh) var(--font-display)",
                letterSpacing: "var(--text-h2-ls)",
                color: "var(--text-heading)",
                margin: "6px 0 0",
              }}
            >
              Cambia tu contraseña temporal
            </h1>
          </div>

          <ChangePasswordForm />
        </div>
      </Card>
    </main>
  );
}
