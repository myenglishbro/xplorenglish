-- Dominio: identidad y usuarios
-- Depende de: 0001 (enums user_role, academic_level), 0002 (programs)

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  dni text not null,
  phone text not null,
  role public.user_role not null default 'student',
  program_id bigint references public.programs (id) on delete restrict,
  level public.academic_level not null default 'A1',
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index profiles_dni_uidx on public.profiles (dni);
create index profiles_role_idx on public.profiles (role);
create index profiles_program_id_idx on public.profiles (program_id);

create table public.role_changes (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles (id) on delete restrict,
  previous_role public.user_role not null,
  new_role public.user_role not null,
  changed_by uuid not null references public.profiles (id) on delete restrict,
  changed_at timestamptz not null default now()
);

create index role_changes_profile_id_idx on public.role_changes (profile_id);
create index role_changes_changed_by_idx on public.role_changes (changed_by);

create table public.teacher_profiles (
  profile_id uuid primary key references public.profiles (id) on delete restrict,
  hourly_rate numeric(10, 2) not null check (hourly_rate >= 0),
  bio text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.teacher_availability (
  id bigint generated always as identity primary key,
  teacher_id uuid not null references public.teacher_profiles (profile_id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null check (end_time > start_time),
  timezone text not null default 'America/Lima'
);

create index teacher_availability_teacher_id_idx on public.teacher_availability (teacher_id);

create table public.teacher_skills (
  teacher_id uuid not null references public.teacher_profiles (profile_id) on delete cascade,
  skill_id bigint not null references public.skills (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (teacher_id, skill_id)
);

create index teacher_skills_skill_id_idx on public.teacher_skills (skill_id);

-- ── RLS ──────────────────────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.role_changes enable row level security;
alter table public.teacher_profiles enable row level security;
alter table public.teacher_availability enable row level security;
alter table public.teacher_skills enable row level security;

-- Helper: admin check, en esquema no expuesto, security definer.
create or replace function private.is_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

revoke execute on function private.is_admin() from public, anon, authenticated;
grant execute on function private.is_admin() to authenticated;

-- profiles: cada usuario ve/edita su propia fila; admin ve/edita todas.
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()));

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy profiles_admin_all on public.profiles
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- role_changes: solo admin.
create policy role_changes_admin_only on public.role_changes
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- teacher_profiles: el propio docente lee lo suyo (tarifa incluida); admin todo.
-- La tarifa la fija admin: el docente NO tiene policy de UPDATE, solo SELECT.
create policy teacher_profiles_select_self on public.teacher_profiles
  for select to authenticated
  using (profile_id = (select auth.uid()) or (select private.is_admin()));

create policy teacher_profiles_admin_write on public.teacher_profiles
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- teacher_availability: el docente gestiona la suya; admin ve/gestiona todo.
create policy teacher_availability_owner on public.teacher_availability
  for all to authenticated
  using (teacher_id = (select auth.uid()) or (select private.is_admin()))
  with check (teacher_id = (select auth.uid()) or (select private.is_admin()));

-- teacher_skills: el docente gestiona las suyas; admin ve/gestiona todo.
create policy teacher_skills_owner on public.teacher_skills
  for all to authenticated
  using (teacher_id = (select auth.uid()) or (select private.is_admin()))
  with check (teacher_id = (select auth.uid()) or (select private.is_admin()));

-- Ahora que private.is_admin() existe, se agregan las policies de escritura
-- de los catálogos creados en 0002.
create policy programs_admin_write on public.programs
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy skills_admin_write on public.skills
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));
