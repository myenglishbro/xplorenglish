import { useNavigate } from "react-router-dom";

import { Icon } from "@/components/ui/core/Icon";

const WHATSAPP_URL = "https://wa.link/d48tyx";

const CONTACT_LINKS = {
  email: "mailto:Sandra@xplorenglish.com",

  instagramXplor:
    "https://www.instagram.com/xplorenglishperu?stkn=MW8zbGpuN291M3F4Yg%3D%3D&utm_source=qr",

  instagramSandra:
    "https://www.instagram.com/ingles.consandra?stkn=cnltajd0OW04MmNn&utm_source=qr",

  tiktokXplor:
    "https://www.tiktok.com/@xplorenglish?_r=1&_t=ZS-99kzgWlkoNx",

  tiktokSandra:
    "https://www.tiktok.com/@ingles.consandra?_r=1&_t=ZS-99kzenvBquS",
};

const NAV_LINKS = [
  { label: "Inicio", href: "#inicio" },
  { label: "Programas", href: "#programas" },
  { label: "Metodología", href: "#metodologia" },
  { label: "Precios", href: "#precios" },
  { label: "Nosotros", href: "#nosotros" },
  { label: "Contacto", href: "#contacto" },
];

const PROGRAM_LINKS = [
  { label: "Inglés desde Cero", href: "#programas" },
  { label: "Inglés Conversacional", href: "#programas" },
  { label: "Inglés Académico", href: "#programas" },
  { label: "Inglés Profesional", href: "#programas" },
  { label: "Kids & Teens", href: "#programas" },
  { label: "Exámenes Internacionales", href: "#programas" },
];

export function LandingFooter() {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();

  return (
    <footer
      id="contacto"
      className="relative overflow-hidden"
      style={{
        background: "#071f30",
        color: "#ffffff",
      }}
    >
      {/* Decorative glow */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -right-[220px]
          -top-[220px]
          h-[500px]
          w-[500px]
          rounded-full
          bg-[#118AB2]/10
          blur-3xl
        "
      />

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -bottom-[250px]
          left-[10%]
          h-[450px]
          w-[450px]
          rounded-full
          bg-[#F4A261]/[0.04]
          blur-3xl
        "
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        {/* MAIN FOOTER */}
        <div
          className="
            grid
            gap-12
            py-14
            sm:py-16
            lg:grid-cols-[1.25fr_.65fr_.8fr_1fr]
            lg:gap-10
            lg:py-20
          "
        >
          {/* BRAND */}
          <div className="max-w-[360px]">
            <a
              href="#inicio"
              aria-label="X-plore English - Inicio"
              className="inline-flex"
            >
              <img
                src="https://i.ibb.co/s98L0HxT/explore-english-1.png"
                alt="X-plore English"
                className="
                  h-[152px]
                  w-auto
                  object-contain
                 
                  transition-opacity
                  duration-200
                  hover:opacity-80
                "
              />
            </a>

            <p className="mt-6 max-w-[340px] text-[14px] leading-7 text-white/60">
              Clases de inglés online 1 a 1 diseñadas según tu nivel,
              objetivos, ritmo y necesidades reales.
            </p>

            <div className="mt-6">
              <div className="text-[12px] font-bold tracking-[-.01em] text-white">
                English for the real world.
              </div>
            </div>

            {/* WHATSAPP */}
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="
                group
                mt-7
                inline-flex
                min-h-[46px]
                items-center
                gap-3
                rounded-xl
                border
                border-white/10
                bg-white/[.055]
                px-4
                text-[12px]
                font-semibold
                text-white/85
                transition-all
                duration-200
                hover:-translate-y-0.5
                hover:border-white/20
                hover:bg-white/[.09]
                hover:text-white
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-[#79d5df]
                motion-reduce:transform-none
              "
            >
              <span
                className="
                  grid
                  h-8
                  w-8
                  place-items-center
                  rounded-lg
                  bg-[#118AB2]/15
                "
              >
                <Icon
                  name="chats-circle"
                  size={16}
                  color="#8ed8e5"
                />
              </span>

              <span>Hablar con X-plore</span>

              <span
                className="
                  ml-1
                  transition-transform
                  duration-200
                  group-hover:translate-x-1
                "
              >
                →
              </span>
            </a>
          </div>

          {/* NAVIGATION */}
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-[.11em] text-[#8ed8e5]">
              Explora
            </h3>

            <nav
              className="mt-6 flex flex-col items-start gap-1"
              aria-label="Navegación del pie de página"
            >
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="
                    group
                    relative
                    -ml-2
                    rounded-lg
                    px-2
                    py-2
                    text-[13px]
                    font-medium
                    text-white/60
                    transition-all
                    duration-200
                    hover:translate-x-1
                    hover:bg-white/[.035]
                    hover:text-white
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-[#79d5df]
                    motion-reduce:transform-none
                  "
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          {/* PROGRAMS */}
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-[.11em] text-[#8ed8e5]">
              Programas
            </h3>

            <div className="mt-6 flex flex-col items-start gap-1">
              {PROGRAM_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="
                    -ml-2
                    rounded-lg
                    px-2
                    py-2
                    text-[13px]
                    font-medium
                    leading-5
                    text-white/60
                    transition-all
                    duration-200
                    hover:translate-x-1
                    hover:bg-white/[.035]
                    hover:text-white
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-[#79d5df]
                    motion-reduce:transform-none
                  "
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          {/* CONTACT + STUDENT ACCESS */}
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-[.11em] text-[#8ed8e5]">
              Contacto
            </h3>

            {/* EMAIL */}
            <a
              href={CONTACT_LINKS.email}
              className="
                mt-6
                flex
                items-center
                gap-2.5
                text-[12px]
                font-medium
                text-white/65
                transition-colors
                duration-200
                hover:text-white
              "
            >
              <Icon
                name="envelope"
                size={16}
                color="#8ed8e5"
              />

              <span className="break-all">
                Sandra@xplorenglish.com
              </span>
            </a>

            {/* X-PLORE SOCIALS */}
            <div className="mt-6">
              <p className="text-[11px] font-semibold text-white/80">
                X-plore English
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={CONTACT_LINKS.instagramXplor}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram de X-plore English"
                  className="
                    inline-flex
                    items-center
                    gap-2
                    rounded-lg
                    border
                    border-white/10
                    bg-white/[.04]
                    px-3
                    py-2
                    text-[11px]
                    font-medium
                    text-white/60
                    transition-all
                    duration-200
                    hover:-translate-y-0.5
                    hover:border-white/20
                    hover:bg-white/[.08]
                    hover:text-white
                  "
                >
                  Instagram
                </a>

                <a
                  href={CONTACT_LINKS.tiktokXplor}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="TikTok de X-plore English"
                  className="
                    inline-flex
                    items-center
                    gap-2
                    rounded-lg
                    border
                    border-white/10
                    bg-white/[.04]
                    px-3
                    py-2
                    text-[11px]
                    font-medium
                    text-white/60
                    transition-all
                    duration-200
                    hover:-translate-y-0.5
                    hover:border-white/20
                    hover:bg-white/[.08]
                    hover:text-white
                  "
                >
                  TikTok
                </a>
              </div>
            </div>

            {/* SANDRA SOCIALS */}
            <div className="mt-5">
              <p className="text-[11px] font-semibold text-white/80">
                Sandra · Inglés con Sandra
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={CONTACT_LINKS.instagramSandra}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram de Inglés con Sandra"
                  className="
                    inline-flex
                    items-center
                    rounded-lg
                    border
                    border-white/10
                    bg-white/[.04]
                    px-3
                    py-2
                    text-[11px]
                    font-medium
                    text-white/60
                    transition-all
                    duration-200
                    hover:-translate-y-0.5
                    hover:border-white/20
                    hover:bg-white/[.08]
                    hover:text-white
                  "
                >
                  Instagram
                </a>

                <a
                  href={CONTACT_LINKS.tiktokSandra}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="TikTok de Inglés con Sandra"
                  className="
                    inline-flex
                    items-center
                    rounded-lg
                    border
                    border-white/10
                    bg-white/[.04]
                    px-3
                    py-2
                    text-[11px]
                    font-medium
                    text-white/60
                    transition-all
                    duration-200
                    hover:-translate-y-0.5
                    hover:border-white/20
                    hover:bg-white/[.08]
                    hover:text-white
                  "
                >
                  TikTok
                </a>
              </div>
            </div>

            {/* STUDENT LOGIN */}
            <div className="mt-7 border-t border-white/[.07] pt-5">
              <p className="text-[11px] leading-5 text-white/45">
                ¿Ya eres estudiante?
              </p>

              <button
                type="button"
                onClick={() => navigate("/login")}
                className="
                  group
                  mt-3
                  flex
                  min-h-[42px]
                  w-full
                  max-w-[230px]
                  items-center
                  justify-between
                  rounded-xl
                  border
                  border-white/12
                  bg-white/[.055]
                  px-4
                  text-[12px]
                  font-semibold
                  text-white
                  transition-all
                  duration-200
                  hover:-translate-y-0.5
                  hover:border-white/20
                  hover:bg-white/[.09]
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-[#79d5df]
                  motion-reduce:transform-none
                "
              >
                <span className="flex items-center gap-2.5">
                  <Icon
                    name="user"
                    size={15}
                    color="#8ed8e5"
                  />

                  Iniciar sesión
                </span>

                <span
                  className="
                    transition-transform
                    duration-200
                    group-hover:translate-x-1
                  "
                >
                  →
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* DIVIDER */}
        <div className="h-px bg-white/[.08]" />

        {/* BOTTOM FOOTER */}
        <div
          className="
            flex
            flex-col
            gap-5
            py-6
            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >
          <p className="text-[10px] leading-5 text-white/40">
            © {currentYear} X-plore English E.I.R.L. Todos los derechos
            reservados.
          </p>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="text-[10px] text-white/35">
              Inglés online
            </span>

            <span
              aria-hidden="true"
              className="hidden h-1 w-1 rounded-full bg-white/20 sm:block"
            />

            <span className="text-[10px] text-white/35">
              Clases 1 a 1
            </span>

            <span
              aria-hidden="true"
              className="hidden h-1 w-1 rounded-full bg-white/20 sm:block"
            />

            <span className="text-[10px] text-white/35">
              Atención personalizada
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}