import React from "react";
import { useNavigate } from "react-router-dom";
import { Logo } from "@/components/ui/core/Logo";
import { Icon } from "@/components/ui/core/Icon";
import { Button } from "@/components/ui/core/Button";

const NAV_LINKS = [
  { href: "#inicio", label: "Inicio" },
  { href: "#programas", label: "Programas" },
  { href: "#metodologia", label: "Metodología" },
  { href: "#nosotros", label: "Nosotros" },
  { href: "#contacto", label: "Contacto" },
];

/**
 * Navbar pública de la landing -- vive solo dentro de LandingPage (los anchors #inicio/etc.
 * asumen que se está parado sobre esa misma página). PLATAFORMA navega a /login: si ya hay
 * sesión activa, LoginPage se encarga de redirigir por rol -- este componente no duplica esa
 * lógica.
 */
export function LandingNavbar() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  function goToLogin() {
    setMobileOpen(false);
    navigate("/login");
  }

  return (
    <header
      className="sticky top-0 z-50"
      style={{ background: "var(--surface-card)", borderBottom: "1px solid var(--border-subtle)" }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6" style={{ height: 68 }}>
        <a href="#inicio" onClick={() => setMobileOpen(false)} style={{ display: "flex", alignItems: "center" }}>
          <Logo height={32} showWordmarkFallback />
        </a>

        <nav className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              style={{ font: "var(--weight-semibold) var(--text-body-sm-size)/1 var(--font-body)", color: "var(--text-body)" }}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:block">
          <Button variant="primary" size="sm" icon="graduation-cap" onClick={goToLogin}>
            Plataforma
          </Button>
        </div>

        <button
          type="button"
          aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
          onClick={() => setMobileOpen((v) => !v)}
          className="flex md:hidden"
          style={{ background: "none", border: "none", padding: 8, cursor: "pointer" }}
        >
          <Icon name={mobileOpen ? "x" : "list"} size={26} color="var(--text-heading)" />
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden" style={{ borderTop: "1px solid var(--border-subtle)", background: "var(--surface-card)" }}>
          <nav className="flex flex-col gap-1 px-4 py-3">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                style={{
                  font: "var(--weight-semibold) var(--text-body-size)/1 var(--font-body)",
                  color: "var(--text-body)",
                  padding: "10px 4px",
                }}
              >
                {link.label}
              </a>
            ))}
            <div className="pt-2">
              <Button variant="primary" size="md" icon="graduation-cap" fullWidth onClick={goToLogin}>
                Plataforma
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
