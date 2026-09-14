import { createBrowserRouter, Navigate } from "react-router-dom";
import { LoginPage } from "@/pages/LoginPage";
import { TeacherLayout } from "@/layouts/TeacherLayout";
import { StudentLayout } from "@/layouts/StudentLayout";
import { ProtectedRoute } from "@/auth/ProtectedRoute";
import { SalonDetailPage } from "@/pages/SalonDetailPage";

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
  // Fase 2/3: admin todavía vive en el Next viejo (ver LoginPage/ProtectedRoute: hard-redirect).
  { path: "/", element: <Navigate to="/login" replace /> },
  { path: "*", element: <Navigate to="/login" replace /> },
]);
