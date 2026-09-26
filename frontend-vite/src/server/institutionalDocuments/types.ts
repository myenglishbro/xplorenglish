/**
 * Documento institucional global -- ver migraciones 0034_institutional_documents.sql,
 * 0039_institutional_documents_types.sql y 0043_institutional_documents_welcome_kit.sql. Nunca
 * pertenece a un salón/módulo/programa/nivel: es información compartida por toda la academia,
 * gestionada una sola vez desde Admin.
 *
 * document_type distingue las 4 secciones que reutilizan esta misma tabla/patrón, cada una con su
 * propia visibilidad por rol (ver RLS en 0039/0043):
 *   - "policy": Políticas y reglamentos -- Admin gestiona+ve, Teacher ve, Student ve.
 *   - "teacher_guideline": Lineamientos docentes -- Admin gestiona+ve, Teacher ve, Student SIN ACCESO.
 *   - "level_test": Test de nivel -- Admin gestiona+ve, Student ve, Teacher SIN ACCESO.
 *   - "welcome_kit": Welcome Kit -- Admin gestiona+ve, Student ve, Teacher SIN ACCESO.
 */
export type InstitutionalDocumentType = "policy" | "teacher_guideline" | "level_test" | "welcome_kit";

export interface InstitutionalDocumentItem {
  [key: string]: unknown;
  id: number;
  title: string;
  url: string;
  documentType: InstitutionalDocumentType;
  sortOrder: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}
