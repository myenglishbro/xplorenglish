import React from "react";
import { Link, useParams } from "react-router-dom";
import { useAdminHourPackages, useStudentHoursMovements } from "@/features/hoursAdmin/hooks";
import { useUserDetail } from "@/features/users/hooks";
import { Card } from "@/components/ui/surfaces/Card";
import { Icon } from "@/components/ui/core/Icon";
import { Spinner } from "@/components/ui/feedback/Spinner";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { HourPackagesTable } from "@/components/admin/hours/HourPackagesTable";
import { HoursMovementsHistory } from "@/components/admin/hours/HoursMovementsHistory";
import { StudentHoursSummaryCards } from "@/components/admin/hours/StudentHoursSummaryCards";

function cardTitle(text: string) {
  return (
    <h2 style={{ margin: 0, font: "var(--weight-bold) var(--text-h4-size)/var(--text-h4-lh) var(--font-display)", color: "var(--text-heading)" }}>
      {text}
    </h2>
  );
}

/**
 * Detalle de horas de UN estudiante -- reutiliza el mismo cache de useAdminHourPackages (filtrado
 * en memoria por studentId) en vez de pedir una query nueva; si el admin llegó desde la tabla de
 * /admin/paquetes, estos datos ya están en cache y esta página no dispara ningún round-trip extra
 * para "Resumen"/"Paquetes". "Historial de movimientos" sí es una query propia (el ledger crudo
 * no viene en listHourPackagesForAdmin).
 */
export function EstudianteHorasDetailPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const id = studentId ?? "";

  const userQuery = useUserDetail(id);
  const packagesQuery = useAdminHourPackages();
  const movementsQuery = useStudentHoursMovements(id);

  const studentPackages = React.useMemo(
    () => (packagesQuery.data ?? []).filter((p) => p.studentId === id),
    [packagesQuery.data, id]
  );

  // availableMinutes SIEMPRE desde el ledger crudo (movementsQuery, ya cargado para "Historial de
  // movimientos" -- sin round-trip extra), nunca sumando remainingMinutes por paquete: esa suma es
  // la misma causa que hacía que el dashboard del propio estudiante mostrara un saldo desactualizado
  // (los consumos de register_class/correct_class nacen con package_id=NULL), y aquí produciría el
  // mismo número incorrecto para el admin.
  const summary = React.useMemo(
    () => ({
      acquiredMinutes: studentPackages.reduce((sum, p) => sum + p.totalMinutes, 0),
      consumedMinutes: studentPackages.reduce((sum, p) => sum + p.consumedMinutes, 0),
      availableMinutes: (movementsQuery.data ?? []).reduce((sum, m) => sum + m.minutesDelta, 0),
    }),
    [studentPackages, movementsQuery.data]
  );

  if (userQuery.isLoading || packagesQuery.isLoading || movementsQuery.isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-6) 0" }}>
        <Spinner size={28} label="Cargando…" />
      </div>
    );
  }

  if (userQuery.isError || !userQuery.data || userQuery.data.role !== "student") {
    return <EmptyState icon="warning" title="Este estudiante no existe">Vuelve al listado de Paquetes.</EmptyState>;
  }

  const student = userQuery.data;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div>
        <Link
          to="/admin/paquetes"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, font: "var(--weight-semibold) 13px/1 var(--font-body)", color: "var(--text-muted)", textDecoration: "none" }}
        >
          <Icon name="arrow-left" size={14} /> Volver a Paquetes
        </Link>
        <h1
          style={{
            font: "var(--weight-bold) var(--text-h2-size)/var(--text-h2-lh) var(--font-display)",
            letterSpacing: "var(--text-h2-ls)",
            color: "var(--text-heading)",
            margin: "8px 0 0",
          }}
        >
          {student.firstName} {student.lastName}
        </h1>
        <p style={{ margin: "4px 0 0", color: "var(--text-muted)" }}>DNI {student.dni}</p>
      </div>

      <Card header={cardTitle("Resumen")}>
        <StudentHoursSummaryCards summary={summary} />
      </Card>

      <Card header={cardTitle("Paquetes")} pad={studentPackages.length === 0}>
        {studentPackages.length === 0 ? (
          <EmptyState icon="package" title="Sin paquetes todavía">
            Crea uno desde &quot;Nuevo paquete de horas&quot; en Paquetes.
          </EmptyState>
        ) : (
          <HourPackagesTable packages={studentPackages} />
        )}
      </Card>

      <Card header={cardTitle("Historial de movimientos")}>
        {movementsQuery.isLoading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-4) 0" }}>
            <Spinner size={24} label="Cargando…" />
          </div>
        ) : movementsQuery.isError || !movementsQuery.data ? (
          <EmptyState icon="warning" title="No pudimos cargar el historial">Recarga la página para intentarlo de nuevo.</EmptyState>
        ) : (
          <HoursMovementsHistory movements={movementsQuery.data} />
        )}
      </Card>
    </div>
  );
}
