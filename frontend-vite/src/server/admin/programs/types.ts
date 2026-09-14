export interface ProgramListItem {
  // Índice requerido por DataTable<T extends Record<string, unknown>> (componente genérico del
  // Design System); no relaja el tipado de los accesos nombrados abajo.
  [key: string]: unknown;
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}
