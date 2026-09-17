-- Dominio: documentos institucionales globales (políticas, reglamentos, términos y condiciones) --
-- "Políticas y reglamentos", accesible desde el sidebar para los 3 roles.
-- Depende de: 0001 (private.is_admin).
--
-- Contexto: el cliente aclaró que el contenido que quería precargar por salón en realidad eran
-- documentos institucionales GLOBALES (políticas/reglamentos/términos), no plantillas de contenido
-- académico. No se implementa NADA de templates/copy-on-create -- esta tabla es una sección
-- centralizada, independiente de classrooms/modules/lessons/resources. Solo guarda título + URL
-- (Google Drive/Docs/Slides/PDF/otro link) -- nunca el archivo en sí (sin Storage nuevo, sin
-- integración con Google Drive API).
create table public.institutional_documents (
  id bigint generated always as identity primary key,
  title text not null,
  url text not null,
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index institutional_documents_published_order_idx
  on public.institutional_documents (is_published, sort_order);

-- ── RLS ──────────────────────────────────────────────────────────────────
-- Admin: SELECT/INSERT/UPDATE/DELETE sin restricción (gestión completa). Teacher/Student
-- (cualquier autenticado no-admin): SELECT únicamente is_published=true -- mismo patrón que
-- modules_select/lessons_select (0016): dos policies permisivas para el mismo comando, Postgres
-- las combina con OR. Sin policy para anon -- default deny, igual que el resto del proyecto.
alter table public.institutional_documents enable row level security;

create policy institutional_documents_admin_write on public.institutional_documents
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy institutional_documents_select on public.institutional_documents
  for select to authenticated
  using (is_published);
