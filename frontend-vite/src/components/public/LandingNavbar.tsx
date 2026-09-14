import React from "react";

import { useNavigate } from "react-router-dom";

import { Icon } from "@/components/ui/core/Icon";
import { Button } from "@/components/ui/core/Button";

const LOGO_URL =
  "https://i.ibb.co/s98L0HxT/explore-english-1.png";

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
      style={{
        background: "rgba(255,255,255,.94)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderBottom: "1px solid rgba(15,23,42,.07)",
        boxShadow: "0 1px 14px rgba(15,23,42,.025)",
      }}
    >
      <div
        className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6"
        style={{
          height: 76,
        }}
      >
        {/* LOGO */}
        <a
          href="#inicio"
          onClick={() => setMobileOpen(false)}
          aria-label="X-plore English - Inicio"
          style={{
            display: "inline-flex",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <img
            src={LOGO_URL}
            alt="X-plore English"
            style={{
              display: "block",
              width: "auto",
              height: 192,
              maxWidth: 190,
              objectFit: "contain",
            }}
          />
        </a>

        {/* DESKTOP NAV */}
        <nav
          className="hidden items-center md:flex"
          style={{
            gap: 30,
          }}
          aria-label="Navegación principal"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              style={{
                position: "relative",
                textDecoration: "none",
                whiteSpace: "nowrap",
                font:
                  "var(--weight-semibold) var(--text-body-sm-size)/1 var(--font-body)",
                color: "var(--text-body)",
                transition: "color .2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--cyan-700)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text-body)";
              }}
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* DESKTOP CTA */}
        <div className="hidden md:block">
          <Button
            variant="primary"
            size="sm"
            icon="graduation-cap"
            onClick={goToLogin}
          >
            Plataforma
          </Button>
        </div>

        {/* MOBILE TOGGLE */}
        <button
          type="button"
          aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((value) => !value)}
          className="flex md:hidden"
          style={{
            width: 42,
            height: 42,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 10,
            background: mobileOpen ? "#f1f4f5" : "transparent",
            border: "1px solid transparent",
            padding: 0,
            cursor: "pointer",
            transition: "background .2s ease",
          }}
        >
          <Icon
            name={mobileOpen ? "x" : "list"}
            size={25}
            color="var(--text-heading)"
          />
        </button>
      </div>

      {/* MOBILE MENU */}
      {mobileOpen && (
        <div
          className="md:hidden"
          style={{
            background: "#ffffff",
            borderTop: "1px solid var(--border-subtle)",
            boxShadow: "0 18px 36px rgba(15,23,42,.06)",
          }}
        >
          <nav
            className="mx-auto flex max-w-7xl flex-col px-4 pb-5 pt-3 sm:px-6"
            aria-label="Navegación móvil"
          >
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  minHeight: 48,
                  padding: "11px 8px",
                  borderBottom: "1px solid rgba(15,23,42,.05)",
                  textDecoration: "none",
                  font:
                    "var(--weight-semibold) var(--text-body-size)/1.2 var(--font-body)",
                  color: "var(--text-body)",
                }}
              >
                {link.label}
              </a>
            ))}

            <div
              style={{
                paddingTop: 16,
              }}
            >
              <Button
                variant="primary"
                size="md"
                icon="graduation-cap"
                fullWidth
                onClick={goToLogin}
              >
                Ingresar a la plataforma
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}