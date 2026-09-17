import React from "react";
import { Card } from "@/components/ui/surfaces/Card";
import { Checkbox } from "@/components/ui/forms/Checkbox";
import { Button } from "@/components/ui/core/Button";
import { Alert } from "@/components/ui/feedback/Alert";
import { Spinner } from "@/components/ui/feedback/Spinner";
import { useSkillsCatalog, useMyTeacherSkillIds, useSetTeacherSkills } from "@/features/teacherSkills/hooks";

/**
 * "Mis niveles" (Slice D) -- selección múltiple de skills como checkboxes, un solo botón
 * "Guardar niveles" que reemplaza TODA la selección (set_my_teacher_skills), nunca un RPC por
 * checkbox. Es solo recomendación para Admin más adelante -- no bloquea nada de este profesor hoy.
 */
export function TeacherSkillsCard() {
  const catalogQuery = useSkillsCatalog();
  const mineQuery = useMyTeacherSkillIds();
  const setSkills = useSetTeacherSkills();

  const [selected, setSelected] = React.useState<Set<number>>(new Set());
  const [dirty, setDirty] = React.useState(false);

  React.useEffect(() => {
    if (mineQuery.data && !dirty) {
      setSelected(new Set(mineQuery.data));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mineQuery.data]);

  function toggle(id: number) {
    setDirty(true);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSave() {
    await setSkills.mutateAsync([...selected]);
    setDirty(false);
  }

  const isLoading = catalogQuery.isLoading || mineQuery.isLoading;
  const isError = catalogQuery.isError || mineQuery.isError;

  return (
    <Card
      header={
        <h2 style={{ margin: 0, font: "var(--weight-bold) var(--text-h4-size)/var(--text-h4-lh) var(--font-display)", color: "var(--text-heading)" }}>
          Mis niveles
        </h2>
      }
    >
      <p style={{ margin: "0 0 var(--space-4)", color: "var(--text-muted)" }}>
        Selecciona los niveles y categorías que puedes enseñar. Esto solo sirve para recomendarte al configurar un salón -- nunca te bloquea.
      </p>

      {isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-4) 0" }}>
          <Spinner size={22} label="Cargando niveles…" />
        </div>
      ) : isError ? (
        <Alert tone="danger">No pudimos cargar tus niveles. Recarga la página para intentarlo de nuevo.</Alert>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
            {catalogQuery.data?.map((skill) => (
              <Checkbox key={skill.id} label={skill.name} checked={selected.has(skill.id)} onChange={() => toggle(skill.id)} />
            ))}
          </div>

          {setSkills.isError && <Alert tone="danger" style={{ marginBottom: "var(--space-3)" }}>{(setSkills.error as Error).message}</Alert>}
          {setSkills.isSuccess && !dirty && <Alert tone="success" style={{ marginBottom: "var(--space-3)" }}>Niveles guardados.</Alert>}

          <Button variant="primary" onClick={handleSave} loading={setSkills.isPending} disabled={!dirty && !setSkills.isPending}>
            Guardar niveles
          </Button>
        </>
      )}
    </Card>
  );
}
