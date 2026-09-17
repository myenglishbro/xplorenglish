import { Icon } from "@/components/ui/core/Icon";

export type ProgramCardData = {
  icon: string;
  title: string;
  audience: string;
  description: string;
  image: string;
};

type ProgramCardProps = {
  program: ProgramCardData;
  whatsappUrl: string;
};

export function ProgramCard({
  program,
  whatsappUrl,
}: ProgramCardProps) {
  return (
    <article
      className="
        group relative flex min-h-[440px] overflow-hidden rounded-[26px]
        border border-slate-200/80 bg-white
        shadow-[0_10px_35px_rgba(15,23,42,0.05)]
        transition-all duration-300 ease-out
        hover:-translate-y-1.5
        hover:border-slate-300
        hover:shadow-[0_24px_60px_rgba(15,23,42,0.12)]
        focus-within:-translate-y-1.5
        focus-within:shadow-[0_24px_60px_rgba(15,23,42,0.12)]
      "
    >
      {/* IMAGE */}
      <div className="absolute inset-x-0 top-0 h-[230px] overflow-hidden bg-slate-100">
        <img
          src={program.image}
          alt={`${program.title} - ${program.audience}`}
          loading="lazy"
          className="
            h-full w-full object-cover
            transition-transform duration-700 ease-out
            group-hover:scale-[1.045]
            group-focus-within:scale-[1.045]
          "
        />

        {/* overlay */}
        <div
          className="
            absolute inset-0
            bg-gradient-to-t
            from-[#0b273b]/55
            via-[#0b273b]/5
            to-transparent
            transition-opacity duration-300
            group-hover:from-[#0b273b]/65
          "
        />

        {/* 1 A 1 */}
        <span
          className="
            absolute right-4 top-4
            rounded-full border border-white/50
            bg-white/90 px-3 py-2
            text-[10px] font-bold uppercase tracking-[0.08em]
            text-[#173447]
            shadow-sm backdrop-blur-md
          "
        >
          1 a 1
        </span>

        {/* ICON */}
        <div
          className="
            absolute bottom-4 left-5
            grid h-11 w-11 place-items-center
            rounded-[13px]
            border border-white/70
            bg-white
            shadow-[0_8px_25px_rgba(0,0,0,0.14)]
            transition-transform duration-300
            group-hover:-translate-y-1
          "
        >
          <Icon
            name={program.icon}
            size={20}
            color="var(--cyan-700)"
          />
        </div>
      </div>

      {/* CONTENT */}
      <div className="relative flex w-full flex-col px-6 pb-6 pt-[255px]">
        <div
          style={{
            font:
              "var(--weight-bold) 10px/1.2 var(--font-display)",
            color: "var(--cyan-700)",
            textTransform: "uppercase",
            letterSpacing: ".1em",
          }}
        >
          {program.audience}
        </div>

        <h3
          className="mt-2"
          style={{
            font:
              "var(--weight-bold) 22px/1.2 var(--font-display)",
            letterSpacing: "-.02em",
            color: "#102f43",
          }}
        >
          {program.title}
        </h3>

        <p
          className="mt-3"
          style={{
            font:
              "var(--weight-regular) var(--text-body-sm-size)/1.65 var(--font-body)",
            color: "#647681",
          }}
        >
          {program.description}
        </p>

        {/* CTA */}
        <div className="mt-auto pt-6">
          <div className="h-px bg-slate-100" />

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="
              mt-4 flex min-h-10 items-center justify-between gap-4
              rounded-xl
              text-sm font-semibold
              text-[#244c63]
              outline-none
              transition-colors duration-200
              focus-visible:ring-2
              focus-visible:ring-[#118AB2]
              focus-visible:ring-offset-2
            "
          >
            <span>Consultar programa</span>

            <span
              className="
                grid h-9 w-9 shrink-0 place-items-center
                rounded-full
                bg-[#edf7f8]
                transition-all duration-300
                group-hover:translate-x-1
                group-hover:bg-[#dff1f3]
              "
            >
              <Icon
                name="arrow-right"
                size={15}
                color="var(--cyan-700)"
              />
            </span>
          </a>
        </div>
      </div>

      {/* subtle bottom accent */}
      <div
        aria-hidden="true"
        className="
          absolute inset-x-0 bottom-0 h-[3px]
          origin-left scale-x-0
          bg-[#118AB2]
          transition-transform duration-300
          group-hover:scale-x-100
          group-focus-within:scale-x-100
        "
      />
    </article>
  );
}