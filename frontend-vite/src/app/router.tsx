import { createBrowserRouter, Navigate } from "react-router-dom";
import { LandingPage } from "@/pages/public/LandingPage";
import { LoginPage } from "@/pages/LoginPage";
import { ChangePasswordPage } from "@/pages/ChangePasswordPage";
import { TeacherLayout } from "@/layouts/TeacherLayout";
import { StudentLayout } from "@/layouts/StudentLayout";
import { AdminLayout } from "@/layouts/AdminLayout";
import { ProtectedRoute } from "@/auth/ProtectedRoute";
import { SalonDetailPage } from "@/pages/SalonDetailPage";

import { DashboardPage } from "@/pages/admin/DashboardPage";
import { UsersListPage } from "@/pages/admin/UsersListPage";
import { UserDetailPage } from "@/pages/admin/UserDetailPage";
import { EstudiantesListPage } from "@/pages/admin/EstudiantesListPage";
import { NuevoEstudiantePage } from "@/pages/admin/NuevoEstudiantePage";
import { DocentesListPage } from "@/pages/admin/DocentesListPage";
import { DocenteDetailPage } from "@/pages/admin/DocenteDetailPage";
import { SalonesPage } from "@/pages/admin/SalonesPage";
import { NuevoSalonPage } from "@/pages/admin/NuevoSalonPage";
import { SalonDetailAdminPage } from "@/pages/admin/SalonDetailAdminPage";
import { PaquetesPage } from "@/pages/admin/PaquetesPage";
import { EstudianteHorasDetailPage } from "@/pages/admin/EstudianteHorasDetailPage";
import { ReportesPage } from "@/pages/admin/ReportesPage";
import { ConfiguracionPage } from "@/pages/admin/ConfiguracionPage";
import { PagosEstudiantesListPage } from "@/pages/admin/PagosEstudiantesListPage";
import { PagoEstudianteDetailPage } from "@/pages/admin/PagoEstudianteDetailPage";
import { PagosDocentesListPage } from "@/pages/admin/PagosDocentesListPage";
import { PagoDocentePeriodoDetailPage } from "@/pages/admin/PagoDocentePeriodoDetailPage";
import { CalendarioPage } from "@/pages/admin/CalendarioPage";
import { SessionDetailAdminPage } from "@/pages/admin/SessionDetailAdminPage";

import { TeacherHomePage } from "@/pages/teacher/TeacherHomePage";
import { AvailabilityPage } from "@/pages/teacher/AvailabilityPage";
import { TeacherSalonesPage } from "@/pages/teacher/SalonesPage";
import { TeacherClasesPage } from "@/pages/teacher/ClasesPage";
import { TeacherPagosPage } from "@/pages/teacher/PagosPage";
import { TeacherPagoDetailPage } from "@/pages/teacher/PagoDetailPage";
import { TeacherPerfilPage } from "@/pages/teacher/PerfilPage";

import { StudentHomePage } from "@/pages/student/StudentHomePage";
import { StudentSalonesPage } from "@/pages/student/SalonesPage";
import { StudentClasesPage } from "@/pages/student/ClasesPage";
import { StudentHorasPage } from "@/pages/student/HorasPage";
import { StudentPerfilPage } from "@/pages/student/PerfilPage";
import { StudentTestDeNivelPage } from "@/pages/student/TestDeNivelPage";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/change-password", element: <ChangePasswordPage /> },
  {
    path: "/teacher",
    element: (
      <ProtectedRoute allowedRoles={["teacher"]}>
        <TeacherLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <TeacherHomePage /> },
      { path: "disponibilidad", element: <AvailabilityPage /> },
      { path: "salones", element: <TeacherSalonesPage /> },
      { path: "salones/:id", element: <SalonDetailPage role="teacher" /> },
      { path: "clases", element: <TeacherClasesPage /> },
      { path: "pagos", element: <TeacherPagosPage /> },
      { path: "pagos/:id", element: <TeacherPagoDetailPage /> },
      { path: "perfil", element: <TeacherPerfilPage /> },
    ],
  },
  {
    path: "/student",
    element: (
      <ProtectedRoute allowedRoles={["student"]}>
        <StudentLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <StudentHomePage /> },
      { path: "salones", element: <StudentSalonesPage /> },
      { path: "salones/:id", element: <SalonDetailPage role="student" /> },
      { path: "clases", element: <StudentClasesPage /> },
      { path: "horas", element: <StudentHorasPage /> },
      { path: "perfil", element: <StudentPerfilPage /> },
      { path: "test-de-nivel", element: <StudentTestDeNivelPage /> },
    ],
  },
  {
    path: "/admin",
    element: (
      <ProtectedRoute allowedRoles={["admin"]}>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "usuarios", element: <UsersListPage /> },
      { path: "usuarios/:id", element: <UserDetailPage /> },
      { path: "estudiantes", element: <EstudiantesListPage /> },
      { path: "estudiantes/nuevo", element: <NuevoEstudiantePage /> },
      { path: "docentes", element: <DocentesListPage /> },
      { path: "docentes/:id", element: <DocenteDetailPage /> },
      { path: "salones", element: <SalonesPage /> },
      { path: "salones/nuevo", element: <NuevoSalonPage /> },
      { path: "salones/:id", element: <SalonDetailAdminPage /> },
      { path: "calendario", element: <CalendarioPage /> },
      { path: "calendario/:id", element: <SessionDetailAdminPage /> },
      { path: "paquetes", element: <PaquetesPage /> },
      { path: "paquetes/:studentId", element: <EstudianteHorasDetailPage /> },
      { path: "pagos-estudiantes", element: <PagosEstudiantesListPage /> },
      { path: "pagos-estudiantes/:id", element: <PagoEstudianteDetailPage /> },
      { path: "pagos-docentes", element: <PagosDocentesListPage /> },
      { path: "pagos-docentes/:id", element: <PagoDocentePeriodoDetailPage /> },
      { path: "reportes", element: <ReportesPage /> },
      { path: "configuracion", element: <ConfiguracionPage /> },
    ],
  },
  { path: "/", element: <LandingPage /> },
  { path: "*", element: <Navigate to="/login" replace /> },
]);
