import type { SidebarNavItem } from "@/components/ui/navigation/SidebarNav";
import { SUPPORT_WHATSAPP_URL } from "@/lib/support";

// Ítems de navegación por rol. Los `value` son las rutas reales (href), consumidos por
// AppShell tanto para resaltar el activo como para navegar -- deben coincidir exactamente con
// las rutas declaradas en app/router.tsx.

/** "Políticas y reglamentos" + "Ayuda y soporte" -- navegación secundaria/institucional, igual
 * para los 3 roles (`section` los separa visualmente del resto sin tocar SidebarNav). "Ayuda y
 * soporte" es un `href` externo (WhatsApp, ver lib/support.ts) -- nunca navega dentro de la app. */
function institutionalNavItems(policiesRoute: string): SidebarNavItem[] {
  return [
    { value: policiesRoute, label: "Políticas y reglamentos", icon: "file-text", section: "Institucional" },
    { value: "support-whatsapp", label: "Ayuda y soporte", icon: "whatsapp-logo", href: SUPPORT_WHATSAPP_URL },
  ];
}

export const ADMIN_NAV_ITEMS: SidebarNavItem[] = [
  { value: "/admin", label: "Dashboard", icon: "squares-four" },
  { value: "/admin/usuarios", label: "Usuarios", icon: "users-three" },
  { value: "/admin/estudiantes", label: "Estudiantes", icon: "student" },
  { value: "/admin/docentes", label: "Docentes", icon: "chalkboard-teacher" },
  { value: "/admin/salones", label: "Salones", icon: "chalkboard" },
  { value: "/admin/paquetes", label: "Paquetes", icon: "package" },
  { value: "/admin/pagos-estudiantes", label: "Pagos estudiantes", icon: "credit-card" },
  { value: "/admin/pagos-docentes", label: "Pagos docentes", icon: "money" },
  { value: "/admin/reportes", label: "Reportes", icon: "chart-line-up" },
  { value: "/admin/configuracion", label: "Configuración", icon: "gear" },
  { value: "/admin/auditoria", label: "Auditoría", icon: "clock-counter-clockwise" },
  ...institutionalNavItems("/admin/politicas"),
];

export const TEACHER_NAV_ITEMS: SidebarNavItem[] = [
  { value: "/teacher", label: "Inicio", icon: "house" },
  { value: "/teacher/salones", label: "Mis salones", icon: "chalkboard" },
  { value: "/teacher/disponibilidad", label: "Mi disponibilidad", icon: "calendar-check" },
  { value: "/teacher/pagos", label: "Mis pagos", icon: "credit-card" },
  { value: "/teacher/perfil", label: "Mi perfil", icon: "user-circle" },
  ...institutionalNavItems("/teacher/politicas"),
];

export const STUDENT_NAV_ITEMS: SidebarNavItem[] = [
  { value: "/student", label: "Inicio", icon: "house" },
  { value: "/student/salones", label: "Mis salones", icon: "chalkboard" },
  { value: "/student/horas", label: "Mis horas", icon: "clock" },
  { value: "/student/test-de-nivel", label: "Test de nivel", icon: "clipboard-text" },
  { value: "/student/perfil", label: "Mi perfil", icon: "user-circle" },
  ...institutionalNavItems("/student/politicas"),
];
