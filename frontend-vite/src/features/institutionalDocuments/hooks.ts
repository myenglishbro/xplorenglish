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
import type { InstitutionalDocumentItem } from "@/server/institutionalDocuments/types";

/** Teacher/Student -- "Políticas y reglamentos", solo documentos publicados. */
export function useInstitutionalDocuments() {
  return useQuery({
    queryKey: queryKeys.institutionalDocuments(),
    queryFn: () => getPublishedInstitutionalDocuments(supabase),
  });
}

/** Admin -- gestión completa, incluye sin publicar. */
export function useAdminInstitutionalDocuments() {
  return useQuery({
    queryKey: queryKeys.institutionalDocumentsAdmin(),
    queryFn: () => listInstitutionalDocumentsForAdmin(supabase),
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

/** Ambas queries (Admin y Teacher/Student) dependen de la misma tabla -- toda mutación invalida
 * las dos, para que un documento recién publicado/editado se vea sin recargar en cualquier rol. */
function invalidateInstitutionalDocuments(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: queryKeys.institutionalDocuments() });
  queryClient.invalidateQueries({ queryKey: queryKeys.institutionalDocumentsAdmin() });
}

export function useCreateInstitutionalDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: InstitutionalDocumentInput) => createInstitutionalDocument(supabase, parseInput(input)),
    onSuccess: () => invalidateInstitutionalDocuments(queryClient),
  });
}

export function useUpdateInstitutionalDocument(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: InstitutionalDocumentInput) => updateInstitutionalDocument(supabase, id, parseInput(input)),
    onSuccess: () => invalidateInstitutionalDocuments(queryClient),
  });
}

export function useSetInstitutionalDocumentPublished() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isPublished }: { id: number; isPublished: boolean }) => setInstitutionalDocumentPublished(supabase, id, isPublished),
    onSuccess: () => invalidateInstitutionalDocuments(queryClient),
  });
}

export function useDeleteInstitutionalDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteInstitutionalDocument(supabase, id),
    onSuccess: () => invalidateInstitutionalDocuments(queryClient),
  });
}

/** Mover arriba/abajo -- swap de sort_order con el vecino inmediato en la lista YA CARGADA por el
 * caller (sin volver a pedir el orden actual: evita una condición de carrera trivial entre leer y
 * escribir). Sin drag-and-drop: solo flechas ↑/↓. */
export function useReorderInstitutionalDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ current, neighbor }: { current: InstitutionalDocumentItem; neighbor: InstitutionalDocumentItem }) =>
      swapInstitutionalDocumentOrder(
        supabase,
        { id: current.id, sortOrder: current.sortOrder },
        { id: neighbor.id, sortOrder: neighbor.sortOrder },
      ),
    onSuccess: () => invalidateInstitutionalDocuments(queryClient),
  });
}
