import { useSearchParams } from "react-router-dom";
import { useUsers } from "@/features/users/hooks";
import type { ProfileStatus, UserRole } from "@/server/admin/users/types";
import { Card } from "@/components/ui/surfaces/Card";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { Spinner } from "@/components/ui/feedback/Spinner";
import { UsersFilterBar } from "@/components/admin/users/UsersFilterBar";
import { UsersTable } from "@/components/admin/users/UsersTable";
import { Pagination } from "@/components/admin/users/Pagination";

const VALID_ROLES: UserRole[] = ["admin", "teacher", "student"];
const VALID_STATUSES: ProfileStatus[] = ["active", "inactive"];

/** Portado de src/app/admin/usuarios/page.tsx -- los filtros siguen viviendo en la URL
 * (searchParams), ahora vía react-router-dom en vez de next/navigation. */
export function UsersListPage() {
  const [searchParams] = useSearchParams();

  const roleParam = searchParams.get("role");
  const statusParam = searchParams.get("status");
  const role = VALID_ROLES.includes(roleParam as UserRole) ? (roleParam as UserRole) : "all";
  const status = VALID_STATUSES.includes(statusParam as ProfileStatus) ? (statusParam as ProfileStatus) : "all";
  const page = Number(searchParams.get("page")) > 0 ? Number(searchParams.get("page")) : 1;
  const search = searchParams.get("q") ?? "";

  const { data: result, isLoading, isError } = useUsers({ search, role, status, page });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <h1
        style={{
          font: "var(--weight-bold) var(--text-h2-size)/var(--text-h2-lh) var(--font-display)",
          letterSpacing: "var(--text-h2-ls)",
          color: "var(--text-heading)",
          margin: 0,
        }}
      >
        Usuarios
      </h1>

      <UsersFilterBar showRoleFilter />

      {isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-6) 0" }}>
          <Spinner size={28} label="Cargando…" />
        </div>
      ) : isError || !result ? (
        <EmptyState icon="warning" title="No pudimos cargar los usuarios">Recarga la página para intentarlo de nuevo.</EmptyState>
      ) : (
        <>
          <Card pad={result.items.length === 0}>
            {result.items.length === 0 ? (
              <EmptyState icon="users-three" title="Sin resultados">
                No se encontraron usuarios con los filtros actuales.
              </EmptyState>
            ) : (
              <UsersTable items={result.items} mode="usuarios" />
            )}
          </Card>

          <Pagination
            page={result.page}
            pageSize={result.pageSize}
            totalCount={result.totalCount}
            basePath="/admin/usuarios"
            searchParams={{ q: search || undefined, role: role !== "all" ? role : undefined, status: status !== "all" ? status : undefined }}
          />
        </>
      )}
    </div>
  );
}
