import { Link, useSearchParams } from "react-router-dom";
import { useUsers } from "@/features/users/hooks";
import type { ProfileStatus } from "@/server/admin/users/types";
import { Card } from "@/components/ui/surfaces/Card";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { Spinner } from "@/components/ui/feedback/Spinner";
import { Button } from "@/components/ui/core/Button";
import { UsersFilterBar } from "@/components/admin/users/UsersFilterBar";
import { UsersTable } from "@/components/admin/users/UsersTable";
import { Pagination } from "@/components/admin/users/Pagination";

const VALID_STATUSES: ProfileStatus[] = ["active", "inactive"];

/** Portado de src/app/admin/estudiantes/page.tsx -- reutiliza exactamente la misma
 * infraestructura de Usuarios (useUsers, UsersFilterBar, UsersTable, Pagination) fijando
 * role="student": no es una entidad distinta, es una vista filtrada del mismo directorio. */
export function EstudiantesListPage() {
  const [searchParams] = useSearchParams();

  const statusParam = searchParams.get("status");
  const status = VALID_STATUSES.includes(statusParam as ProfileStatus) ? (statusParam as ProfileStatus) : "all";
  const page = Number(searchParams.get("page")) > 0 ? Number(searchParams.get("page")) : 1;
  const search = searchParams.get("q") ?? "";

  const { data: result, isLoading, isError } = useUsers({ search, role: "student", status, page });

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
          Estudiantes
        </h1>
        <Link to="/admin/estudiantes/nuevo">
          <Button variant="primary" icon="user-plus">
            Nuevo estudiante
          </Button>
        </Link>
      </div>

      <UsersFilterBar showRoleFilter={false} />

      {isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-6) 0" }}>
          <Spinner size={28} label="Cargando…" />
        </div>
      ) : isError || !result ? (
        <EmptyState icon="warning" title="No pudimos cargar los estudiantes">Recarga la página para intentarlo de nuevo.</EmptyState>
      ) : (
        <>
          <Card pad={result.items.length === 0}>
            {result.items.length === 0 ? (
              <EmptyState icon="student" title="Sin resultados">
                No se encontraron estudiantes con los filtros actuales.
              </EmptyState>
            ) : (
              <UsersTable items={result.items} mode="estudiantes" />
            )}
          </Card>

          <Pagination
            page={result.page}
            pageSize={result.pageSize}
            totalCount={result.totalCount}
            basePath="/admin/estudiantes"
            searchParams={{ q: search || undefined, status: status !== "all" ? status : undefined }}
          />
        </>
      )}
    </div>
  );
}
