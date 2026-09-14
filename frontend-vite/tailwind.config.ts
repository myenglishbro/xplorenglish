import type { Config } from "tailwindcss";

// Tailwind se usa solo para layout/composición (flex, grid, spacing de estructura,
// prefijos responsive). El Design System de X-plore English (src/styles/tokens/*.css)
// sigue siendo la única fuente de verdad visual: no se duplican sus valores aquí.
//
// Los breakpoints por defecto de Tailwind (640/768/1024/1280) ya coinciden exactamente
// con --bp-sm/md/lg/xl del Design System, así que no se sobreescribe `screens`.
//
// Cuando una utilidad necesite un valor exacto del Design System, se usa sintaxis de
// valor arbitrario referenciando la custom property, nunca el hex/px copiado:
//   className="bg-[var(--surface-page)] gap-[var(--space-6)] rounded-[var(--radius-lg)]"
const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  // Sin dark mode (instrucción explícita): simplemente no se usa el variant `dark:`
  // en ningún lado, así que no hace falta declarar una estrategia aquí.
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
