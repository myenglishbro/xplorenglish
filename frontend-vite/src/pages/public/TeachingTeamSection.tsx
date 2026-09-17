const TEACHERS = [
  {
    name: "José Casanova",
    role: "English Teacher",
    specialty: "Adults · All English Programs",
    description:
      "Inglés básico, intermedio y avanzado, preparación internacional y clases de conversación para adultos.",
    image:
      "https://i.ibb.co/PGDBTpn9/Whats-App-Image-2026-09-15-at-08-29-21.jpg",
  },
  {
    name: "Sarai Taquila",
    role: "English Teacher",
    specialty: "Adults · All English Programs",
    description:
      "Inglés básico, intermedio y avanzado, preparación internacional y clases de conversación para adultos.",
    image:
      "https://i.ibb.co/vvZVFzCR/Whats-App-Image-2026-09-15-at-08-29-21-1.jpg",
  },
  {
    name: "Arantza Ayarza",
    role: "English Teacher",
    specialty: "Kids & Teens · All English Programs",
    description:
      "Inglés básico, intermedio y avanzado, preparación internacional y clases de conversación, con especialización en niños.",
    image:
      "https://i.ibb.co/bRzN50Mp/Whats-App-Image-2026-09-15-at-08-29-21-2.jpg",
  },
  {
    name: "Diana Fernández",
    role: "English Teacher",
    specialty: "Kids & Teens · All English Programs",
    description:
      "Inglés básico, intermedio y avanzado, preparación internacional y clases de conversación, con especialización en niños.",
    image:
      "https://i.ibb.co/bjdZTWW4/Whats-App-Image-2026-09-15-at-08-29-22.jpg",
  },
];

export function TeachingTeamSection() {
  return (
    <section
      id="docentes"
      className="relative overflow-hidden bg-[#f3f7f7]"
    >
      {/* BACKGROUND */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none absolute
          -right-[180px] top-[100px]
          h-[420px] w-[420px]
          rounded-full bg-[#118AB2]/[0.045]
          blur-3xl
        "
      />

      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
        {/* HEADER */}
        <div className="grid gap-8 lg:grid-cols-[1fr_.72fr] lg:items-end">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-px w-7 bg-[#118AB2]" />

              <span className="text-[10px] font-bold uppercase tracking-[.12em] text-[#08738f]">
                Plana docente
              </span>
            </div>

            <h2
              className="
                mt-5 max-w-[680px]
                text-[34px] font-bold
                leading-[1.08]
                tracking-[-.035em]
                text-[#102f43]
                sm:text-[42px]
                lg:text-[50px]
              "
            >
              Docentes que entienden
              <br className="hidden sm:block" /> cómo aprendes.
            </h2>
          </div>

          <p className="max-w-[510px] text-[15px] leading-[1.75] text-[#647681] lg:ml-auto">
            Nuestro equipo acompaña a cada estudiante de manera cercana,
            adaptando las clases a su nivel, objetivos, dificultades y ritmo
            de aprendizaje.
          </p>
        </div>

        {/* TEAM */}
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {TEACHERS.map((teacher, index) => (
            <article
              key={`${teacher.name}-${index}`}
              tabIndex={0}
              className="
                group relative
                min-h-[490px]
                cursor-default
                overflow-hidden
                rounded-[24px]
                bg-[#dce6e8]
                shadow-[0_10px_35px_rgba(15,23,42,.055)]
                outline-none
                transition-all
                duration-500
                hover:-translate-y-1.5
                hover:shadow-[0_25px_55px_rgba(15,23,42,.13)]
                focus-visible:-translate-y-1.5
                focus-visible:ring-2
                focus-visible:ring-[#118AB2]
                focus-visible:ring-offset-3
              "
            >
              {/* PHOTO */}
              <img
                src={teacher.image}
                alt={teacher.name}
                loading="lazy"
                className="
                  absolute inset-0
                  h-full w-full
                  object-cover
                  object-top
                  transition-transform
                  duration-700
                  ease-out
                  group-hover:scale-[1.035]
                  group-focus:scale-[1.035]
                "
              />

              {/* BASE GRADIENT */}
              <div
                aria-hidden="true"
                className="
                  absolute inset-0
                  bg-gradient-to-t
                  from-[#071f30]/95
                  via-[#071f30]/25
                  to-transparent
                  transition-all
                  duration-500
                  group-hover:from-[#071f30]
                  group-hover:via-[#071f30]/45
                  group-focus:from-[#071f30]
                  group-focus:via-[#071f30]/45
                "
              />

              {/* TOP NUMBER */}
              <div
                className="
                  absolute right-4 top-4
                  flex h-9 min-w-9
                  items-center justify-center
                  rounded-full
                  border border-white/25
                  bg-[#071f30]/25
                  px-2
                  text-[10px] font-bold
                  tracking-[.06em]
                  text-white/85
                  backdrop-blur-md
                "
              >
                {String(index + 1).padStart(2, "0")}
              </div>

              {/* CONTENT */}
              <div
                className="
                  absolute inset-x-0 bottom-0
                  p-5
                  sm:p-6
                "
              >
                {/* SPECIALTY */}
                <div
                  className="
                    mb-3
                    inline-flex
                    rounded-full
                    border border-white/15
                    bg-white/10
                    px-3 py-1.5
                    text-[9px] font-bold
                    uppercase
                    tracking-[.08em]
                    text-[#9be6ee]
                    backdrop-blur-md
                  "
                >
                  {teacher.specialty}
                </div>

                {/* NAME */}
                <h3
                  className="
                    text-[21px] font-bold
                    leading-[1.15]
                    tracking-[-.025em]
                    text-white
                  "
                >
                  {teacher.name}
                </h3>

                <p className="mt-1.5 text-[11px] font-semibold text-white/60">
                  {teacher.role}
                </p>

                {/* REVEAL CONTENT */}
                <div
                  className="
                    grid
                    grid-rows-[0fr]
                    opacity-0
                    transition-all
                    duration-500
                    ease-out
                    group-hover:mt-4
                    group-hover:grid-rows-[1fr]
                    group-hover:opacity-100
                    group-focus:mt-4
                    group-focus:grid-rows-[1fr]
                    group-focus:opacity-100
                  "
                >
                  <div className="overflow-hidden">
                    <div className="h-px bg-white/15" />

                    <p className="pt-4 text-[12px] leading-[1.65] text-white/70">
                      {teacher.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* ACCENT */}
              <div
                aria-hidden="true"
                className="
                  absolute inset-x-0 bottom-0
                  h-[3px]
                  origin-left
                  scale-x-0
                  bg-[#54c4d3]
                  transition-transform
                  duration-500
                  group-hover:scale-x-100
                  group-focus:scale-x-100
                "
              />
            </article>
          ))}
        </div>

        {/* BOTTOM STATEMENT */}
        <div
          className="
            mt-8
            flex flex-col
            gap-5
            rounded-[20px]
            border border-[#dce6e8]
            bg-white
            px-6 py-5
            shadow-[0_8px_30px_rgba(15,23,42,.025)]
            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >
          <div>
            <div className="text-[13px] font-bold text-[#173447]">
              Una enseñanza centrada en el estudiante
            </div>

            <p className="mt-1 text-[11px] leading-5 text-[#75868e]">
              El docente, la metodología y el contenido se adaptan a cada
              proceso de aprendizaje.
            </p>
          </div>

          <a
            href="https://wa.link/d48tyx"
            target="_blank"
            rel="noopener noreferrer"
            className="
              group
              inline-flex min-h-[42px]
              shrink-0
              items-center justify-center
              gap-3
              rounded-xl
              bg-[#edf6f7]
              px-4
              text-[12px] font-bold
              text-[#244c63]
              transition-all
              duration-200
              hover:bg-[#dff1f3]
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-[#118AB2]
              focus-visible:ring-offset-2
            "
          >
            Conoce nuestros programas

            <span
              className="
                transition-transform
                duration-200
                group-hover:translate-x-1
              "
            >
              →
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}