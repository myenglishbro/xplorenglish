import { Spinner } from "@/components/ui/feedback/Spinner";

export default function AdminNewStudentLoading() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "50vh" }}>
      <Spinner size={28} label="Cargando…" />
    </div>
  );
}
