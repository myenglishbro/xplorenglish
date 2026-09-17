import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from "react";

import { Icon } from "@/components/ui/core/Icon";

const WHATSAPP_URL = "https://wa.link/d48tyx";

const HERO_IMAGE =
  "https://i.ibb.co/8DrsY86C/Chat-GPT-Image-15-sept-2026-09-30-10.png";

const WORDS = [
  "tu futuro.",
  "tu carrera.",
  "viajar.",
  "conectar.",
];

const HIGHLIGHTS = [
  "Ruta personalizada",
  "Horarios flexibles",
  "Seguimiento real",
];

export function HeroSection() {
  const [wordIndex, setWordIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const visualRef = useRef<HTMLDivElement>(null);

  /* =========================================================
     TYPEWRITER
  ========================================================== */

  useEffect(() => {
    const currentWord = WORDS[wordIndex];

    let timeout: ReturnType<typeof setTimeout>;

    if (!deleting && displayedText === currentWord) {
      timeout = setTimeout(() => {
        setDeleting(true);
      }, 1800);
    } else if (deleting && displayedText === "") {
      timeout = setTimeout(() => {
        setDeleting(false);
        setWordIndex((current) => (current + 1) % WORDS.length);
      }, 250);
    } else {
      timeout = setTimeout(
        () => {
          setDisplayedText((current) => {
            if (deleting) {
              return current.slice(0, -1);
            }

            return currentWord.slice(0, current.length + 1);
          });
        },
        deleting ? 45 : 85,
      );
    }

    return () => clearTimeout(timeout);
  }, [displayedText, deleting, wordIndex]);

  /* =========================================================
     3D IMAGE
  ========================================================== */

  function handleMouseMove(event: MouseEvent<HTMLDivElement>) {
    const element = visualRef.current;

    if (!element) return;

    const rect = element.getBoundingClientRect();

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateY = ((x - centerX) / centerX) * 3.5;
    const rotateX = -((y - centerY) / centerY) * 3.5;

    element.style.setProperty("--rotate-x", `${rotateX}deg`);
    element.style.setProperty("--rotate-y", `${rotateY}deg`);
  }

  function handleMouseLeave() {
    const element = visualRef.current;

    if (!element) return;

    element.style.setProperty("--rotate-x", "0deg");
    element.style.setProperty("--rotate-y", "0deg");
  }

  return (
    <section
      id="inicio"
      className="
        relative
        isolate
        overflow-hidden
        bg-[#f7faf9]
      "
    >
      {/* =====================================================
          BACKGROUND
      ====================================================== */}

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          inset-0
          -z-30
          bg-[linear-gradient(115deg,#fbfdfc_0%,#f0f8f8_58%,#faf8f3_100%)]
        "
      />

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -left-[200px]
          top-[30px]
          -z-20
          h-[460px]
          w-[460px]
          rounded-full
          bg-[#118AB2]/[0.055]
          blur-[120px]
        "
      />

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -right-[180px]
          top-[-170px]
          -z-20
          h-[480px]
          w-[480px]
          rounded-full
          bg-[#F4A261]/[0.055]
          blur-[130px]
        "
      />

      {/* =====================================================
          HERO CONTENT
      ====================================================== */}

      <div
        className="
          mx-auto
          max-w-[1320px]
          px-5
          py-14

          sm:px-7
          sm:py-16

          lg:px-8
          lg:py-16

          xl:py-[72px]
        "
      >
        <div
          className="
            grid
            items-center
            gap-12

            lg:grid-cols-[.9fr_1.1fr]
            lg:gap-10

            xl:grid-cols-[.88fr_1.12fr]
            xl:gap-12
          "
        >
          {/* =================================================
              LEFT — COPY
          ================================================== */}

          <div className="relative z-20 max-w-[570px]">
            {/* =================================================
                HEADING
            ================================================== */}

            <h1
              className="
                text-[34px]
                font-bold
                leading-[1.04]
                tracking-[-.045em]
                text-[#102f43]

                min-[375px]:text-[38px]
                sm:text-[55px]
                sm:leading-[.98]
                sm:tracking-[-.055em]
                lg:text-[60px]
                xl:text-[66px]
              "
            >
              Inglés para

              <span
                className="
                  mt-1
                  flex
                  min-h-[1.03em]
                  items-center
                  text-[#118AB2]
                "
              >
                {displayedText}

                <span
                  aria-hidden="true"
                  className="
                    ml-1.5
                    inline-block
                    h-[.8em]
                    w-[3px]
                    animate-pulse
                    rounded-full
                    bg-[#118AB2]
                  "
                />
              </span>
            </h1>

            {/* =================================================
                DESCRIPTION
            ================================================== */}

            <p
              className="
                mt-6
                max-w-[530px]
                text-[15px]
                leading-[1.75]
                text-[#60757f]

                sm:text-[16px]
              "
            >
              Aprende el inglés que necesitas para avanzar en tus metas
              personales, académicas y profesionales, con una experiencia
              construida alrededor de ti.
            </p>

            {/* =================================================
                SIMPLE HIGHLIGHTS
            ================================================== */}

            <div
              className="
                mt-7
                flex
                flex-wrap
                items-center
                gap-x-5
                gap-y-3
              "
            >
              {HIGHLIGHTS.map((item, index) => (
                <div
                  key={item}
                  className="
                    group/highlight
                    flex
                    items-center
                    gap-2
                  "
                >
                  <span
                    className="
                      grid
                      h-5
                      w-5
                      place-items-center
                      rounded-full
                      bg-[#dff2f4]

                      transition-all
                      duration-300

                      group-hover/highlight:scale-110
                      group-hover/highlight:bg-[#ccebef]
                    "
                  >
                    <Icon
                      name="check-circle"
                      size={12}
                      color="#118AB2"
                    />
                  </span>

                  <span
                    className="
                      text-[11px]
                      font-semibold
                      text-[#4e6975]
                    "
                  >
                    {item}
                  </span>

                  {index !== HIGHLIGHTS.length - 1 && (
                    <span
                      aria-hidden="true"
                      className="
                        ml-3
                        hidden
                        h-3
                        w-px
                        bg-[#cadadd]

                        sm:block
                      "
                    />
                  )}
                </div>
              ))}
            </div>

            {/* =================================================
                CTA
            ================================================== */}

            <div
              className="
                mt-8
                flex
                flex-col
                gap-3

                sm:flex-row
                sm:items-center
              "
            >
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="
                  group/cta
                  inline-flex
                  min-h-[52px]
                  items-center
                  justify-center
                  gap-4
                  rounded-[13px]
                  bg-[#0b2a3e]
                  px-6
                  text-[12px]
                  font-bold
                  text-white

                  shadow-[0_11px_27px_rgba(11,42,62,.15)]

                  transition-all
                  duration-300

                  hover:-translate-y-1
                  hover:bg-[#12384e]
                  hover:shadow-[0_18px_38px_rgba(11,42,62,.20)]

                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-[#118AB2]
                  focus-visible:ring-offset-2

                  motion-reduce:transform-none
                "
              >
                Agenda tu clase Hoy!

                <span
                  className="
                    transition-transform
                    duration-300
                    group-hover/cta:translate-x-1
                  "
                >
                  →
                </span>
              </a>

              <a
                href="#programas"
                className="
                  group/programs
                  inline-flex
                  min-h-[52px]
                  items-center
                  justify-center
                  gap-3
                  rounded-[13px]
                  border
                  border-[#cadadd]
                  bg-white/65
                  px-5
                  text-[12px]
                  font-bold
                  text-[#284b5d]

                  transition-all
                  duration-300

                  hover:-translate-y-0.5
                  hover:border-[#9fc6ce]
                  hover:bg-white

                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-[#118AB2]
                  focus-visible:ring-offset-2

                  motion-reduce:transform-none
                "
              >
                Explorar programas

                <span
                  className="
                    transition-transform
                    duration-300
                    group-hover/programs:translate-x-1
                  "
                >
                  <Icon
                    name="arrow-right"
                    size={14}
                    color="#118AB2"
                  />
                </span>
              </a>
            </div>

            {/* =================================================
                SMALL SOCIAL PROOF / POSITIONING
            ================================================== */}

            <div
              className="
                mt-7
                flex
                items-center
                gap-3
              "
            >
              <div className="flex -space-x-1.5">
                {[1, 2, 3].map((item) => (
                  <span
                    key={item}
                    className="
                      grid
                      h-7
                      w-7
                      place-items-center
                      rounded-full
                      border-2
                      border-[#f5fafa]
                      bg-[#e1f2f4]
                    "
                  >
                    <Icon
                      name="user"
                      size={11}
                      color="#118AB2"
                    />
                  </span>
                ))}
              </div>

              <p
                className="
                  text-[10px]
                  leading-5
                  text-[#7c8f97]
                "
              >
                Una experiencia de aprendizaje enfocada en{" "}
                <strong className="font-semibold text-[#496571]">
                  tus objetivos y tu progreso.
                </strong>
              </p>
            </div>
          </div>

          {/* =================================================
              RIGHT — HERO ART
          ================================================== */}

          <div
            className="
              relative
              mx-auto
              w-full
              max-w-[660px]

              lg:mx-0
              lg:justify-self-end

              xl:max-w-[700px]
            "
            style={{
              perspective: "1300px",
            }}
          >
            {/* =================================================
                BACKGROUND DOODLES
            ================================================== */}

            {/* dashed orbit */}

            <div
              aria-hidden="true"
              className="
                pointer-events-none
                absolute
                left-[5%]
                top-[17%]
                z-0
                h-[86px]
                w-[86px]
                rounded-full
                border-2
                border-dashed
                border-[#118AB2]/20

                transition-transform
                duration-700

                group-hover:rotate-12
              "
            />

            {/* orange sparkle */}

            <svg
              aria-hidden="true"
              viewBox="0 0 30 30"
              className="
                pointer-events-none
                absolute
                right-[8%]
                top-[6%]
                z-0
                h-8
                w-8
                text-[#F4A261]/55
              "
            >
              <path
                d="M15 0C16.7 9.2 20.8 13.3 30 15C20.8 16.7 16.7 20.8 15 30C13.3 20.8 9.2 16.7 0 15C9.2 13.3 13.3 9.2 15 0Z"
                fill="currentColor"
              />
            </svg>

            {/* cyan plus */}

            <span
              aria-hidden="true"
              className="
                pointer-events-none
                absolute
                right-[1%]
                top-[42%]
                z-0
                text-[25px]
                font-light
                text-[#118AB2]/35
              "
            >
              +
            </span>

            {/* bottom orbit */}

            <div
              aria-hidden="true"
              className="
                pointer-events-none
                absolute
                bottom-[4%]
                right-[5%]
                z-0
                h-[88px]
                w-[88px]
                rounded-full
                border
                border-dashed
                border-[#118AB2]/20
              "
            />

            {/* =================================================
                3D IMAGE
            ================================================== */}

            <div
              ref={visualRef}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              className="
                group/image
                relative
                z-10

                transition-[transform]
                duration-200
                ease-out

                motion-reduce:transform-none
              "
              style={
                {
                  "--rotate-x": "0deg",
                  "--rotate-y": "0deg",

                  transform:
                    "rotateX(var(--rotate-x)) rotateY(var(--rotate-y))",

                  transformStyle: "preserve-3d",
                } as CSSProperties
              }
            >
              <img
                src={HERO_IMAGE}
                alt="Aprende inglés online con X-plore English"
                fetchPriority="high"
                draggable={false}
                className="
                  block
                  h-auto
                  w-full
                  select-none

                  drop-shadow-[0_25px_28px_rgba(18,49,65,.14)]

                  transition-all
                  duration-500
                  ease-out

                  group-hover/image:scale-[1.035]
                  group-hover/image:drop-shadow-[0_35px_34px_rgba(18,49,65,.20)]

                  motion-reduce:transform-none
                "
                style={{
                  transform: "translateZ(30px)",
                }}
              />

              {/* =================================================
                  FLOATING MICRO ELEMENTS
              ================================================== */}

              <div
                aria-hidden="true"
                className="
                  absolute
                  left-[7%]
                  top-[22%]
                  z-20
                  hidden
                  -rotate-[5deg]
                  rounded-[10px]
                  bg-[#fff2d2]/90
                  px-3
                  py-2
                  text-[9px]
                  font-bold
                  text-[#29495a]

                  shadow-[0_9px_22px_rgba(15,42,57,.08)]

                  transition-all
                  duration-500

                  group-hover/image:-translate-x-2
                  group-hover/image:-translate-y-2
                  group-hover/image:-rotate-[8deg]

                  sm:block
                "
                style={{
                  transform: "translateZ(55px)",
                }}
              >
                Great class!
              </div>

              <div
                aria-hidden="true"
                className="
                  absolute
                  right-[3%]
                  top-[21%]
                  z-20
                  hidden
                  rotate-[4deg]
                  rounded-[10px]
                  bg-[#e2f4f6]/90
                  px-3
                  py-2
                  text-[9px]
                  font-bold
                  text-[#31586a]

                  shadow-[0_9px_22px_rgba(15,42,57,.07)]

                  transition-all
                  duration-500

                  group-hover/image:translate-x-2
                  group-hover/image:-translate-y-2
                  group-hover/image:rotate-[7deg]

                  sm:block
                "
                style={{
                  transform: "translateZ(60px)",
                }}
              >
                More confidence
              </div>

              <div
                aria-hidden="true"
                className="
                  absolute
                  bottom-[16%]
                  right-[1%]
                  z-20
                  hidden
                  rotate-[2deg]
                  rounded-[10px]
                  bg-[#e3f5f7]/90
                  px-3
                  py-2
                  text-[9px]
                  font-bold
                  text-[#31586a]

                  shadow-[0_9px_22px_rgba(15,42,57,.07)]

                  transition-all
                  duration-500

                  group-hover/image:translate-x-2
                  group-hover/image:translate-y-1
                  group-hover/image:rotate-[5deg]

                  sm:block
                "
                style={{
                  transform: "translateZ(65px)",
                }}
              >
                Real conversations
              </div>
            </div>

            {/* =================================================
                IMAGE SIGNATURE
            ================================================== */}

            <div
              className="
                relative
                z-20
                mx-auto
                -mt-1
                flex
                max-w-[440px]
                items-center
                justify-center
                gap-3
              "
            >
              <span className="h-px w-8 bg-[#bfd7dc]" />

              <span
                className="
                  text-[9px]
                  font-bold
                  uppercase
                  tracking-[.14em]
                  text-[#6c8088]
                "
              >
                English for the real world.
              </span>

              <span className="h-px w-8 bg-[#bfd7dc]" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}