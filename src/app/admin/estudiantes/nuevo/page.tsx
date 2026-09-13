import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listPrograms } from "@/server/admin/users/queries";
import { Card } from "@/components/ui/surfaces/Card";
import { Icon } from "@/components/ui/core/Icon";
import { CreateStudentForm } from "@/components/admin/students/CreateStudentForm";

export default async function AdminNewStudentPage() {
  const supabase = createClient();
  const programs = await listPrograms(supabase, { activeOnly: true });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div>
        <Link
          href="/admin/estudiantes"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, font: "var(--weight-semibold) 13px/1 var(--font-body)", color: "var(--text-muted)", textDecoration: "none" }}
        >
          <Icon name="arrow-left" size={14} /> Volver a Estudiantes
        </Link>
        <h1
          style={{
            font: "var(--weight-bold) var(--text-h2-size)/var(--text-h2-lh) var(--font-display)",
            letterSpacing: "var(--text-h2-ls)",
            color: "var(--text-heading)",
            margin: "8px 0 0",
          }}
        >
          Nuevo estudiante
        </h1>
      </div>

      <Card>
        <CreateStudentForm programs={programs} />
      </Card>
    </div>
  );
}
