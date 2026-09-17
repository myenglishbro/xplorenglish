-- Extiende institutional_documents (0034) para reutilizar la MISMA tabla/patrón/componentes en dos
-- secciones nuevas: "Lineamientos docentes" y "Test de nivel". Ningún esquema nuevo -- solo una
-- columna document_type que distingue las 3 secciones, cada una con su propia visibilidad por rol:
--   policy            -- Admin gestiona+ve, Teacher ve, Student ve (comportamiento actual, sin cambios)
--   teacher_guideline -- Admin gestiona+ve, Teacher ve, Student SIN ACCESO
--   level_test        -- Admin gestiona+ve, Student ve, Teacher SIN ACCESO
-- Depende de: 0001 (private schema), 0003 (public.profiles), 0034 (institutional_documents).

alter table public.institutional_documents
  add column document_type text not null default 'policy'
    check (document_type in ('policy', 'teacher_guideline', 'level_test'));

-- El índice de listado ahora filtra primero por document_type (cada página solo pide su propio tipo).
drop index public.institutional_documents_published_order_idx;
create index institutional_documents_type_published_order_idx
  on public.institutional_documents (document_type, is_published, sort_order);

-- Helper de rol teacher, mismo patrón que private.is_admin() (0003).
create or replace function private.is_teacher()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'teacher'
  );
$$;

revoke execute on function private.is_teacher() from public, anon, authenticated;
grant execute on function private.is_teacher() to authenticated;

-- Helper de rol student, mismo patrón.
create or replace function private.is_student()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'student'
  );
$$;

revoke execute on function private.is_student() from public, anon, authenticated;
grant execute on function private.is_student() to authenticated;

-- La policy de select original (0034) permitía a CUALQUIER autenticado ver cualquier documento
-- publicado, sin distinguir tipo -- ya no es correcta con 3 tipos de visibilidad distinta.
drop policy institutional_documents_select on public.institutional_documents;

-- "policy": Teacher y Student (y Admin, ya cubierto por institutional_documents_admin_write) ven
-- lo publicado -- comportamiento idéntico al que existía antes de esta migración.
create policy institutional_documents_select_policy on public.institutional_documents
  for select to authenticated
  using (is_published and document_type = 'policy');

-- "teacher_guideline": solo Teacher (Admin ya cubierto por admin_write). Student sin policy → sin acceso.
create policy institutional_documents_select_teacher_guideline on public.institutional_documents
  for select to authenticated
  using (is_published and document_type = 'teacher_guideline' and (select private.is_teacher()));

-- "level_test": solo Student (Admin ya cubierto por admin_write). Teacher sin policy → sin acceso.
create policy institutional_documents_select_level_test on public.institutional_documents
  for select to authenticated
  using (is_published and document_type = 'level_test' and (select private.is_student()));
