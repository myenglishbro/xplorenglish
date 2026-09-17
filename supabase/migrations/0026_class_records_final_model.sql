-- Dominio: rediseño operativo desde cero (Fase 0, Slice A) -- modelo final, sin capa de
-- compatibilidad con el flujo anterior. Toda la data tocada aquí es de testing (confirmado por
-- el cliente); se limpia sin intentar preservarla.
--
-- Reemplaza por completo: classroom_students, sessions, session_attendance, teacher_hours_log,
-- teacher_payment_periods, teacher_receipts, session_teacher_changes, y el flujo de
-- aprobación/recibo de pago docente asociado (upload_teacher_receipt/approve_teacher_payment_period/
-- mark_teacher_payment_period_paid) -- ese flujo no tiene lugar en el modelo nuevo (teacher_payments
-- es un pago ya realizado, sin paso de aprobación ni recibo previo).
--
-- register_class / correct_class / pay_teacher_sessions / disponibilidad en bloque / UI nueva /
-- Financial Reporting NO se tocan en este slice.

-- ============================================================================
-- 1) classrooms.student_id (reemplaza classroom_students)
-- ============================================================================

alter table public.classrooms
  add column student_id uuid references public.profiles(id) on delete restrict;

-- Backfill de configuración actual (no histórico) antes de eliminar classroom_students.
update public.classrooms c
  set student_id = cs.student_id
  from public.classroom_students cs
  where cs.classroom_id = c.id and cs.status = 'active';

-- ============================================================================
-- 2) Limpieza de toda la data de testing del dominio de sesiones/horas/pagos
--    (conjunto cerrado: ninguna tabla fuera de esta lista referencia a estas).
-- ============================================================================

truncate table
  public.hours_movements,
  public.teacher_receipts,
  public.teacher_hours_log,
  public.session_teacher_changes,
  public.session_attendance,
  public.sessions,
  public.teacher_payment_periods,
  public.hours_packages
  restart identity;

-- ============================================================================
-- 3) Eliminación explícita y controlada del modelo viejo (sin CASCADE indiscriminado)
-- ============================================================================

-- 3a) classroom_students -- ya no aporta nada tras el backfill.
drop trigger classroom_students_check_role on public.classroom_students;
drop table public.classroom_students;
drop function private.check_classroom_student_role();

-- 3b) session_teacher_changes -- audit log de scheduled/actual teacher, concepto muerto.
-- change_session_teacher() usa el enum session_teacher_change_type como argumento, así que debe
-- eliminarse antes que el tipo (se elimina aquí junto con el resto de RPCs del ciclo viejo).
drop function public.change_session_teacher(bigint, public.session_teacher_change_type, uuid, text);
drop table public.session_teacher_changes;
drop type public.session_teacher_change_type;

-- 3c) Flujo de recibo/aprobación de pago docente -- reemplazado por teacher_payments (sin paso
--     de aprobación ni recibo previo en el modelo nuevo).
-- Políticas de storage.objects (bucket teacher-receipts) que dependen de can_manage_receipt --
-- no se toca el bucket ni sus archivos, solo las políticas de la función que desaparece.
drop policy teacher_receipts_write_own on storage.objects;
drop policy teacher_receipts_select_own on storage.objects;

drop trigger teacher_receipts_lock_paid_period on public.teacher_receipts;
drop function public.upload_teacher_receipt(bigint, text);
drop function public.approve_teacher_payment_period(bigint);
drop function public.mark_teacher_payment_period_paid(bigint, timestamptz);
drop function private.can_manage_receipt(uuid, bigint);
drop function private.prevent_paid_period_receipt_mutation();
drop table public.teacher_receipts;

-- 3d) hours_movements pierde su FK hacia session_attendance (se re-apunta a class_records en el
--     paso 5); luego session_attendance puede eliminarse sin CASCADE.
alter table public.hours_movements drop constraint hours_movements_session_attendance_id_fkey;
drop table public.session_attendance;

-- 3e) teacher_hours_log -- fusionado dentro de class_records.
drop trigger teacher_hours_log_lock_paid_period on public.teacher_hours_log;
drop table public.teacher_hours_log;
drop function private.prevent_paid_period_hours_mutation();

-- 3f) RPCs del ciclo de vida viejo de sesiones/asignación/pago -- deben eliminarse ANTES que
--     sessions/teacher_payment_periods/attendance_status, porque varias retornan el tipo fila de
--     esas tablas o reciben attendance_status como argumento (dependencia de tipos de Postgres).
-- (change_session_teacher ya se eliminó en 3b, antes de soltar su tipo de argumento)
drop function public.start_session(bigint, uuid);
drop function public.complete_session(bigint);
drop function public.cancel_session(bigint);
drop function public.reschedule_session(bigint, timestamptz, timestamptz, uuid, text);
drop function public.initialize_session_attendance(bigint);
drop function public.set_student_session_billing(bigint, uuid, public.attendance_status, integer, text);
drop function public.assign_classroom_primary_teacher(bigint, uuid);
drop function public.classroom_primary_teacher_name(bigint);
drop function public.create_teacher_payment_period(uuid, date, date);

-- 3g) sessions -- ya no tiene referencias entrantes pendientes (session_attendance,
--     teacher_hours_log, session_teacher_changes y las RPCs de 3f ya se eliminaron arriba).
drop table public.sessions;
drop type public.session_status;
drop type public.attendance_status;

-- 3h) teacher_payment_periods -- reemplazado por teacher_payments (creado en el paso 4).
drop table public.teacher_payment_periods;
drop type public.teacher_payment_period_status;
drop function private.prevent_paid_period_mutation();

-- 3i) Restricciones duras de disponibilidad/PRIMARY (0019) -- el modelo nuevo nunca las quiere.
drop trigger class_schedules_check_primary_compatibility on public.class_schedules;
drop function private.check_class_schedule_teacher_compatibility();
drop function private.validate_teacher_weekly_block(uuid, smallint, time, time, bigint);
drop function private.validate_teacher_session_slot(uuid, timestamptz, timestamptz, bigint);

-- 3j) classroom_teachers -- ya no distingue PRIMARY/SUBSTITUTE.
drop index public.classroom_teachers_one_primary_active_uidx;
alter table public.classroom_teachers drop column teacher_role;
drop type public.classroom_teacher_role;

-- ============================================================================
-- 4) teacher_payments (reemplaza teacher_payment_periods)
-- ============================================================================

create table public.teacher_payments (
  id bigint generated always as identity primary key,
  teacher_id uuid not null references public.teacher_profiles(profile_id) on delete restrict,
  paid_at timestamptz not null default now(),
  total_minutes integer not null check (total_minutes >= 0),
  total_amount numeric(10,2) not null check (total_amount >= 0),
  reference text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index teacher_payments_teacher_idx on public.teacher_payments (teacher_id, paid_at desc);

alter table public.teacher_payments enable row level security;

create policy teacher_payments_admin_write on public.teacher_payments
  for all
  using (private.is_admin())
  with check (private.is_admin());

create policy teacher_payments_select_own on public.teacher_payments
  for select
  using (teacher_id = (select auth.uid()) or private.is_admin());

-- ============================================================================
-- 5) class_records (reemplaza sessions + session_attendance + teacher_hours_log)
-- ============================================================================

create type public.class_record_status as enum ('present', 'absent', 'rescheduled');

create table public.class_records (
  id bigint generated always as identity primary key,
  classroom_id bigint not null references public.classrooms(id) on delete restrict,
  teacher_id uuid not null references public.teacher_profiles(profile_id) on delete restrict,
  student_id uuid not null references public.profiles(id) on delete restrict,
  occurred_at timestamptz not null,
  status public.class_record_status not null,
  minutes integer not null,
  notes text,
  hourly_rate_snapshot numeric(10,2),
  amount numeric(10,2),
  teacher_payment_id bigint references public.teacher_payments(id) on delete restrict,
  idempotency_key uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint class_records_idempotency_key_uidx unique (idempotency_key),
  constraint class_records_billable_shape check (
    (status = 'rescheduled'
       and minutes = 0
       and hourly_rate_snapshot is null
       and amount is null)
    or
    (status in ('present', 'absent')
       and minutes > 0
       and hourly_rate_snapshot is not null
       and amount is not null)
  )
);

create index class_records_classroom_idx on public.class_records (classroom_id, occurred_at desc);
create index class_records_teacher_idx on public.class_records (teacher_id, occurred_at desc);
create index class_records_pending_idx on public.class_records (teacher_id)
  where teacher_payment_id is null and status <> 'rescheduled';

alter table public.class_records enable row level security;

create policy class_records_admin_write on public.class_records
  for all
  using (private.is_admin())
  with check (private.is_admin());

create policy class_records_select on public.class_records
  for select
  using (
    private.is_admin()
    or private.is_classroom_teacher(classroom_id)
    or private.is_classroom_student(classroom_id)
  );

-- Inmutabilidad: una clase pagada solo permite corregir notes (y updated_at como consecuencia).
create function private.prevent_paid_class_record_mutation()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if TG_OP = 'DELETE' then
    if old.teacher_payment_id is not null then
      raise exception 'CLASS_RECORD_PAID: no se puede eliminar una clase ya pagada' using errcode = 'P0001';
    end if;
    return old;
  end if;

  if old.teacher_payment_id is not null then
    if new.id is distinct from old.id
       or new.classroom_id is distinct from old.classroom_id
       or new.teacher_id is distinct from old.teacher_id
       or new.student_id is distinct from old.student_id
       or new.occurred_at is distinct from old.occurred_at
       or new.status is distinct from old.status
       or new.minutes is distinct from old.minutes
       or new.hourly_rate_snapshot is distinct from old.hourly_rate_snapshot
       or new.amount is distinct from old.amount
       or new.teacher_payment_id is distinct from old.teacher_payment_id
       or new.idempotency_key is distinct from old.idempotency_key
       or new.created_at is distinct from old.created_at
    then
      raise exception 'CLASS_RECORD_PAID: una clase pagada solo permite corregir notes' using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

create trigger class_records_lock_paid
  before update or delete on public.class_records
  for each row execute function private.prevent_paid_class_record_mutation();

-- ============================================================================
-- 6) hours_movements -- se re-apunta a class_records (ya no a session_attendance)
-- ============================================================================

alter table public.hours_movements
  rename column session_attendance_id to class_record_id;

alter table public.hours_movements
  add constraint hours_movements_class_record_id_fkey
  foreign key (class_record_id) references public.class_records(id) on delete restrict;

-- package_id ya era nullable (verificado antes de este slice) y movement_type ya distingue
-- 'purchase' (recarga) de 'consumption' (clase) -- no requieren cambio para el modelo nuevo.

-- ============================================================================
-- 7) Validación de asignación de alumno al salón (role + estado)
-- ============================================================================

create function private.check_classroom_student_assignment()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_role public.user_role;
  v_status text;
begin
  if new.student_id is null then
    return new;
  end if;

  select role, status into v_role, v_status
  from public.profiles
  where id = new.student_id;

  if not found then
    raise exception 'INVALID_CLASSROOM_STUDENT: el perfil % no existe', new.student_id using errcode = 'P0002';
  end if;

  if v_role <> 'student' then
    raise exception 'INVALID_CLASSROOM_STUDENT: el perfil % no tiene role=student', new.student_id using errcode = 'P0001';
  end if;

  if v_status <> 'active' then
    raise exception 'INVALID_CLASSROOM_STUDENT: el perfil % no está activo', new.student_id using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger classrooms_check_student_assignment
  before insert or update of student_id on public.classrooms
  for each row execute function private.check_classroom_student_assignment();

-- ============================================================================
-- 8) private.is_classroom_student -- ya no depende de classroom_students
-- ============================================================================

create or replace function private.is_classroom_student(p_classroom_id bigint)
returns boolean
language sql
stable
security definer
set search_path to ''
as $$
  select exists (
    select 1 from public.classrooms c
    where c.id = p_classroom_id
      and c.student_id = (select auth.uid())
      and c.status = 'active'
  );
$$;
