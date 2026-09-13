-- Dominio: placement test
-- Depende de: 0001 (academic_level), 0003 (profiles, private.is_admin)
--
-- Corrección conceptual: `placement_tests` es la DEFINICIÓN/configuración del examen (catálogo
-- administrado por admin), no el proceso de un estudiante. La ejecución individual de un
-- estudiante vive en `placement_test_attempts`, y un estudiante puede tener múltiples intentos
-- del mismo test (sin unicidad por estudiante ni por (estudiante, test)).

create type public.placement_test_status as enum ('draft', 'active', 'inactive');
create type public.placement_attempt_status as enum ('not_started', 'in_progress', 'completed', 'cancelled');

create table public.placement_tests (
  id bigint generated always as identity primary key,
  name text not null,
  description text,
  status public.placement_test_status not null default 'draft',
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index placement_tests_status_idx on public.placement_tests (status);

create table public.placement_test_attempts (
  id bigint generated always as identity primary key,
  placement_test_id bigint not null references public.placement_tests (id) on delete restrict,
  student_id uuid not null references public.profiles (id) on delete restrict,
  status public.placement_attempt_status not null default 'not_started',
  score numeric(5, 2),
  resulting_level public.academic_level,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index placement_test_attempts_test_id_idx on public.placement_test_attempts (placement_test_id);
create index placement_test_attempts_student_id_idx on public.placement_test_attempts (student_id);

-- ── RLS ──────────────────────────────────────────────────────────────────

alter table public.placement_tests enable row level security;
alter table public.placement_test_attempts enable row level security;

-- placement_tests: catálogo de exámenes. Lectura abierta a autenticados (el filtrado por
-- status='active' para mostrar solo tests disponibles se hace en la capa de aplicación, igual
-- que con programs/skills); escritura solo admin.
create policy placement_tests_select_authenticated on public.placement_tests
  for select to authenticated
  using (true);

create policy placement_tests_admin_write on public.placement_tests
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- placement_test_attempts: el propio estudiante gestiona sus intentos; admin ve/gestiona todo.
-- Un intento solo puede crearse sobre un test en status='active' (regla de negocio expresable
-- directamente en RLS, no requiere función SECURITY DEFINER).
create policy placement_test_attempts_select_own on public.placement_test_attempts
  for select to authenticated
  using (student_id = (select auth.uid()) or (select private.is_admin()));

create policy placement_test_attempts_insert_own on public.placement_test_attempts
  for insert to authenticated
  with check (
    (
      student_id = (select auth.uid())
      and exists (
        select 1 from public.placement_tests pt
        where pt.id = placement_test_id and pt.status = 'active'
      )
    )
    or (select private.is_admin())
  );

create policy placement_test_attempts_update_own on public.placement_test_attempts
  for update to authenticated
  using (student_id = (select auth.uid()) or (select private.is_admin()))
  with check (student_id = (select auth.uid()) or (select private.is_admin()));
