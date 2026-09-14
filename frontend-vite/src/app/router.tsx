import { createBrowserRouter, Navigate } from "react-router-dom";
import { LoginPage } from "@/pages/LoginPage";
import { TeacherHomePage } from "@/pages/teacher/TeacherHomePage";
import { AvailabilityPage } from "@/pages/teacher/AvailabilityPage";
import { TeacherLayout } from "@/layouts/TeacherLayout";
import { ProtectedRoute } from "@/auth/ProtectedRoute";

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
    ],
  },
  // Fase 1: todo lo demás (admin, student, resto de teacher) todavía vive en el Next viejo.
  { path: "/", element: <Navigate to="/login" replace /> },
  { path: "*", element: <Navigate to="/login" replace /> },
]);
