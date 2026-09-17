import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { InstitutionalDocumentInput } from "./validation";
import type { InstitutionalDocumentItem, InstitutionalDocumentType } from "./types";

type Client = SupabaseClient<Database>;

interface DocumentRow {
  id: number;
  title: string;
  url: string;
  document_type: string;
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

function mapRow(row: DocumentRow): InstitutionalDocumentItem {
  return {
    id: row.id,
    title: row.title,
    url: row.url,
    documentType: row.document_type as InstitutionalDocumentType,
    sortOrder: row.sort_order,
    isPublished: row.is_published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT_COLUMNS = "id, title, url, document_type, sort_order, is_published, created_at, updated_at";

/** Student/Teacher -- RLS (institutional_documents_select_*) ya acota por is_published y rol según
 * document_type, el .eq acá es solo una optimización de consulta, no la autoridad real (mismo
 * criterio que server/student/classrooms/queries.ts). */
export async function getPublishedInstitutionalDocuments(supabase: Client, documentType: InstitutionalDocumentType): Promise<InstitutionalDocumentItem[]> {
  const { data, error } = await supabase
    .from("institutional_documents")
    .select(SELECT_COLUMNS)
    .eq("document_type", documentType)
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .returns<DocumentRow[]>();

  if (error) throw error;
  return data.map(mapRow);
}

/** Admin -- ve publicados y sin publicar (institutional_documents_admin_write ya lo permite). */
export async function listInstitutionalDocumentsForAdmin(supabase: Client, documentType: InstitutionalDocumentType): Promise<InstitutionalDocumentItem[]> {
  const { data, error } = await supabase
    .from("institutional_documents")
    .select(SELECT_COLUMNS)
    .eq("document_type", documentType)
    .order("sort_order", { ascending: true })
    .returns<DocumentRow[]>();

  if (error) throw error;
  return data.map(mapRow);
}

/** Nuevo documento al final del orden actual DENTRO de su document_type -- evita que Admin tenga
 * que fijar sort_order a mano. */
export async function createInstitutionalDocument(supabase: Client, documentType: InstitutionalDocumentType, input: InstitutionalDocumentInput): Promise<void> {
  const { data: last } = await supabase
    .from("institutional_documents")
    .select("sort_order")
    .eq("document_type", documentType)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("institutional_documents").insert({
    title: input.title,
    url: input.url,
    document_type: documentType,
    is_published: input.isPublished,
    sort_order: last ? last.sort_order + 1 : 0,
  });
  if (error) throw new Error("No pudimos crear el documento. Inténtalo de nuevo en unos minutos.");
}

export async function updateInstitutionalDocument(supabase: Client, id: number, input: InstitutionalDocumentInput): Promise<void> {
  const { error } = await supabase
    .from("institutional_documents")
    .update({ title: input.title, url: input.url, is_published: input.isPublished, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error("No pudimos guardar los cambios. Inténtalo de nuevo en unos minutos.");
}

export async function setInstitutionalDocumentPublished(supabase: Client, id: number, isPublished: boolean): Promise<void> {
  const { error } = await supabase
    .from("institutional_documents")
    .update({ is_published: isPublished, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error("No pudimos actualizar el estado del documento. Inténtalo de nuevo en unos minutos.");
}

export async function deleteInstitutionalDocument(supabase: Client, id: number): Promise<void> {
  const { error } = await supabase.from("institutional_documents").delete().eq("id", id);
  if (error) throw new Error("No pudimos borrar el documento. Inténtalo de nuevo en unos minutos.");
}

/** Swap simple de sort_order entre dos documentos (mover arriba/abajo) -- sin drag-and-drop ni
 * reordenamiento masivo, suficiente para el volumen esperado (unos pocos documentos por tipo). */
export async function swapInstitutionalDocumentOrder(
  supabase: Client,
  a: { id: number; sortOrder: number },
  b: { id: number; sortOrder: number },
): Promise<void> {
  const [resA, resB] = await Promise.all([
    supabase.from("institutional_documents").update({ sort_order: b.sortOrder }).eq("id", a.id),
    supabase.from("institutional_documents").update({ sort_order: a.sortOrder }).eq("id", b.id),
  ]);
  if (resA.error || resB.error) throw new Error("No pudimos reordenar los documentos. Inténtalo de nuevo en unos minutos.");
}
