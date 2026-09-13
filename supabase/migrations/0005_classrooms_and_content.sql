-- Dominio: salones y contenido (Salón > Módulos > Lecciones > Recursos)
-- Depende de: 0001 (academic_level), 0002 (programs), 0003 (teacher_profiles, profiles, private.is_admin)

create type public.classroom_teacher_role as enum ('PRIMARY', 'SUBSTITUTE');
create type public.membership_status as enum ('active', 'inactive');
create type public.resource_type as enum ('pdf', 'drive', 'docs', 'slides', 'youtube', 'url', 'embed');

create table public.classrooms (
  id bigint generated always as identity primary key,
  name text not null,
  program_id bigint not null references public.programs (id) on delete restrict,
  level public.academic_level not null,
  description text,
  schedule_notes text,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now()
);

create index classrooms_program_id_idx on public.classrooms (program_id);

-- classroom_teachers: relación N:M salón<->docente. Representa relaciones HABITUALES
-- (titular/suplente), no una lista blanca de quién puede dictar una sesión concreta
-- (eso lo decide sessions.actual_teacher_id, sin depender de esta tabla).
create table public.classroom_teachers (
  id bigint generated always as identity primary key,
  classroom_id bigint not null references public.classrooms (id) on delete cascade,
  teacher_id uuid not null references public.teacher_profiles (profile_id) on delete restrict,
  teacher_role public.classroom_teacher_role not null,
  status public.membership_status not null default 'active',
  assigned_at timestamptz not null default now(),
  unique (classroom_id, teacher_id)
);

create index classroom_teachers_classroom_id_idx on public.classroom_teachers (classroom_id);
create index classroom_teachers_teacher_id_idx on public.classroom_teachers (teacher_id);

-- Constraint de negocio a nivel de base de datos (no solo aplicación):
-- a lo sumo un PRIMARY activo por salón.
create unique index classroom_teachers_one_primary_active_uidx
  on public.classroom_teachers (classroom_id)
  where teacher_role = 'PRIMARY' and status = 'active';

create table public.classroom_students (
  classroom_id bigint not null references public.classrooms (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete restrict,
  status public.membership_status not null default 'active',
  enrolled_at timestamptz not null default now(),
  primary key (classroom_id, student_id)
);

create index classroom_students_student_id_idx on public.classroom_students (student_id);

create table public.modules (
  id bigint generated always as identity primary key,
  classroom_id bigint not null references public.classrooms (id) on delete cascade,
  title text not null,
  description text,
  order_index integer not null default 0
);

create index modules_classroom_id_idx on public.modules (classroom_id);

create table public.lessons (
  id bigint generated always as identity primary key,
  module_id bigint not null references public.modules (id) on delete cascade,
  title text not null,
  description text,
  order_index integer not null default 0
);

create index lessons_module_id_idx on public.lessons (module_id);

create table public.resources (
  id bigint generated always as identity primary key,
  lesson_id bigint not null references public.lessons (id) on delete cascade,
  type public.resource_type not null,
  title text not null,
  reference text not null, -- URL externa o ruta en Supabase Storage
  order_index integer not null default 0
);

create index resources_lesson_id_idx on public.resources (lesson_id);

-- ── Helpers de RLS (private, security definer) ──────────────────────────────

create or replace function private.is_classroom_teacher(p_classroom_id bigint)
returns boolean
language sql security definer set search_path = '' stable
as $$
  select exists (
    select 1 from public.classroom_teachers ct
    where ct.classroom_id = p_classroom_id
      and ct.teacher_id = (select auth.uid())
      and ct.status = 'active'
  );
$$;

create or replace function private.is_classroom_student(p_classroom_id bigint)
returns boolean
language sql security definer set search_path = '' stable
as $$
  select exists (
    select 1 from public.classroom_students cs
    where cs.classroom_id = p_classroom_id
      and cs.student_id = (select auth.uid())
      and cs.status = 'active'
  );
$$;

create or replace function private.can_access_classroom(p_classroom_id bigint)
returns boolean
language sql security definer set search_path = '' stable
as $$
  select private.is_admin()
      or private.is_classroom_teacher(p_classroom_id)
      or private.is_classroom_student(p_classroom_id);
$$;

create or replace function private.classroom_id_for_module(p_module_id bigint)
returns bigint
language sql security definer set search_path = '' stable
as $$
  select classroom_id from public.modules where id = p_module_id;
$$;

create or replace function private.classroom_id_for_lesson(p_lesson_id bigint)
returns bigint
language sql security definer set search_path = '' stable
as $$
  select m.classroom_id
  from public.lessons l
  join public.modules m on m.id = l.module_id
  where l.id = p_lesson_id;
$$;

revoke execute on function private.is_classroom_teacher(bigint) from public, anon, authenticated;
revoke execute on function private.is_classroom_student(bigint) from public, anon, authenticated;
revoke execute on function private.can_access_classroom(bigint) from public, anon, authenticated;
revoke execute on function private.classroom_id_for_module(bigint) from public, anon, authenticated;
revoke execute on function private.classroom_id_for_lesson(bigint) from public, anon, authenticated;
grant execute on function private.is_classroom_teacher(bigint) to authenticated;
grant execute on function private.is_classroom_student(bigint) to authenticated;
grant execute on function private.can_access_classroom(bigint) to authenticated;
grant execute on function private.classroom_id_for_module(bigint) to authenticated;
grant execute on function private.classroom_id_for_lesson(bigint) to authenticated;

-- ── RLS ──────────────────────────────────────────────────────────────────

alter table public.classrooms enable row level security;
alter table public.classroom_teachers enable row level security;
alter table public.classroom_students enable row level security;
alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.resources enable row level security;

create policy classrooms_select on public.classrooms
  for select to authenticated
  using ((select private.can_access_classroom(id)));

create policy classrooms_admin_write on public.classrooms
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy classroom_teachers_select on public.classroom_teachers
  for select to authenticated
  using ((select private.can_access_classroom(classroom_id)));

create policy classroom_teachers_admin_write on public.classroom_teachers
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy classroom_students_select on public.classroom_students
  for select to authenticated
  using ((select private.can_access_classroom(classroom_id)));

create policy classroom_students_admin_write on public.classroom_students
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy modules_select on public.modules
  for select to authenticated
  using ((select private.can_access_classroom(classroom_id)));

create policy modules_admin_write on public.modules
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy lessons_select on public.lessons
  for select to authenticated
  using ((select private.can_access_classroom(private.classroom_id_for_module(module_id))));

create policy lessons_admin_write on public.lessons
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy resources_select on public.resources
  for select to authenticated
  using ((select private.can_access_classroom(private.classroom_id_for_lesson(lesson_id))));

create policy resources_admin_write on public.resources
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));
