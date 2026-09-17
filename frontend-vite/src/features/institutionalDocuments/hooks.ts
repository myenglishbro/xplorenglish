import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import {
  getPublishedInstitutionalDocuments,
  listInstitutionalDocumentsForAdmin,
  createInstitutionalDocument,
  updateInstitutionalDocument,
  setInstitutionalDocumentPublished,
  deleteInstitutionalDocument,
  swapInstitutionalDocumentOrder,
} from "@/server/institutionalDocuments/queries";
import { institutionalDocumentSchema, type InstitutionalDocumentInput } from "@/server/institutionalDocuments/validation";
import type { InstitutionalDocumentItem, InstitutionalDocumentType } from "@/server/institutionalDocuments/types";

/** Teacher/Student -- solo documentos publicados del documentType pedido (Políticas, Lineamientos
 * docentes o Test de nivel comparten esta misma tabla, ver server/institutionalDocuments). */
export function useInstitutionalDocuments(documentType: InstitutionalDocumentType) {
  return useQuery({
    queryKey: queryKeys.institutionalDocuments(documentType),
    queryFn: () => getPublishedInstitutionalDocuments(supabase, documentType),
  });
}

/** Admin -- gestión completa del documentType pedido, incluye sin publicar. */
export function useAdminInstitutionalDocuments(documentType: InstitutionalDocumentType) {
  return useQuery({
    queryKey: queryKeys.institutionalDocumentsAdmin(documentType),
    queryFn: () => listInstitutionalDocumentsForAdmin(supabase, documentType),
  });
}

export type InstitutionalDocumentFieldErrors = Partial<Record<keyof InstitutionalDocumentInput, string>>;

function parseInput(input: InstitutionalDocumentInput) {
  const parsed = institutionalDocumentSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: InstitutionalDocumentFieldErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string") fieldErrors[key as keyof InstitutionalDocumentFieldErrors] = issue.message;
    }
    throw { fieldErrors } as { fieldErrors: InstitutionalDocumentFieldErrors };
  }
  return parsed.data;
}

/** Ambas queries (Admin y Teacher/Student) del mismo documentType dependen de la misma tabla -- toda
 * mutación invalida las dos, para que un documento recién publicado/editado se vea sin recargar en
 * cualquier rol. */
function invalidateInstitutionalDocuments(queryClient: ReturnType<typeof useQueryClient>, documentType: InstitutionalDocumentType) {
  queryClient.invalidateQueries({ queryKey: queryKeys.institutionalDocuments(documentType) });
  queryClient.invalidateQueries({ queryKey: queryKeys.institutionalDocumentsAdmin(documentType) });
}

export function useCreateInstitutionalDocument(documentType: InstitutionalDocumentType) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: InstitutionalDocumentInput) => createInstitutionalDocument(supabase, documentType, parseInput(input)),
    onSuccess: () => invalidateInstitutionalDocuments(queryClient, documentType),
  });
}

export function useUpdateInstitutionalDocument(id: number, documentType: InstitutionalDocumentType) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: InstitutionalDocumentInput) => updateInstitutionalDocument(supabase, id, parseInput(input)),
    onSuccess: () => invalidateInstitutionalDocuments(queryClient, documentType),
  });
}

export function useSetInstitutionalDocumentPublished(documentType: InstitutionalDocumentType) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isPublished }: { id: number; isPublished: boolean }) => setInstitutionalDocumentPublished(supabase, id, isPublished),
    onSuccess: () => invalidateInstitutionalDocuments(queryClient, documentType),
  });
}

export function useDeleteInstitutionalDocument(documentType: InstitutionalDocumentType) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteInstitutionalDocument(supabase, id),
    onSuccess: () => invalidateInstitutionalDocuments(queryClient, documentType),
  });
}

/** Mover arriba/abajo -- swap de sort_order con el vecino inmediato en la lista YA CARGADA por el
 * caller (sin volver a pedir el orden actual: evita una condición de carrera trivial entre leer y
 * escribir). Sin drag-and-drop: solo flechas ↑/↓. */
export function useReorderInstitutionalDocument(documentType: InstitutionalDocumentType) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ current, neighbor }: { current: InstitutionalDocumentItem; neighbor: InstitutionalDocumentItem }) =>
      swapInstitutionalDocumentOrder(
        supabase,
        { id: current.id, sortOrder: current.sortOrder },
        { id: neighbor.id, sortOrder: neighbor.sortOrder },
      ),
    onSuccess: () => invalidateInstitutionalDocuments(queryClient, documentType),
  });
}
