import { Icon } from "@/components/ui/core/Icon";

const FOUNDER_IMAGE =
  "https://i.ibb.co/RTQBdWz7/Chat-GPT-Image-14-sept-2026-13-46-52.png";

const LOGO_URL =
  "https://i.ibb.co/s98L0HxT/explore-english-1.png";

export function AboutSection() {
  return (
    <section
      id="nosotros"
      className="
        relative
        overflow-hidden
        bg-[#f5f8f9]
      "
    >
      {/* TOP SEPARATOR */}
      <div
        aria-hidden="true"
        className="
          absolute
          inset-x-0
          top-0
          h-px
          bg-gradient-to-r
          from-transparent
          via-[#dce4e5]
          to-transparent
        "
      />

      <div
        className="
          relative
          mx-auto
          max-w-[1320px]

          px-5
          py-16

          sm:px-7
          sm:py-20

          lg:px-8
          lg:py-24
        "
      >
        <div
          className="
            grid
            gap-14

            lg:grid-cols-[.9fr_1.1fr]
            lg:items-center
            lg:gap-20
          "
        >
          {/* =================================================
              IMAGE
          ================================================== */}

          <div className="relative mx-auto w-full max-w-[520px] lg:mx-0">
            {/* ORANGE DETAIL */}

            <div
              aria-hidden="true"
              className="
                absolute
                -left-5
                top-10
                hidden
                h-[92px]
                w-[3px]
                rounded-full
                bg-[#ff7100]

                lg:block
              "
            />

            {/* PHOTO */}

            <div
              className="
                group/photo
                relative
                aspect-[4/4.65]
                overflow-hidden
                rounded-[28px]
                bg-[#e5ebec]

                shadow-[0_24px_65px_rgba(16,47,67,.10)]
              "
            >
              <img
                src={FOUNDER_IMAGE}
                alt="Sandra Thalia Casanova Pérez, fundadora de X-plore English"
                className="
                  h-full
                  w-full
                  object-cover
                  object-center

                  transition-transform
                  duration-700
                  ease-out

                  group-hover/photo:scale-[1.025]

                  motion-reduce:transform-none
                "
              />

              {/* subtle bottom gradient for depth */}

              <div
                aria-hidden="true"
                className="
                  pointer-events-none
                  absolute
                  inset-x-0
                  bottom-0
                  h-[30%]
                  bg-gradient-to-t
                  from-[#102f43]/20
                  to-transparent
                "
              />

              {/* BRAND SIGNATURE */}

              <div
                className="
                  absolute
                  bottom-5
                  left-5

                  flex
                  items-center
                  gap-3
                  rounded-full

                  border
                  border-white/60
                  bg-white/90
                  px-3.5
                  py-2

                  shadow-[0_7px_22px_rgba(15,23,42,.10)]
                  backdrop-blur-md
                "
              >
                <img
                  src={LOGO_URL}
                  alt=""
                  aria-hidden="true"
                  className="
                    h-[24px]
                    w-auto
                    max-w-[88px]
                    object-contain
                  "
                />

                <span
                  className="
                    h-4
                    w-px
                    bg-[#d9e0e1]
                  "
                />

                <span
                  className="
                    text-[9px]
                    font-bold
                    uppercase
                    tracking-[.1em]
                    text-[#667981]
                  "
                >
                  Founder
                </span>
              </div>
            </div>

            {/* =================================================
                EXPERIENCE CARD
            ================================================== */}

            <div
              className="
                absolute
                -bottom-7
                right-3

                w-[210px]
                rounded-[18px]

                border
                border-[#e5e8e8]
                bg-white

                p-5

                shadow-[0_18px_45px_rgba(15,23,42,.12)]

                sm:right-[-18px]
                sm:w-[230px]
              "
            >
              <div className="flex items-end gap-2">
                <span
                  className="
                    text-[34px]
                    font-bold
                    leading-none
                    tracking-[-.05em]
                    text-[#ff7100]
                  "
                >
                  +12
                </span>

                <span
                  className="
                    pb-[2px]
                    text-[10px]
                    font-bold
                    uppercase
                    tracking-[.08em]
                    text-[#8b989d]
                  "
                >
                  años
                </span>
              </div>

              <p
                className="
                  mt-2
                  text-[12px]
                  font-bold
                  leading-[1.45]
                  text-[#173447]
                "
              >
                de experiencia en la enseñanza del inglés
              </p>

              <div
                className="
                  mt-4
                  h-[2px]
                  w-8
                  rounded-full
                  bg-[#ff7100]
                "
              />
            </div>
          </div>

          {/* =================================================
              CONTENT
          ================================================== */}

          <div className="pt-5 lg:pt-0">
            {/* EYEBROW */}

            <div className="flex items-center gap-3">
              <span
                className="
                  h-[2px]
                  w-7
                  rounded-full
                  bg-[#ff7100]
                "
              />

              <span
                className="
                  text-[10px]
                  font-bold
                  uppercase
                  tracking-[.15em]
                  text-[#d85f00]
                "
              >
                Nuestra historia
              </span>
            </div>

            {/* TITLE */}

            <h2
              className="
                mt-5
                max-w-[650px]

                text-[35px]
                font-bold
                leading-[1.07]
                tracking-[-.04em]
                text-[#102f43]

                sm:text-[43px]
                lg:text-[49px]
              "
              style={{
                fontFamily: "var(--font-display)",
              }}
            >
              Enseñanza que empieza por conocer al estudiante.
            </h2>

            {/* DESCRIPTION */}

            <p
              className="
                mt-6
                max-w-[610px]

                text-[15px]
                leading-[1.75]
                text-[#657780]

                sm:text-[16px]
              "
              style={{
                fontFamily: "var(--font-body)",
              }}
            >
              X-plore English nace con una idea clara: el aprendizaje
              debe responder a las necesidades reales de cada
              estudiante. Por eso, cada experiencia de aprendizaje se
              construye considerando sus objetivos, ritmo y contexto.
            </p>

            {/* =================================================
                QUOTE
            ================================================== */}

            <div
              className="
                relative
                mt-8
                max-w-[620px]

                border-l-[3px]
                border-[#ff7100]

                py-1
                pl-6

                sm:pl-7
              "
            >
              <span
                aria-hidden="true"
                className="
                  absolute
                  -top-4
                  left-5

                  select-none

                  text-[58px]
                  font-bold
                  leading-none
                  text-[#ff7100]/10
                "
              >
                “
              </span>

              <blockquote
                className="
                  relative

                  text-[18px]
                  font-medium
                  leading-[1.65]
                  tracking-[-.015em]
                  text-[#284c5f]

                  sm:text-[20px]
                "
              >
                “La enseñanza debe adaptarse al estudiante y no el
                estudiante a la metodología.”
              </blockquote>
            </div>

            {/* =================================================
                FOUNDER
            ================================================== */}

            <div
              className="
                mt-8
                flex
                items-center
                gap-4
              "
            >
              <div
                className="
                  grid
                  h-11
                  w-11
                  shrink-0
                  place-items-center
                  rounded-full

                  border
                  border-[#f1d7c1]
                  bg-[#fff5ed]
                "
              >
                <Icon
                  name="graduation-cap"
                  size={18}
                  color="#e46600"
                />
              </div>

              <div>
                <div
                  className="
                    text-[14px]
                    font-bold
                    text-[#173447]

                    sm:text-[15px]
                  "
                >
                  Sandra Thalia Casanova Pérez
                </div>

                <div
                  className="
                    mt-1
                    text-[11px]
                    font-medium
                    text-[#7b898f]
                  "
                >
                  Fundadora · X-plore English
                </div>
              </div>
            </div>

            {/* =================================================
                SMALL VALUES
            ================================================== */}

            <div
              className="
                mt-9
                flex
                flex-wrap
                gap-x-6
                gap-y-3

                border-t
                border-[#dde4e5]

                pt-6
              "
            >
              {[
                "Atención personalizada",
                "Objetivos reales",
                "Progreso acompañado",
              ].map((item) => (
                <div
                  key={item}
                  className="
                    flex
                    items-center
                    gap-2
                  "
                >
                  <span
                    className="
                      h-1.5
                      w-1.5
                      rounded-full
                      bg-[#ff7100]
                    "
                  />

                  <span
                    className="
                      text-[10px]
                      font-semibold
                      text-[#718188]
                    "
                  >
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}