-- Extiende institutional_documents (0034/0039) para reutilizar la MISMA tabla/patrón/componentes
-- en una cuarta sección: "Welcome Kit". Ningún esquema nuevo, ninguna tabla nueva, ningún bucket
-- de Storage -- exactamente el mismo modelo mínimo (title + url externa) que policy/
-- teacher_guideline/level_test. Depende de: 0001 (private schema), 0034 (institutional_documents),
-- 0039 (document_type, private.is_admin/is_teacher/is_student).
--
--   welcome_kit -- Admin gestiona+ve, Student ve, Teacher SIN ACCESO (ni ruta, ni nav, ni RLS).
--
-- Los 3 tipos existentes (policy/teacher_guideline/level_test) y sus policies NO se tocan: solo se
-- amplía el CHECK constraint para admitir el valor nuevo y se agrega una policy de select adicional.

alter table public.institutional_documents
  drop constraint institutional_documents_document_type_check,
  add constraint institutional_documents_document_type_check
    check (document_type in ('policy', 'teacher_guideline', 'level_test', 'welcome_kit'));

-- "welcome_kit": solo Student (Admin ya cubierto por institutional_documents_admin_write, sin
-- cambios). Teacher sin policy -> sin acceso, mismo criterio que level_test (0039).
create policy institutional_documents_select_welcome_kit on public.institutional_documents
  for select to authenticated
  using (is_published and document_type = 'welcome_kit' and (select private.is_student()));
