import React from "react";

/** Hook mínimo para lógica responsive condicional en componentes que usan style objects inline
 * (patrón de todo src/components/ui) en vez de clases Tailwind con breakpoints. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState(() => (typeof window !== "undefined" ? window.matchMedia(query).matches : false));

  React.useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (event: MediaQueryListEvent) => setMatches(event.matches);
    setMatches(mql.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}
