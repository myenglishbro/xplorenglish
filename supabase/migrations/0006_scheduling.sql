-- Dominio: programación de clases (horarios, sesiones, reasignación de docente, asistencia)
-- Depende de: 0003 (profiles, teacher_profiles, private.is_admin), 0005 (classrooms, private.can_access_classroom)

create type public.session_status as enum ('scheduled', 'completed', 'cancelled', 'rescheduled');
create type public.attendance_status as enum ('present', 'absent', 'cancelled', 'rescheduled');
create type public.session_teacher_change_type as enum ('SCHEDULED_TEACHER_CHANGED', 'ACTUAL_TEACHER_CHANGED');

create table public.class_schedules (
  id bigint generated always as identity primary key,
  classroom_id bigint not null references public.classrooms (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null check (end_time > start_time),
  timezone text not null default 'America/Lima',
  is_active boolean not null default true
);

create index class_schedules_classroom_id_idx on public.class_schedules (classroom_id);

-- sessions: distingue scheduled_teacher_id (programado) de actual_teacher_id (quien dictó
-- realmente). Ninguno de los dos exige pertenencia previa a classroom_teachers: puede ser
-- cualquier docente activo del sistema (sustitución puntual sin alta permanente).
create table public.sessions (
  id bigint generated always as identity primary key,
  classroom_id bigint not null references public.classrooms (id) on delete restrict,
  scheduled_teacher_id uuid not null references public.teacher_profiles (profile_id) on delete restrict,
  actual_teacher_id uuid references public.teacher_profiles (profile_id) on delete restrict,
  scheduled_start timestamptz not null,
  scheduled_end timestamptz not null check (scheduled_end > scheduled_start),
  actual_start timestamptz,
  actual_end timestamptz,
  status public.session_status not null default 'scheduled',
  rescheduled_from_session_id bigint references public.sessions (id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  -- Precondición de negocio a nivel de motor: no se puede completar sin docente real definido.
  constraint sessions_completed_requires_actual_teacher
    check (status <> 'completed' or actual_teacher_id is not null)
);

create index sessions_classroom_id_idx on public.sessions (classroom_id);
create index sessions_scheduled_teacher_id_idx on public.sessions (scheduled_teacher_id);
create index sessions_actual_teacher_id_idx on public.sessions (actual_teacher_id);
create index sessions_rescheduled_from_idx on public.sessions (rescheduled_from_session_id);
create index sessions_status_idx on public.sessions (status);

-- session_teacher_changes: audita cambios TANTO de scheduled_teacher_id como de
-- actual_teacher_id (change_type distingue cuál). Evita perder el historial si una sesión
-- se reasigna más de una vez (mismo principio que role_changes).
create table public.session_teacher_changes (
  id bigint generated always as identity primary key,
  session_id bigint not null references public.sessions (id) on delete cascade,
  change_type public.session_teacher_change_type not null,
  previous_teacher_id uuid references public.teacher_profiles (profile_id) on delete restrict,
  new_teacher_id uuid not null references public.teacher_profiles (profile_id) on delete restrict,
  changed_by uuid not null references public.profiles (id) on delete restrict,
  changed_at timestamptz not null default now(),
  reason text
);

create index session_teacher_changes_session_id_idx on public.session_teacher_changes (session_id);
create index session_teacher_changes_new_teacher_idx on public.session_teacher_changes (new_teacher_id);
create index session_teacher_changes_previous_teacher_idx on public.session_teacher_changes (previous_teacher_id);

create table public.session_attendance (
  id bigint generated always as identity primary key,
  session_id bigint not null references public.sessions (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete restrict,
  status public.attendance_status not null default 'present',
  minutes_charged integer check (minutes_charged is null or minutes_charged >= 0), -- minutos enteros, no horas
  decided_by uuid references public.profiles (id) on delete restrict,
  decided_at timestamptz,
  unique (session_id, student_id)
);

create index session_attendance_session_id_idx on public.session_attendance (session_id);
create index session_attendance_student_id_idx on public.session_attendance (student_id);

-- ── RLS ──────────────────────────────────────────────────────────────────
-- Nota de diseño: las escrituras de estas tablas son admin-only a nivel de tabla.
-- Los flujos de negocio (Start/End Class, decidir consumo de horas, reasignar docente)
-- se implementan como funciones SECURITY DEFINER (fuera del alcance de esta migración de
-- esquema; ver DATABASE_PLAN.md §14) que validan al docente/admin llamante y ejecutan la
-- escritura internamente. Esto evita depender de RLS por columna, que Postgres no soporta.

alter table public.class_schedules enable row level security;
alter table public.sessions enable row level security;
alter table public.session_teacher_changes enable row level security;
alter table public.session_attendance enable row level security;

create policy class_schedules_select on public.class_schedules
  for select to authenticated
  using ((select private.can_access_classroom(classroom_id)));

create policy class_schedules_admin_write on public.class_schedules
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- sessions: el docente ve las suyas (programado o real) aunque no esté en classroom_teachers;
-- el estudiante y el docente habitual las ven vía pertenencia al salón; admin ve todo.
create policy sessions_select on public.sessions
  for select to authenticated
  using (
    (select private.is_admin())
    or scheduled_teacher_id = (select auth.uid())
    or actual_teacher_id = (select auth.uid())
    or (select private.can_access_classroom(classroom_id))
  );

create policy sessions_admin_write on public.sessions
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- session_teacher_changes: admin ve todo; el docente involucrado (anterior o nuevo) ve su propia
-- trazabilidad, para transparencia. Escritura solo vía función SECURITY DEFINER (admin-only aquí).
create policy session_teacher_changes_select on public.session_teacher_changes
  for select to authenticated
  using (
    (select private.is_admin())
    or previous_teacher_id = (select auth.uid())
    or new_teacher_id = (select auth.uid())
  );

create policy session_teacher_changes_admin_write on public.session_teacher_changes
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- session_attendance: el propio estudiante ve su fila; docente de la sesión y admin ven todo
-- lo del salón/sesión.
create policy session_attendance_select on public.session_attendance
  for select to authenticated
  using (
    (select private.is_admin())
    or student_id = (select auth.uid())
    or exists (
      select 1 from public.sessions s
      where s.id = session_attendance.session_id
        and (s.scheduled_teacher_id = (select auth.uid()) or s.actual_teacher_id = (select auth.uid()))
    )
  );

create policy session_attendance_admin_write on public.session_attendance
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));
