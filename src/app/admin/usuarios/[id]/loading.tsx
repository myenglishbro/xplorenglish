import { Spinner } from "@/components/ui/feedback/Spinner";

export default function AdminUserDetailLoading() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "50vh" }}>
      <Spinner size={28} label="Cargando usuario…" />
    </div>
  );
}
