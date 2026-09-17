/**
 * Documento institucional global (políticas/reglamentos/términos) -- ver migración
 * 0034_institutional_documents.sql. Nunca pertenece a un salón/módulo/programa/nivel: es
 * información compartida por toda la academia, gestionada una sola vez desde Admin.
 */
export interface InstitutionalDocumentItem {
  [key: string]: unknown;
  id: number;
  title: string;
  url: string;
  sortOrder: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}
