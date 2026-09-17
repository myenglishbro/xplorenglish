import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Icon } from "@/components/ui/core/Icon";

const NAV_ITEMS = [
  { label: "Inicio", href: "#inicio" },
  { label: "Programas", href: "#programas" },
  { label: "Metodología", href: "#metodologia" },
  { label: "Precios", href: "#precios" },
  { label: "Nosotros", href: "#nosotros" },
  { label: "Contacto", href: "#contacto" },
];

const WHATSAPP_URL = "https://wa.link/d48tyx";

const LOGO_URL =
  "https://i.ibb.co/s98L0HxT/explore-english-1.png";

export function LandingNavbar() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  function closeMenu() {
    setMobileOpen(false);
  }

  return (
    <header
      className="
        sticky
        top-0
        z-50
        w-full
        border-b
        border-[#e4e9e8]
        bg-[#f9fbfa]/95
        shadow-[0_6px_24px_rgba(15,47,65,.04)]
        backdrop-blur-xl
      "
    >
      {/* =====================================================
          BRAND LINE
      ====================================================== */}

      <div
        aria-hidden="true"
        className="
          absolute
          inset-x-0
          top-0
          h-[2px]
          bg-gradient-to-r
          from-transparent
          via-[#ff7100]
          to-transparent
        "
      />

      {/* =====================================================
          NAVBAR
      ====================================================== */}

      <div className="mx-auto max-w-[1320px] px-5 sm:px-7 lg:px-8">
        <div
          className="
            flex
            h-[78px]
            items-center
            justify-between
            gap-6
          "
        >
          {/* =================================================
              LOGO
          ================================================== */}

          <a
            href="#inicio"
            onClick={closeMenu}
            aria-label="X-plore English - Inicio"
            className="
              group/logo
              flex
              shrink-0
              items-center
              rounded-lg
              outline-none

              focus-visible:ring-2
              focus-visible:ring-[#ff7100]/30
              focus-visible:ring-offset-2
            "
          >
            <img
              src={LOGO_URL}
              alt="X-plore English"
              className="
                block
                h-[158px]
                w-auto
                max-w-[195px]
                object-contain

                transition-all
                duration-300
                ease-out

                group-hover/logo:-translate-y-[1px]
                group-hover/logo:scale-[1.035]

                motion-reduce:transform-none
              "
            />
          </a>

          {/* =================================================
              DESKTOP NAVIGATION
          ================================================== */}

          <nav
            aria-label="Navegación principal"
            className="
              hidden
              items-center
              gap-0.5
              lg:flex
            "
          >
            {NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="
                  group/nav
                  relative
                  flex
                  min-h-[42px]
                  items-center
                  justify-center
                  rounded-[10px]
                  px-3.5

                  text-[12px]
                  font-semibold
                  text-[#536b76]

                  transition-all
                  duration-300

                  hover:bg-[#fff3e9]
                  hover:text-[#d95f00]

                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-[#ff7100]/25
                "
              >
                <span
                  className="
                    relative
                    z-10
                    transition-transform
                    duration-300
                    group-hover/nav:-translate-y-[1px]
                  "
                >
                  {item.label}
                </span>

                {/* orange underline */}

                <span
                  aria-hidden="true"
                  className="
                    absolute
                    bottom-[4px]
                    left-1/2
                    h-[2px]
                    w-[18px]
                    -translate-x-1/2
                    scale-x-0
                    rounded-full
                    bg-[#ff7100]

                    transition-transform
                    duration-300

                    group-hover/nav:scale-x-100
                  "
                />
              </a>
            ))}
          </nav>

          {/* =================================================
              DESKTOP ACTIONS
          ================================================== */}

          <div
            className="
              hidden
              shrink-0
              items-center
              gap-2.5
              lg:flex
            "
          >
            {/* ===============================================
                LOGIN
            ================================================ */}

            <button
              type="button"
              onClick={() => navigate("/login")}
              className="
                group/login
                inline-flex
                min-h-[46px]
                items-center
                justify-center
                gap-2.5
                rounded-[12px]

                border
                border-[#cbd8dd]
                bg-white
                px-4

                text-[12px]
                font-bold
                text-[#17394b]

                shadow-[0_3px_10px_rgba(15,47,65,.035)]

                transition-all
                duration-300
                ease-out

                hover:-translate-y-0.5
                hover:border-[#17394b]
                hover:bg-[#17394b]
                hover:text-white
                hover:shadow-[0_8px_18px_rgba(15,47,65,.14)]

                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-[#17394b]/25
                focus-visible:ring-offset-2

                motion-reduce:transform-none
              "
            >
              <span
                className="
                  grid
                  h-7
                  w-7
                  place-items-center
                  rounded-full
                  bg-[#edf3f4]
                  text-[#17394b]

                  transition-all
                  duration-300

                  group-hover/login:bg-white/15
                  group-hover/login:text-white
                "
              >
                <Icon
                  name="user"
                  size={13}
                  color="currentColor"
                />
              </span>

              <span>Iniciar sesión</span>
            </button>

            {/* ===============================================
                PRIMARY CTA
            ================================================ */}

            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="
                group/cta
                inline-flex
                min-h-[46px]
                items-center
                justify-center
                gap-3
                rounded-[12px]

                bg-[#ff7100]
                px-5

                text-[12px]
                font-bold
                text-white

                shadow-[0_7px_18px_rgba(255,113,0,.18)]

                transition-all
                duration-300
                ease-out

                hover:-translate-y-0.5
                hover:bg-[#ed6800]
                hover:shadow-[0_11px_24px_rgba(255,113,0,.24)]

                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-[#ff7100]/30
                focus-visible:ring-offset-2

                motion-reduce:transform-none
              "
            >
              <span>Quiero empezar</span>

              <span
                className="
                  transition-transform
                  duration-300
                  group-hover/cta:translate-x-1
                "
              >
                <Icon
                  name="arrow-right"
                  size={14}
                  color="currentColor"
                />
              </span>
            </a>
          </div>

          {/* =================================================
              MOBILE TOGGLE
          ================================================== */}

          <button
            type="button"
            onClick={() => setMobileOpen((value) => !value)}
            aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={mobileOpen}
            aria-controls="landing-mobile-menu"
            className="
              grid
              h-11
              w-11
              shrink-0
              place-items-center
              rounded-[12px]

              border
              border-[#f0d2b9]
              bg-[#fff5ed]
              text-[#dd6200]

              transition-all
              duration-300

              hover:border-[#ffb87f]
              hover:bg-[#ffe9d7]
              hover:text-[#ff7100]

              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-[#ff7100]/30

              lg:hidden
            "
          >
            <Icon
              name={mobileOpen ? "x" : "list"}
              size={23}
              color="currentColor"
            />
          </button>
        </div>
      </div>

      {/* =====================================================
          MOBILE MENU
      ====================================================== */}

      <div
        id="landing-mobile-menu"
        className={`
          overflow-hidden
          border-t
          border-[#e4e9e8]
          bg-[#fafcfb]/98
          backdrop-blur-xl

          transition-[max-height,opacity]
          duration-300
          ease-out

          lg:hidden

          ${
            mobileOpen
              ? "max-h-[680px] opacity-100"
              : "pointer-events-none max-h-0 opacity-0"
          }
        `}
      >
        <div
          className="
            mx-auto
            max-w-[1320px]
            px-5
            py-5
            sm:px-7
          "
        >
          {/* =================================================
              MOBILE LINKS
          ================================================== */}

          <nav
            className="flex flex-col gap-1"
            aria-label="Navegación móvil"
          >
            {NAV_ITEMS.map((item, index) => (
              <a
                key={item.href}
                href={item.href}
                onClick={closeMenu}
                className="
                  group/mobile
                  flex
                  min-h-[50px]
                  items-center
                  justify-between
                  rounded-[12px]
                  px-3.5

                  text-[14px]
                  font-semibold
                  text-[#385866]

                  transition-all
                  duration-300

                  hover:bg-[#fff1e5]
                  hover:pl-4
                  hover:text-[#d95f00]

                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-[#ff7100]/25
                "
              >
                <div className="flex items-center gap-3">
                  <span
                    className="
                      text-[9px]
                      font-bold
                      text-[#ff7100]/70
                    "
                  >
                    0{index + 1}
                  </span>

                  <span>{item.label}</span>
                </div>

                <span
                  className="
                    grid
                    h-7
                    w-7
                    place-items-center
                    rounded-full
                    bg-[#fff0e3]

                    transition-all
                    duration-300

                    group-hover/mobile:translate-x-1
                    group-hover/mobile:bg-[#ffe3cc]
                  "
                >
                  <Icon
                    name="arrow-right"
                    size={12}
                    color="#ff7100"
                  />
                </span>
              </a>
            ))}
          </nav>

          {/* =================================================
              MOBILE ACTIONS
          ================================================== */}

          <div
            className="
              mt-4
              border-t
              border-[#e5e9e8]
              pt-4
            "
          >
            <div className="grid gap-2 sm:grid-cols-2">
              {/* =============================================
                  MOBILE LOGIN
              ============================================== */}

              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  navigate("/login");
                }}
                className="
                  group/mobileLogin
                  inline-flex
                  min-h-[48px]
                  items-center
                  justify-center
                  gap-2.5
                  rounded-[12px]

                  border
                  border-[#cbd8dd]
                  bg-white
                  px-5

                  text-[13px]
                  font-bold
                  text-[#17394b]

                  transition-all
                  duration-300

                  hover:border-[#17394b]
                  hover:bg-[#17394b]
                  hover:text-white

                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-[#17394b]/25
                "
              >
                <span
                  className="
                    grid
                    h-7
                    w-7
                    place-items-center
                    rounded-full
                    bg-[#edf3f4]

                    transition-colors
                    duration-300

                    group-hover/mobileLogin:bg-white/15
                  "
                >
                  <Icon
                    name="user"
                    size={13}
                    color="currentColor"
                  />
                </span>

                Iniciar sesión
              </button>

              {/* =============================================
                  MOBILE CTA
              ============================================== */}

              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeMenu}
                className="
                  group/mobileCta
                  inline-flex
                  min-h-[48px]
                  items-center
                  justify-center
                  gap-3
                  rounded-[12px]

                  bg-[#ff7100]
                  px-5

                  text-[13px]
                  font-bold
                  text-white

                  shadow-[0_7px_18px_rgba(255,113,0,.18)]

                  transition-all
                  duration-300

                  hover:bg-[#ed6800]
                  hover:shadow-[0_10px_22px_rgba(255,113,0,.24)]

                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-[#ff7100]/30
                  focus-visible:ring-offset-2
                "
              >
                Quiero empezar

                <span
                  className="
                    transition-transform
                    duration-300
                    group-hover/mobileCta:translate-x-1
                  "
                >
                  <Icon
                    name="arrow-right"
                    size={14}
                    color="currentColor"
                  />
                </span>
              </a>
            </div>

            {/* =================================================
                SMALL BRAND SIGNATURE
            ================================================== */}

            <div
              className="
                mt-5
                flex
                items-center
                justify-center
                gap-3
              "
            >
              <span
                className="
                  h-px
                  w-5
                  bg-[#ff7100]/40
                "
              />

              <p
                className="
                  text-center
                  text-[9px]
                  font-semibold
                  uppercase
                  tracking-[.1em]
                  text-[#71868f]
                "
              >
                English for the real world
              </p>

              <span
                className="
                  h-px
                  w-5
                  bg-[#ff7100]/40
                "
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}