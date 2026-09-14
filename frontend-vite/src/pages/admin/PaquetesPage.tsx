import React from "react";
import { useAdminHourPackages } from "@/features/hoursAdmin/hooks";
import { useAssignableStudents } from "@/features/classroomsAdmin/hooks";
import { useUserEmails } from "@/features/users/hooks";
import { Card } from "@/components/ui/surfaces/Card";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { Spinner } from "@/components/ui/feedback/Spinner";
import { SearchInput } from "@/components/ui/forms/SearchInput";
import { CreateHourPackageButton } from "@/components/admin/payments/CreateHourPackageButton";
import { HourPackagesTable } from "@/components/admin/hours/HourPackagesTable";

/**
 * Portada real de /admin/paquetes (antes placeholder). Vista de TODOS los paquetes de horas
 * (hours_packages), no de pagos (student_payments) -- ver /admin/pagos-estudiantes para eso.
 * Búsqueda 100% en el cliente sobre lo ya cargado (mismo criterio que ClassroomStudentsPanel):
 * nombre/apellido/DNI vienen embebidos en listHourPackagesForAdmin; el email se resuelve aparte
 * vía el endpoint seguro ya existente (/api/admin/users/emails) y se suma al mismo filtro, sin
 * crear ningún endpoint nuevo.
 */
export function PaquetesPage() {
  const [search, setSearch] = React.useState("");
  const packagesQuery = useAdminHourPackages();
  const studentsQuery = useAssignableStudents();

  const studentIds = React.useMemo(() => [...new Set((packagesQuery.data ?? []).map((p) => p.studentId))], [packagesQuery.data]);
  const emailsQuery = useUserEmails(studentIds);

  const filtered = React.useMemo(() => {
    const packages = packagesQuery.data ?? [];
    const term = search.trim().toLowerCase();
    if (!term) return packages;
    const emails = emailsQuery.data?.emails ?? {};
    return packages.filter((p) => {
      const haystack = `${p.studentFirstName} ${p.studentLastName} ${p.studentDni} ${emails[p.studentId] ?? ""}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [packagesQuery.data, search, emailsQuery.data]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "var(--space-3)" }}>
        <h1
          style={{
            font: "var(--weight-bold) var(--text-h2-size)/var(--text-h2-lh) var(--font-display)",
            letterSpacing: "var(--text-h2-ls)",
            color: "var(--text-heading)",
            margin: 0,
          }}
        >
          Paquetes
        </h1>
        <CreateHourPackageButton students={studentsQuery.data ?? []} triggerLabel="Nuevo paquete de horas" />
      </div>

      <div style={{ maxWidth: 420 }}>
        <SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre, apellido, DNI o correo" />
      </div>

      {packagesQuery.isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-6) 0" }}>
          <Spinner size={28} label="Cargando…" />
        </div>
      ) : packagesQuery.isError || !packagesQuery.data ? (
        <EmptyState icon="warning" title="No pudimos cargar los paquetes">Recarga la página para intentarlo de nuevo.</EmptyState>
      ) : (
        <Card pad={filtered.length === 0}>
          {filtered.length === 0 ? (
            <EmptyState icon="package" title={search ? "Sin resultados" : "Todavía no hay paquetes"}>
              {search ? "No se encontraron paquetes con ese criterio de búsqueda." : "Crea el primero con “Nuevo paquete de horas”."}
            </EmptyState>
          ) : (
            <HourPackagesTable packages={filtered} />
          )}
        </Card>
      )}
    </div>
  );
}
