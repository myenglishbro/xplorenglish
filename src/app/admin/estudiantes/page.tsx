import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listUsers } from "@/server/admin/users/queries";
import type { ProfileStatus } from "@/server/admin/users/types";
import { Card } from "@/components/ui/surfaces/Card";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { Button } from "@/components/ui/core/Button";
import { UsersFilterBar } from "@/components/admin/users/UsersFilterBar";
import { UsersTable } from "@/components/admin/users/UsersTable";
import { Pagination } from "@/components/admin/users/Pagination";

const VALID_STATUSES: ProfileStatus[] = ["active", "inactive"];

export interface AdminStudentsPageProps {
  searchParams: { q?: string; status?: string; page?: string };
}

// Reutiliza exactamente la misma infraestructura de /admin/usuarios (listUsers,
// UsersFilterBar, UsersTable, Pagination) fijando role="student" -- no es una entidad
// distinta, es una vista filtrada del mismo directorio de profiles.
export default async function AdminStudentsPage({ searchParams }: AdminStudentsPageProps) {
  const status = VALID_STATUSES.includes(searchParams.status as ProfileStatus) ? (searchParams.status as ProfileStatus) : "all";
  const page = Number(searchParams.page) > 0 ? Number(searchParams.page) : 1;
  const search = searchParams.q ?? "";

  const supabase = createClient();
  const result = await listUsers(supabase, { search, role: "student", status, page });

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
        <Link href="/admin/estudiantes/nuevo">
          <Button variant="primary" icon="user-plus">
            Nuevo estudiante
          </Button>
        </Link>
      </div>

      <UsersFilterBar showRoleFilter={false} />

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
    </div>
  );
}
