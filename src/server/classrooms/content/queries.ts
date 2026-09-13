import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { ContentStatus, ModuleItem } from "./types";

type Client = SupabaseClient<Database>;

interface RawResource {
  id: number;
  lesson_id: number;
  title: string;
  type: Database["public"]["Enums"]["resource_type"];
  reference: string;
  order_index: number;
}

interface RawLesson {
  id: number;
  module_id: number;
  title: string;
  description: string | null;
  status: string;
  order_index: number;
  resources: RawResource[];
}

interface RawModule {
  id: number;
  classroom_id: number;
  title: string;
  description: string | null;
  status: string;
  order_index: number;
  lessons: RawLesson[];
}

const CONTENT_SELECT = `
  id, classroom_id, title, description, status, order_index,
  lessons(id, module_id, title, description, status, order_index,
    resources(id, lesson_id, title, type, reference, order_index)
  )
`;

/**
 * Una sola query sirve a los tres roles: RLS (0016) ya filtra drafts para estudiante y deja ver
 * todo a admin/docente del salón -- esta función no vuelve a decidir nada de eso, solo ordena
 * (order_index) en el cliente, ya que encadenar .order() sobre relaciones anidadas de dos niveles
 * en PostgREST es frágil; ordenar en JS después de traer los datos es simple y siempre correcto.
 */
export async function getContentTree(supabase: Client, classroomId: number): Promise<ModuleItem[]> {
  const __t0 = performance.now();
  const { data, error } = await supabase
    .from("modules")
    .select(CONTENT_SELECT)
    .eq("classroom_id", classroomId)
    .returns<RawModule[]>();
  console.log(`[perf] getContentTree -> nested select (modules+lessons+resources): ${(performance.now() - __t0).toFixed(1)}ms`);

  if (error) throw error;

  return data
    .map((m) => ({
      id: m.id,
      classroomId: m.classroom_id,
      title: m.title,
      description: m.description,
      status: m.status as ContentStatus,
      orderIndex: m.order_index,
      lessons: m.lessons
        .map((l) => ({
          id: l.id,
          moduleId: l.module_id,
          title: l.title,
          description: l.description,
          status: l.status as ContentStatus,
          orderIndex: l.order_index,
          resources: [...l.resources]
            .sort((a, b) => a.order_index - b.order_index)
            .map((r) => ({
              id: r.id,
              lessonId: r.lesson_id,
              title: r.title,
              type: r.type,
              reference: r.reference,
              orderIndex: r.order_index,
            })),
        }))
        .sort((a, b) => a.orderIndex - b.orderIndex),
    }))
    .sort((a, b) => a.orderIndex - b.orderIndex);
}
