import { createClient } from "@/lib/supabase/server";
import { listUsers } from "@/server/admin/users/queries";
import type { ProfileStatus, UserRole } from "@/server/admin/users/types";
import { Card } from "@/components/ui/surfaces/Card";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { UsersFilterBar } from "@/components/admin/users/UsersFilterBar";
import { UsersTable } from "@/components/admin/users/UsersTable";
import { Pagination } from "@/components/admin/users/Pagination";

const VALID_ROLES: UserRole[] = ["admin", "teacher", "student"];
const VALID_STATUSES: ProfileStatus[] = ["active", "inactive"];

export interface AdminUsersPageProps {
  searchParams: { q?: string; role?: string; status?: string; page?: string };
}

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  const role = VALID_ROLES.includes(searchParams.role as UserRole) ? (searchParams.role as UserRole) : "all";
  const status = VALID_STATUSES.includes(searchParams.status as ProfileStatus) ? (searchParams.status as ProfileStatus) : "all";
  const page = Number(searchParams.page) > 0 ? Number(searchParams.page) : 1;
  const search = searchParams.q ?? "";

  const supabase = createClient();
  const result = await listUsers(supabase, { search, role, status, page });

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
    </div>
  );
}
