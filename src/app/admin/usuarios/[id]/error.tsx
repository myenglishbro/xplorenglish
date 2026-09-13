"use client";

import { AdminRouteError } from "@/components/admin/users/AdminRouteError";

export default function AdminUserDetailError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <AdminRouteError reset={reset} title="No se pudo cargar este usuario" />;
}
