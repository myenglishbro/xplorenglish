"use client";

import { AdminRouteError } from "@/components/admin/users/AdminRouteError";

export default function AdminNewStudentError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <AdminRouteError reset={reset} title="No se pudo cargar el formulario" />;
}
