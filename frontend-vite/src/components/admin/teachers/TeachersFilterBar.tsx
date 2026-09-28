import React from "react";
import { useSearchParams } from "react-router-dom";
import { SearchInput } from "@/components/ui/forms/SearchInput";

const SEARCH_DEBOUNCE_MS = 350;

/** Buscador server-side de Admin > Docentes -- debounce local antes de tocar la URL (y por lo
 * tanto la queryKey/query real), para no disparar una request por cada tecla. Enter/click en la
 * lupa (SearchInput.onSubmit) aplica de inmediato, saltándose la espera del debounce. */
export function TeachersFilterBar() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = React.useState(searchParams.get("q") ?? "");

  function applySearch(value: string) {
    const params = new URLSearchParams(searchParams);
    if (value.trim() === "") {
      params.delete("q");
    } else {
      params.set("q", value);
    }
    params.delete("page");
    setSearchParams(params);
  }

  React.useEffect(() => {
    const timer = setTimeout(() => applySearch(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div style={{ maxWidth: 360 }}>
      <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} onSubmit={(value) => applySearch(value ?? "")} placeholder="Buscar docente..." />
    </div>
  );
}
