import type { SidebarNavItem } from "@/components/ui/navigation/SidebarNav";

// Ítems de navegación por rol. Los `value` son las rutas reales (href), consumidos por
// AppShell tanto para resaltar el activo como para navegar. Solo routing/estructura --
// ninguna de estas rutas tiene todavía lógica de negocio (son placeholders).

export const ADMIN_NAV_ITEMS: SidebarNavItem[] = [
  { value: "/admin", label: "Dashboard", icon: "squares-four" },
  { value: "/admin/usuarios", label: "Usuarios", icon: "users-three" },
  { value: "/admin/estudiantes", label: "Estudiantes", icon: "student" },
  { value: "/admin/docentes", label: "Docentes", icon: "chalkboard-teacher" },
  { value: "/admin/salones", label: "Salones", icon: "chalkboard" },
  { value: "/admin/calendario", label: "Calendario", icon: "calendar-blank" },
  { value: "/admin/paquetes", label: "Paquetes", icon: "package" },
  { value: "/admin/pagos-estudiantes", label: "Pagos estudiantes", icon: "credit-card" },
  { value: "/admin/pagos-docentes", label: "Pagos docentes", icon: "money" },
  { value: "/admin/reportes", label: "Reportes", icon: "chart-line-up" },
  { value: "/admin/configuracion", label: "Configuración", icon: "gear" },
];

export const TEACHER_NAV_ITEMS: SidebarNavItem[] = [
  { value: "/teacher", label: "Inicio", icon: "house" },
  { value: "/teacher/salones", label: "Mis salones", icon: "chalkboard" },
  { value: "/teacher/clases", label: "Mis clases", icon: "video-camera" },
  { value: "/teacher/disponibilidad", label: "Mi disponibilidad", icon: "calendar-check" },
  { value: "/teacher/pagos", label: "Mis pagos", icon: "credit-card" },
  { value: "/teacher/perfil", label: "Mi perfil", icon: "user-circle" },
];

export const STUDENT_NAV_ITEMS: SidebarNavItem[] = [
  { value: "/student", label: "Inicio", icon: "house" },
  { value: "/student/salones", label: "Mis salones", icon: "chalkboard" },
  { value: "/student/clases", label: "Mis clases", icon: "video-camera" },
  { value: "/student/horas", label: "Mis horas", icon: "clock" },
  { value: "/student/test-de-nivel", label: "Test de nivel", icon: "clipboard-text" },
  { value: "/student/perfil", label: "Mi perfil", icon: "user-circle" },
];
