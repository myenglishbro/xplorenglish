"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Tabs } from "@/components/ui/navigation/Tabs";

const ITEMS = [
  { value: "salones", label: "Salones" },
  { value: "programas", label: "Programas" },
];

export function SalonesTabs({ active }: { active: "salones" | "programas" }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(tab: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "salones") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    // Cambiar de pestaña resetea los filtros del otro tab (no tienen sentido cruzados).
    params.delete("program");
    params.delete("level");
    params.delete("status");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return <Tabs items={ITEMS} value={active} onChange={handleChange} />;
}
