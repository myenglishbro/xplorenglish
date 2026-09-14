import { useNavigate } from "react-router-dom";
import { Logo } from "@/components/ui/core/Logo";

const NAV_LINKS = [
  { href: "#inicio", label: "Inicio" },
  { href: "#programas", label: "Programas" },
  { href: "#metodologia", label: "Metodología" },
  { href: "#nosotros", label: "Nosotros" },
  { href: "#contacto", label: "Contacto" },
];

/** Sin teléfono/dirección/redes -- todavía no existen datos reales de contacto en el proyecto,
 * así que la sección de contacto se deja como placeholder explícito en vez de inventarlos. */
export function LandingFooter() {
  const navigate = useNavigate();

  return (
    <footer style={{ background: "var(--xp-black)", color: "var(--neutral-300)" }}>
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          <div style={{ maxWidth: 320 }}>
            <Logo height={28} showWordmarkFallback />
            <p style={{ marginTop: 12, font: "var(--weight-regular) var(--text-body-sm-size)/1.6 var(--font-body)", color: "var(--neutral-400)" }}>
              Programas de inglés para niños, adolescentes y adultos, con acompañamiento docente y una plataforma educativa propia.
            </p>
          </div>

          <div className="flex flex-wrap gap-10">
            <div>
              <div style={{ font: "var(--weight-bold) var(--text-micro-size)/1 var(--font-display)", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--neutral-500)", marginBottom: 12 }}>
                Navegación
              </div>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                {NAV_LINKS.map((link) => (
                  <li key={link.href}>
                    <a href={link.href} style={{ color: "var(--neutral-300)", font: "var(--weight-regular) var(--text-body-sm-size)/1 var(--font-body)" }}>
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div style={{ font: "var(--weight-bold) var(--text-micro-size)/1 var(--font-display)", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--neutral-500)", marginBottom: 12 }}>
                Contacto
              </div>
              <p style={{ margin: 0, font: "var(--weight-regular) var(--text-body-sm-size)/1.5 var(--font-body)", color: "var(--neutral-400)", fontStyle: "italic" }}>
                Información de contacto próximamente.
              </p>
            </div>

            <div>
              <div style={{ font: "var(--weight-bold) var(--text-micro-size)/1 var(--font-display)", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--neutral-500)", marginBottom: 12 }}>
                Acceso
              </div>
              <button
                type="button"
                onClick={() => navigate("/login")}
                style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--xp-cyan)", font: "var(--weight-semibold) var(--text-body-sm-size)/1 var(--font-body)" }}
              >
                Ingresar a la plataforma
              </button>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 40, paddingTop: 20, borderTop: "1px solid var(--neutral-800)" }}>
          <p style={{ margin: 0, font: "var(--weight-regular) var(--text-caption-size)/1 var(--font-body)", color: "var(--neutral-500)" }}>
            © {new Date().getFullYear()} Xplore English. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
