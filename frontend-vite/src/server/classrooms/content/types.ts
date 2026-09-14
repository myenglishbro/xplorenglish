import type { Database } from "@/types/database.types";

export type ContentStatus = "draft" | "published";
export type ResourceType = Database["public"]["Enums"]["resource_type"];

export const RESOURCE_TYPES: ResourceType[] = ["pdf", "drive", "docs", "slides", "youtube", "vimeo", "url", "embed"];

/** Tipos que la app puede asignar automáticamente a un recurso nuevo/editado a partir de la URL
 * (ver `detectKnownProvider`), más el fallback `url` cuando ningún proveedor conocido matchea.
 * `pdf` y `embed` se conservan en el enum por compatibilidad histórica y futura respectivamente,
 * pero el flujo de creación/edición de recursos nunca los asigna. */
export type AssignableResourceType = "youtube" | "vimeo" | "drive" | "docs" | "slides" | "url";

export interface ResourceItem {
  id: number;
  lessonId: number;
  title: string;
  type: ResourceType;
  reference: string;
  orderIndex: number;
}

export interface LessonItem {
  id: number;
  moduleId: number;
  title: string;
  description: string | null;
  status: ContentStatus;
  orderIndex: number;
  resources: ResourceItem[];
}

export interface ModuleItem {
  id: number;
  classroomId: number;
  title: string;
  description: string | null;
  status: ContentStatus;
  orderIndex: number;
  lessons: LessonItem[];
}
