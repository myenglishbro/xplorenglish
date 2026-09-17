-- Dominio: rediseño operativo (Fase 0, Slice 1) -- clases 100% individuales.
-- Depende de: 0005 (public.classroom_students)
--
-- Contexto: Xplore English opera exclusivamente con clases individuales (1 estudiante por
-- salon). El futuro RPC register_session (Slice 2, aun no implementado) dependera de que exista
-- como maximo un classroom_students activo por salon para resolver "el" estudiante del salon sin
-- ambiguedad. Esta migracion SOLO agrega esa garantia -- no toca classroom_teachers, sessions,
-- session_attendance, hours_movements, hours_packages, teacher_hours_log, ni ningun RPC existente.
--
-- "Maximo uno" (esta migracion) es distinto de "exactamente uno" (responsabilidad futura de
-- register_session al momento de registrar una clase): un salon con 0 estudiantes activos es
-- valido a nivel de base de datos (por ejemplo, un salon recien creado antes de matricular a su
-- unico estudiante).
--
-- Preflight ejecutado antes de esta migracion (2026-09-16, proyecto xtckssakynrlvcmkctup):
-- classroom_id=3 tenia 2 filas activas (datos de prueba E2E). Se desactivo manualmente la fila
-- sin historial (student_id 46b81970-..., sin sesiones/asistencia asociadas), dejando activa la
-- fila con historial real (student_id e50da7ab-..., sesion 15 completada). Confirmado post-limpieza
-- que ningun salon excede 1 estudiante activo.

create unique index classroom_students_one_active_uidx
  on public.classroom_students (classroom_id)
  where status = 'active';
