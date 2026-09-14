import { useNavigate } from "react-router-dom";

import { Logo } from "@/components/ui/core/Logo";

const NAV_LINKS = [
  { href: "#inicio", label: "Inicio" },
  { href: "#programas", label: "Programas" },
  { href: "#metodologia", label: "Metodología" },
  { href: "#nosotros", label: "Nosotros" },
  { href: "#contacto", label: "Contacto" },
];

/**
 * Sin teléfono/dirección/redes -- todavía no existen datos reales de contacto
 * en el proyecto, así que la sección de contacto se deja como placeholder
 * explícito en vez de inventarlos.
 */
export function LandingFooter() {
  const navigate = useNavigate();

  return (
    <footer
      style={{
        position: "relative",
        overflow: "hidden",
        background:
          "linear-gradient(180deg, var(--xp-black) 0%, color-mix(in srgb, var(--xp-black) 92%, #071820) 100%)",
        color: "var(--neutral-300)",
      }}
    >
      {/* Decorative glow */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: -180,
          right: -140,
          width: 420,
          height: 420,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--xp-cyan) 14%, transparent) 0%, transparent 68%)",
          pointerEvents: "none",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-16">
        <div className="grid gap-12 lg:grid-cols-[1.25fr_1fr] lg:gap-20">
          {/* Brand */}
          <div className="max-w-md">
            <Logo height={30} showWordmarkFallback />

            <p
              style={{
                marginTop: 18,
                maxWidth: 390,
                font: "var(--weight-regular) var(--text-body-sm-size)/1.75 var(--font-body)",
                color: "var(--neutral-400)",
              }}
            >
              Programas de inglés para niños, adolescentes y adultos, con
              acompañamiento docente y una plataforma educativa propia.
            </p>

            <div
              style={{
                width: 42,
                height: 3,
                marginTop: 24,
                borderRadius: 999,
                background: "var(--xp-cyan)",
                opacity: 0.9,
              }}
            />
          </div>

          {/* Footer navigation */}
          <div className="grid gap-10 sm:grid-cols-3">
            <FooterColumnTitle>Navegación</FooterColumnTitle>

            <div className="sm:col-start-1">
              <ul
                style={{
                  listStyle: "none",
                  margin: 0,
                  padding: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 11,
                }}
              >
                {NAV_LINKS.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className="group inline-flex items-center gap-2 transition-all duration-200 hover:translate-x-1"
                      style={{
                        color: "var(--neutral-300)",
                        font: "var(--weight-medium) var(--text-body-sm-size)/1.3 var(--font-body)",
                        textDecoration: "none",
                      }}
                    >
                      <span
                        className="transition-all duration-200 group-hover:w-3"
                        style={{
                          display: "inline-block",
                          width: 0,
                          height: 1,
                          background: "var(--xp-cyan)",
                        }}
                      />
                      <span className="transition-colors duration-200 group-hover:text-white">
                        {link.label}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <FooterColumnTitle>Contacto</FooterColumnTitle>

              <div
                style={{
                  marginTop: 16,
                  padding: "14px 16px",
                  borderRadius: 12,
                  border:
                    "1px solid color-mix(in srgb, var(--neutral-700) 65%, transparent)",
                  background:
                    "color-mix(in srgb, var(--neutral-900) 58%, transparent)",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    font: "var(--weight-regular) var(--text-body-sm-size)/1.55 var(--font-body)",
                    color: "var(--neutral-400)",
                  }}
                >
                  Información de contacto próximamente.
                </p>
              </div>
            </div>

            {/* Platform access */}
            <div>
              <FooterColumnTitle>Acceso</FooterColumnTitle>

              <button
                type="button"
                onClick={() => navigate("/login")}
                className="group mt-4 inline-flex items-center gap-2 transition-all duration-200 hover:gap-3"
                style={{
                  border: "none",
                  padding: 0,
                  background: "none",
                  cursor: "pointer",
                  color: "var(--xp-cyan)",
                  font: "var(--weight-semibold) var(--text-body-sm-size)/1.3 var(--font-body)",
                }}
              >
                <span>Ingresar a la plataforma</span>

                <span
                  aria-hidden="true"
                  style={{
                    fontSize: 18,
                    lineHeight: 1,
                  }}
                >
                  →
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="mt-12 flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between lg:mt-16"
          style={{
            borderTop:
              "1px solid color-mix(in srgb, var(--neutral-700) 65%, transparent)",
          }}
        >
          <p
            style={{
              margin: 0,
              font: "var(--weight-regular) var(--text-caption-size)/1.4 var(--font-body)",
              color: "var(--neutral-500)",
            }}
          >
            © {new Date().getFullYear()} Xplore English. Todos los derechos
            reservados.
          </p>

          <div
            aria-hidden="true"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              color: "var(--neutral-600)",
              font: "var(--weight-medium) var(--text-caption-size)/1 var(--font-body)",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--xp-cyan)",
              }}
            />
            Plataforma educativa
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumnTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        font: "var(--weight-bold) var(--text-micro-size)/1 var(--font-display)",
        textTransform: "uppercase",
        letterSpacing: ".11em",
        color: "var(--neutral-500)",
      }}
    >
      {children}
    </div>
  );
}