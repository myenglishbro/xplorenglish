import { useSearchParams } from "react-router-dom";
import { Tabs } from "@/components/ui/navigation/Tabs";

const ITEMS = [
  { value: "salones", label: "Salones" },
  { value: "programas", label: "Programas" },
];

export function SalonesTabs({ active }: { active: "salones" | "programas" }) {
  const [searchParams, setSearchParams] = useSearchParams();

  function handleChange(tab: string) {
    const params = new URLSearchParams(searchParams);
    if (tab === "salones") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    // Cambiar de pestaña resetea los filtros del otro tab (no tienen sentido cruzados).
    params.delete("program");
    params.delete("level");
    params.delete("status");
    setSearchParams(params);
  }

  return <Tabs items={ITEMS} value={active} onChange={handleChange} />;
}
