-- Dominio: operaciones transaccionales de negocio (capa de funciones SECURITY DEFINER/INVOKER)
-- Depende de: 0001-0008 (todas las tablas y enums del esquema).
-- Contrato completo, roles, idempotencia y algoritmo FIFO documentados en docs/DOMAIN_FUNCTIONS_API.md.
--
-- Convenciones aplicadas a las 12 funciones:
--   * search_path = '' siempre; todo objeto calificado por schema.
--   * auth.uid() resuelve SIEMPRE quién llama; ningún p_teacher_id/p_student_id se usa para eso.
--   * revoke all ... from public, anon; grant execute ... to authenticated (uniforme).
--   * SECURITY DEFINER solo cuando un rol no-admin necesita bypass de RLS (ver docs para el porqué
--     de cada una); el resto es SECURITY INVOKER.
--   * Errores: 'CODIGO: mensaje' con errcode 42501 (autorización), P0002 (no encontrado),
--     P0001 (regla de negocio/estado).
--   * Horas en minutos enteros de extremo a extremo; numeric reservado para dinero.

-- ============================================================================================
-- 1. start_session
-- ============================================================================================

create or replace function public.start_session(
  p_session_id bigint,
  p_actual_teacher_id uuid default null
)
returns public.sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid := (select auth.uid());
  v_caller_role public.user_role;
  v_session public.sessions;
  v_target_teacher uuid;
  v_is_new_assignment boolean := false;
begin
  if v_caller_id is null then
    raise exception 'UNAUTHENTICATED: no autenticado' using errcode = '28000';
  end if;

  select role into v_caller_role from public.profiles where id = v_caller_id;

  select * into v_session from public.sessions where id = p_session_id for update;
  if not found then
    raise exception 'SESSION_NOT_FOUND: sesion % no existe', p_session_id using errcode = 'P0002';
  end if;

  if v_caller_role = 'admin' then
    v_target_teacher := coalesce(p_actual_teacher_id, v_session.actual_teacher_id, v_session.scheduled_teacher_id);
  elsif v_caller_role = 'teacher' then
    if p_actual_teacher_id is not null and p_actual_teacher_id <> v_caller_id then
      raise exception 'NOT_AUTHORIZED: un docente no puede iniciar la sesion en nombre de otro' using errcode = '42501';
    end if;
    if v_caller_id <> coalesce(v_session.actual_teacher_id, v_session.scheduled_teacher_id) then
      raise exception 'NOT_AUTHORIZED: no eres el docente asignado a esta sesion' using errcode = '42501';
    end if;
    v_target_teacher := v_caller_id;
  else
    raise exception 'NOT_AUTHORIZED: rol % no puede iniciar sesiones', v_caller_role using errcode = '42501';
  end if;

  -- Idempotencia: ya iniciada
  if v_session.actual_start is not null then
    if v_session.actual_teacher_id = v_target_teacher then
      return v_session;
    else
      raise exception 'TEACHER_MISMATCH: la sesion ya fue iniciada por otro docente' using errcode = 'P0001';
    end if;
  end if;

  if v_session.status <> 'scheduled' then
    raise exception 'INVALID_SESSION_STATUS: la sesion no esta en estado scheduled (actual: %)', v_session.status using errcode = 'P0001';
  end if;

  if not exists (select 1 from public.teacher_profiles where profile_id = v_target_teacher and status = 'active') then
    raise exception 'TEACHER_INACTIVE: el docente % no esta activo', v_target_teacher using errcode = 'P0001';
  end if;

  v_is_new_assignment := v_session.actual_teacher_id is null;

  update public.sessions
  set actual_start = now(),
      actual_teacher_id = v_target_teacher
  where id = p_session_id
  returning * into v_session;

  if v_is_new_assignment then
    insert into public.session_teacher_changes (session_id, change_type, previous_teacher_id, new_teacher_id, changed_by, reason)
    values (p_session_id, 'ACTUAL_TEACHER_CHANGED', null, v_target_teacher, v_caller_id, 'start_session');
  end if;

  perform public.initialize_session_attendance(p_session_id);

  return v_session;
end;
$$;

revoke all on function public.start_session(bigint, uuid) from public, anon;
grant execute on function public.start_session(bigint, uuid) to authenticated;

-- ============================================================================================
-- 2. initialize_session_attendance
-- ============================================================================================

create or replace function public.initialize_session_attendance(
  p_session_id bigint
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid := (select auth.uid());
  v_caller_role public.user_role;
  v_session public.sessions;
  v_inserted integer;
begin
  if v_caller_id is null then
    raise exception 'UNAUTHENTICATED: no autenticado' using errcode = '28000';
  end if;

  select role into v_caller_role from public.profiles where id = v_caller_id;

  select * into v_session from public.sessions where id = p_session_id;
  if not found then
    raise exception 'SESSION_NOT_FOUND: sesion % no existe', p_session_id using errcode = 'P0002';
  end if;

  if v_caller_role = 'admin' then
    null;
  elsif v_caller_role = 'teacher' then
    if v_caller_id <> coalesce(v_session.actual_teacher_id, v_session.scheduled_teacher_id) then
      raise exception 'NOT_AUTHORIZED: no eres el docente asignado a esta sesion' using errcode = '42501';
    end if;
  else
    raise exception 'NOT_AUTHORIZED: rol % no puede inicializar asistencia', v_caller_role using errcode = '42501';
  end if;

  if v_session.status <> 'scheduled' then
    raise exception 'INVALID_SESSION_STATUS: la sesion no esta en estado scheduled (actual: %)', v_session.status using errcode = 'P0001';
  end if;

  insert into public.session_attendance (session_id, student_id, status)
  select p_session_id, cs.student_id, 'present'
  from public.classroom_students cs
  where cs.classroom_id = v_session.classroom_id
    and cs.status = 'active'
  on conflict (session_id, student_id) do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

revoke all on function public.initialize_session_attendance(bigint) from public, anon;
grant execute on function public.initialize_session_attendance(bigint) to authenticated;

-- ============================================================================================
-- 3. complete_session
-- ============================================================================================

create or replace function public.complete_session(
  p_session_id bigint
)
returns table(session public.sessions, hours_log_id bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid := (select auth.uid());
  v_caller_role public.user_role;
  v_session public.sessions;
  v_existing_log_id bigint;
  v_rate numeric(10,2);
  v_minutes integer;
  v_amount numeric(10,2);
  v_log_id bigint;
begin
  if v_caller_id is null then
    raise exception 'UNAUTHENTICATED: no autenticado' using errcode = '28000';
  end if;

  select role into v_caller_role from public.profiles where id = v_caller_id;

  select * into v_session from public.sessions where id = p_session_id for update;
  if not found then
    raise exception 'SESSION_NOT_FOUND: sesion % no existe', p_session_id using errcode = 'P0002';
  end if;

  -- Autorizacion SIEMPRE antes que cualquier retorno (incluido el camino idempotente): de lo
  -- contrario, cualquier usuario autenticado podria leer el resultado de una sesion completada
  -- ajena llamando a esta funcion con solo el id.
  if v_caller_role = 'admin' then
    null;
  elsif v_caller_role = 'teacher' then
    if v_caller_id <> v_session.actual_teacher_id then
      raise exception 'NOT_AUTHORIZED: solo el docente que dicto la sesion puede completarla' using errcode = '42501';
    end if;
  else
    raise exception 'NOT_AUTHORIZED: rol % no puede completar sesiones', v_caller_role using errcode = '42501';
  end if;

  -- Idempotencia: ya completada
  if v_session.status = 'completed' then
    select id into v_existing_log_id from public.teacher_hours_log where session_id = p_session_id;
    return query select v_session, v_existing_log_id;
    return;
  end if;

  if v_session.status <> 'scheduled' then
    raise exception 'INVALID_SESSION_STATUS: la sesion no esta en estado scheduled (actual: %)', v_session.status using errcode = 'P0001';
  end if;

  if v_session.actual_teacher_id is null then
    raise exception 'MISSING_ACTUAL_TEACHER: la sesion no tiene actual_teacher_id definido' using errcode = 'P0001';
  end if;

  if v_session.actual_start is null then
    update public.sessions set actual_start = now() where id = p_session_id returning * into v_session;
  end if;

  v_minutes := round(extract(epoch from (now() - v_session.actual_start)) / 60)::integer;
  if v_minutes <= 0 then
    raise exception 'INVALID_DURATION: la duracion calculada no es positiva (% minutos)', v_minutes using errcode = 'P0001';
  end if;

  select hourly_rate into v_rate from public.teacher_profiles where profile_id = v_session.actual_teacher_id;

  -- Unica division hacia "horas" de toda la funcion: exclusivamente para calcular DINERO
  -- (numeric exacto, no float). billable_minutes se persiste como entero, nunca como horas.
  v_amount := round(v_minutes::numeric / 60 * v_rate, 2);

  update public.sessions
  set status = 'completed', actual_end = now()
  where id = p_session_id
  returning * into v_session;

  insert into public.teacher_hours_log (session_id, teacher_id, billable_minutes, hourly_rate_snapshot, amount)
  values (p_session_id, v_session.actual_teacher_id, v_minutes, v_rate, v_amount)
  returning id into v_log_id;

  return query select v_session, v_log_id;
end;
$$;

revoke all on function public.complete_session(bigint) from public, anon;
grant execute on function public.complete_session(bigint) to authenticated;

-- ============================================================================================
-- 4. change_session_teacher
-- ============================================================================================

create or replace function public.change_session_teacher(
  p_session_id bigint,
  p_change_type public.session_teacher_change_type,
  p_new_teacher_id uuid,
  p_reason text default null
)
returns public.sessions
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_caller_id uuid := (select auth.uid());
  v_caller_role public.user_role;
  v_session public.sessions;
  v_previous uuid;
begin
  if v_caller_id is null then
    raise exception 'UNAUTHENTICATED: no autenticado' using errcode = '28000';
  end if;

  select role into v_caller_role from public.profiles where id = v_caller_id;
  if v_caller_role <> 'admin' then
    raise exception 'NOT_AUTHORIZED: solo admin puede reasignar el docente de una sesion' using errcode = '42501';
  end if;

  select * into v_session from public.sessions where id = p_session_id for update;
  if not found then
    raise exception 'SESSION_NOT_FOUND: sesion % no existe', p_session_id using errcode = 'P0002';
  end if;

  if v_session.status = 'completed' then
    raise exception 'SESSION_ALREADY_COMPLETED: no se puede reasignar el docente de una sesion completada' using errcode = 'P0001';
  end if;

  if not exists (select 1 from public.teacher_profiles where profile_id = p_new_teacher_id) then
    raise exception 'TEACHER_NOT_FOUND: docente % no existe', p_new_teacher_id using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.teacher_profiles where profile_id = p_new_teacher_id and status = 'active') then
    raise exception 'TEACHER_INACTIVE: el docente % no esta activo', p_new_teacher_id using errcode = 'P0001';
  end if;

  if p_change_type = 'SCHEDULED_TEACHER_CHANGED' then
    v_previous := v_session.scheduled_teacher_id;
    if v_previous = p_new_teacher_id then
      return v_session;
    end if;
    update public.sessions set scheduled_teacher_id = p_new_teacher_id where id = p_session_id returning * into v_session;
  elsif p_change_type = 'ACTUAL_TEACHER_CHANGED' then
    v_previous := v_session.actual_teacher_id;
    if v_previous = p_new_teacher_id then
      return v_session;
    end if;
    update public.sessions set actual_teacher_id = p_new_teacher_id where id = p_session_id returning * into v_session;
  else
    raise exception 'INVALID_CHANGE_TYPE: tipo de cambio no reconocido' using errcode = 'P0001';
  end if;

  insert into public.session_teacher_changes (session_id, change_type, previous_teacher_id, new_teacher_id, changed_by, reason)
  values (p_session_id, p_change_type, v_previous, p_new_teacher_id, v_caller_id, p_reason);

  return v_session;
end;
$$;

revoke all on function public.change_session_teacher(bigint, public.session_teacher_change_type, uuid, text) from public, anon;
grant execute on function public.change_session_teacher(bigint, public.session_teacher_change_type, uuid, text) to authenticated;

-- ============================================================================================
-- 5. reschedule_session
-- ============================================================================================

create or replace function public.reschedule_session(
  p_session_id bigint,
  p_new_scheduled_start timestamptz,
  p_new_scheduled_end timestamptz,
  p_new_scheduled_teacher_id uuid default null,
  p_reason text default null
)
returns public.sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid := (select auth.uid());
  v_caller_role public.user_role;
  v_original public.sessions;
  v_existing_child public.sessions;
  v_new_teacher uuid;
  v_new_session public.sessions;
begin
  if v_caller_id is null then
    raise exception 'UNAUTHENTICATED: no autenticado' using errcode = '28000';
  end if;

  select role into v_caller_role from public.profiles where id = v_caller_id;

  select * into v_original from public.sessions where id = p_session_id for update;
  if not found then
    raise exception 'SESSION_NOT_FOUND: sesion % no existe', p_session_id using errcode = 'P0002';
  end if;

  if v_caller_role = 'admin' then
    null;
  elsif v_caller_role = 'teacher' then
    if v_caller_id <> v_original.scheduled_teacher_id
       and v_caller_id <> coalesce(v_original.actual_teacher_id, v_original.scheduled_teacher_id) then
      raise exception 'NOT_AUTHORIZED: no eres el docente de esta sesion' using errcode = '42501';
    end if;
  else
    raise exception 'NOT_AUTHORIZED: rol % no puede reprogramar sesiones', v_caller_role using errcode = '42501';
  end if;

  -- Idempotencia: ya reprogramada -> devolver la sesion hija existente
  if v_original.status = 'rescheduled' then
    select * into v_existing_child from public.sessions where rescheduled_from_session_id = p_session_id;
    if found then
      return v_existing_child;
    end if;
    raise exception 'INVALID_SESSION_STATUS: la sesion ya fue reprogramada pero no se encontro la sesion nueva' using errcode = 'P0001';
  end if;

  if v_original.status <> 'scheduled' then
    raise exception 'INVALID_SESSION_STATUS: la sesion no esta en estado scheduled (actual: %)', v_original.status using errcode = 'P0001';
  end if;

  if p_new_scheduled_end <= p_new_scheduled_start then
    raise exception 'INVALID_TIME_RANGE: scheduled_end debe ser mayor que scheduled_start' using errcode = 'P0001';
  end if;

  v_new_teacher := coalesce(p_new_scheduled_teacher_id, v_original.scheduled_teacher_id);
  if not exists (select 1 from public.teacher_profiles where profile_id = v_new_teacher and status = 'active') then
    raise exception 'TEACHER_INACTIVE: el docente % no esta activo', v_new_teacher using errcode = 'P0001';
  end if;

  update public.sessions
  set status = 'rescheduled'
  where id = p_session_id;

  update public.session_attendance
  set status = 'rescheduled'
  where session_id = p_session_id
    and status not in ('rescheduled', 'cancelled');

  insert into public.sessions (
    classroom_id, scheduled_teacher_id, scheduled_start, scheduled_end,
    status, rescheduled_from_session_id, notes
  ) values (
    v_original.classroom_id, v_new_teacher, p_new_scheduled_start, p_new_scheduled_end,
    'scheduled', p_session_id, p_reason
  )
  returning * into v_new_session;

  return v_new_session;
end;
$$;

revoke all on function public.reschedule_session(bigint, timestamptz, timestamptz, uuid, text) from public, anon;
grant execute on function public.reschedule_session(bigint, timestamptz, timestamptz, uuid, text) to authenticated;

-- ============================================================================================
-- 6. set_student_session_billing
-- ============================================================================================

create or replace function public.set_student_session_billing(
  p_session_id bigint,
  p_student_id uuid,
  p_attendance_status public.attendance_status,
  p_minutes_charged integer,
  p_notes text default null
)
returns table(attendance_id bigint, minutes_charged integer, movement_ids bigint[])
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_caller_id uuid := (select auth.uid());
  v_caller_role public.user_role;
  v_session public.sessions;
  v_attendance public.session_attendance;
  v_previous_minutes integer;
  v_pending integer;
  v_movement_ids bigint[] := '{}';
  v_pkg record;
  v_remaining integer;
  v_alloc integer;
  v_new_movement_id bigint;
  v_rev record;
begin
  if v_caller_id is null then
    raise exception 'UNAUTHENTICATED: no autenticado' using errcode = '28000';
  end if;

  select role into v_caller_role from public.profiles where id = v_caller_id;
  if v_caller_role <> 'admin' then
    raise exception 'NOT_AUTHORIZED: solo admin decide la facturacion de una asistencia' using errcode = '42501';
  end if;

  select * into v_session from public.sessions where id = p_session_id;
  if not found then
    raise exception 'SESSION_NOT_FOUND: sesion % no existe', p_session_id using errcode = 'P0002';
  end if;

  if v_session.status not in ('completed', 'cancelled') then
    raise exception 'INVALID_SESSION_STATUS: la sesion debe estar completed o cancelled (actual: %)', v_session.status using errcode = 'P0001';
  end if;

  if p_minutes_charged < 0 then
    raise exception 'INVALID_MINUTES: minutes_charged no puede ser negativo' using errcode = 'P0001';
  end if;

  -- La fila DEBE existir ya (creada por initialize_session_attendance). Esta funcion ya no
  -- crea asistencia implicitamente (corregido en esta revision).
  select * into v_attendance
  from public.session_attendance
  where session_id = p_session_id and student_id = p_student_id
  for update;

  if not found then
    raise exception 'ATTENDANCE_NOT_FOUND: no existe asistencia para esta sesion y estudiante; llamar initialize_session_attendance primero' using errcode = 'P0002';
  end if;

  v_previous_minutes := v_attendance.minutes_charged;

  -- Idempotencia: misma decision ya tomada -> no-op
  if v_previous_minutes is not null
     and v_previous_minutes = p_minutes_charged
     and v_attendance.status = p_attendance_status then
    return query
      select v_attendance.id, v_attendance.minutes_charged,
             array(select id from public.hours_movements where session_attendance_id = v_attendance.id);
    return;
  end if;

  -- Correccion: ya habia una decision de consumo distinta -> revertir el NETO ya aplicado por
  -- paquete antes de reaplicar. Nunca se edita/borra un movimiento existente (ledger
  -- append-only). Importante: se agrupa y suma TODO lo ya ligado a esta asistencia (consumos +
  -- ajustes previos), no solo los `consumption` originales — de lo contrario, una segunda
  -- correccion sobre la misma asistencia volveria a reversar movimientos que una correccion
  -- anterior ya habia dejado en neto cero, duplicando el efecto.
  if v_previous_minutes is not null and v_previous_minutes > 0 then
    for v_rev in
      select hm.package_id, sum(hm.minutes_delta) as net_minutes
      from public.hours_movements hm
      where hm.session_attendance_id = v_attendance.id
      group by hm.package_id
      having sum(hm.minutes_delta) <> 0
    loop
      insert into public.hours_movements (student_id, package_id, session_attendance_id, movement_type, minutes_delta, created_by, notes)
      values (p_student_id, v_rev.package_id, v_attendance.id, 'adjustment', -v_rev.net_minutes, v_caller_id, 'reversion neta por correccion de set_student_session_billing')
      returning id into v_new_movement_id;
      v_movement_ids := array_append(v_movement_ids, v_new_movement_id);

      update public.hours_packages
      set status = 'active'
      where id = v_rev.package_id and status = 'exhausted';
    end loop;
  end if;

  -- FIFO: solo si hay minutos que cobrar. Todo en minutos enteros, sin conversion a horas.
  if p_minutes_charged > 0 then
    v_pending := p_minutes_charged;

    for v_pkg in
      select id, purchased_at
      from public.hours_packages
      where student_id = p_student_id
        and status = 'active'
        and (expires_at is null or expires_at > now())
      order by purchased_at asc
      for update
    loop
      exit when v_pending = 0;

      select coalesce(sum(minutes_delta), 0) into v_remaining
      from public.hours_movements
      where package_id = v_pkg.id;

      if v_remaining <= 0 then
        continue;
      end if;

      v_alloc := least(v_pending, v_remaining);

      insert into public.hours_movements (student_id, package_id, session_attendance_id, movement_type, minutes_delta, created_by, notes)
      values (p_student_id, v_pkg.id, v_attendance.id, 'consumption', -v_alloc, v_caller_id, p_notes)
      returning id into v_new_movement_id;
      v_movement_ids := array_append(v_movement_ids, v_new_movement_id);

      if v_remaining - v_alloc <= 0 then
        update public.hours_packages set status = 'exhausted' where id = v_pkg.id;
      end if;

      v_pending := v_pending - v_alloc;
    end loop;

    -- Si no alcanza, se aborta: Postgres revierte automaticamente TODO lo escrito en esta
    -- invocacion (incluidas las reversiones de arriba), sin necesidad de un rollback manual.
    if v_pending > 0 then
      raise exception 'INSUFFICIENT_BALANCE: saldo insuficiente, faltan % minutos', v_pending using errcode = 'P0001';
    end if;
  end if;

  update public.session_attendance
  set status = p_attendance_status,
      minutes_charged = p_minutes_charged,
      decided_by = v_caller_id,
      decided_at = now()
  where id = v_attendance.id
  returning * into v_attendance;

  return query select v_attendance.id, v_attendance.minutes_charged, v_movement_ids;
end;
$$;

revoke all on function public.set_student_session_billing(bigint, uuid, public.attendance_status, integer, text) from public, anon;
grant execute on function public.set_student_session_billing(bigint, uuid, public.attendance_status, integer, text) to authenticated;

-- ============================================================================================
-- 7. create_hour_package
-- ============================================================================================

create or replace function public.create_hour_package(
  p_student_id uuid,
  p_package_label text,
  p_total_minutes integer,
  p_price numeric(10,2),
  p_payment_method text,
  p_idempotency_key uuid,
  p_currency text default 'PEN',
  p_payment_reference text default null
)
returns table(payment_id bigint, package_id bigint, movement_id bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid := (select auth.uid());
  v_caller_role public.user_role;
  v_existing_payment_id bigint;
  v_existing_package_id bigint;
  v_existing_movement_id bigint;
  v_payment_id bigint;
  v_package_id bigint;
  v_movement_id bigint;
begin
  if v_caller_id is null then
    raise exception 'UNAUTHENTICATED: no autenticado' using errcode = '28000';
  end if;

  select role into v_caller_role from public.profiles where id = v_caller_id;
  if v_caller_role <> 'admin' then
    raise exception 'NOT_AUTHORIZED: solo admin puede registrar paquetes de horas' using errcode = '42501';
  end if;

  if p_idempotency_key is null then
    raise exception 'INVALID_IDEMPOTENCY_KEY: p_idempotency_key es obligatorio' using errcode = 'P0001';
  end if;

  if not exists (select 1 from public.profiles where id = p_student_id and role = 'student' and status = 'active') then
    raise exception 'STUDENT_NOT_FOUND: estudiante % no existe o no esta activo', p_student_id using errcode = 'P0002';
  end if;

  if p_total_minutes <= 0 then
    raise exception 'INVALID_AMOUNT: total_minutes debe ser positivo' using errcode = 'P0001';
  end if;
  if p_price < 0 then
    raise exception 'INVALID_AMOUNT: price no puede ser negativo' using errcode = 'P0001';
  end if;

  -- Idempotencia por idempotency_key (UNIQUE NOT NULL en 0007) — NO por `reference`, que puede
  -- ser NULL en registros manuales y por lo tanto no sirve para detectar retries de forma
  -- confiable. `reference` sigue siendo solo la referencia real del medio de pago.
  select sp.id into v_existing_payment_id
  from public.student_payments sp
  where sp.idempotency_key = p_idempotency_key;

  if found then
    select hp.id into v_existing_package_id from public.hours_packages hp where hp.payment_id = v_existing_payment_id;
    select hm.id into v_existing_movement_id from public.hours_movements hm
      where hm.package_id = v_existing_package_id and hm.movement_type = 'purchase';
    return query select v_existing_payment_id, v_existing_package_id, v_existing_movement_id;
    return;
  end if;

  insert into public.student_payments (student_id, amount, currency, payment_method, status, paid_at, reference, idempotency_key)
  values (p_student_id, p_price, p_currency, p_payment_method, 'completed', now(), p_payment_reference, p_idempotency_key)
  returning id into v_payment_id;

  insert into public.hours_packages (student_id, package_label, total_minutes, price_paid, payment_id, status)
  values (p_student_id, p_package_label, p_total_minutes, p_price, v_payment_id, 'active')
  returning id into v_package_id;

  insert into public.hours_movements (student_id, package_id, movement_type, minutes_delta, created_by, notes)
  values (p_student_id, v_package_id, 'purchase', p_total_minutes, v_caller_id, 'compra de paquete')
  returning id into v_movement_id;

  return query select v_payment_id, v_package_id, v_movement_id;
end;
$$;

revoke all on function public.create_hour_package(uuid, text, integer, numeric, text, uuid, text, text) from public, anon;
grant execute on function public.create_hour_package(uuid, text, integer, numeric, text, uuid, text, text) to authenticated;

-- ============================================================================================
-- 8. promote_user_to_teacher
-- ============================================================================================

create or replace function public.promote_user_to_teacher(
  p_target_profile_id uuid,
  p_initial_hourly_rate numeric(10,2)
)
returns table(profile public.profiles, teacher_profile public.teacher_profiles)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_caller_id uuid := (select auth.uid());
  v_caller_role public.user_role;
  v_target public.profiles;
  v_old_role public.user_role;
  v_teacher_profile public.teacher_profiles;
  v_role_changed boolean := false;
begin
  if v_caller_id is null then
    raise exception 'UNAUTHENTICATED: no autenticado' using errcode = '28000';
  end if;

  select role into v_caller_role from public.profiles where id = v_caller_id;
  if v_caller_role <> 'admin' then
    raise exception 'NOT_AUTHORIZED: solo admin puede promover usuarios a docente' using errcode = '42501';
  end if;

  select * into v_target from public.profiles where id = p_target_profile_id for update;
  if not found then
    raise exception 'PROFILE_NOT_FOUND: perfil % no existe', p_target_profile_id using errcode = 'P0002';
  end if;

  if v_target.status <> 'active' then
    raise exception 'PROFILE_INACTIVE: el perfil % no esta activo', p_target_profile_id using errcode = 'P0001';
  end if;

  if v_target.role = 'admin' then
    raise exception 'ADMIN_CANNOT_BE_CONVERTED: no se puede convertir un admin en docente' using errcode = 'P0001';
  end if;

  if p_initial_hourly_rate < 0 then
    raise exception 'INVALID_RATE: la tarifa no puede ser negativa' using errcode = 'P0001';
  end if;

  v_old_role := v_target.role;

  if v_target.role <> 'teacher' then
    update public.profiles set role = 'teacher' where id = p_target_profile_id returning * into v_target;
    v_role_changed := true;
  end if;

  select * into v_teacher_profile from public.teacher_profiles where profile_id = p_target_profile_id;
  if not found then
    insert into public.teacher_profiles (profile_id, hourly_rate, status)
    values (p_target_profile_id, p_initial_hourly_rate, 'active')
    returning * into v_teacher_profile;
  end if;

  if v_role_changed then
    insert into public.role_changes (profile_id, previous_role, new_role, changed_by)
    values (p_target_profile_id, v_old_role, 'teacher', v_caller_id);
  end if;

  return query select v_target, v_teacher_profile;
end;
$$;

revoke all on function public.promote_user_to_teacher(uuid, numeric) from public, anon;
grant execute on function public.promote_user_to_teacher(uuid, numeric) to authenticated;

-- ============================================================================================
-- 9. create_teacher_payment_period
-- ============================================================================================

create or replace function public.create_teacher_payment_period(
  p_teacher_id uuid,
  p_period_start date,
  p_period_end date
)
returns public.teacher_payment_periods
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_caller_id uuid := (select auth.uid());
  v_caller_role public.user_role;
  v_period public.teacher_payment_periods;
  v_ids bigint[];
  v_total_minutes integer;
  v_total_amount numeric(10,2);
begin
  if v_caller_id is null then
    raise exception 'UNAUTHENTICATED: no autenticado' using errcode = '28000';
  end if;

  select role into v_caller_role from public.profiles where id = v_caller_id;
  if v_caller_role <> 'admin' then
    raise exception 'NOT_AUTHORIZED: solo admin puede crear periodos de pago' using errcode = '42501';
  end if;

  if p_period_end < p_period_start then
    raise exception 'INVALID_DATE_RANGE: period_end debe ser mayor o igual a period_start' using errcode = 'P0001';
  end if;

  if not exists (select 1 from public.teacher_profiles where profile_id = p_teacher_id and status = 'active') then
    raise exception 'TEACHER_NOT_FOUND: docente % no existe o no esta activo', p_teacher_id using errcode = 'P0002';
  end if;

  -- Idempotencia por identidad natural: (teacher_id, period_start, period_end) es UNIQUE en
  -- 0008. Un retry con el mismo docente y rango debe devolver el periodo ya existente, sin
  -- volver a procesar elegibilidad ni crear un periodo vacio o duplicado.
  select * into v_period
  from public.teacher_payment_periods
  where teacher_id = p_teacher_id
    and period_start = p_period_start
    and period_end = p_period_end;

  if found then
    return v_period;
  end if;

  -- Elegibilidad + lock: solo horas del docente, no asignadas todavia a ningun periodo, dentro
  -- del rango. La condicion "teacher_payment_period_id is null" es, por construccion, lo que
  -- evita que una misma hora entre en dos periodos (una segunda llamada no vuelve a verla).
  -- Nota: FOR UPDATE no puede combinarse con una funcion de agregacion (array_agg) en el mismo
  -- SELECT. Se usa el constructor array(subquery ... for update) en su lugar, que si es valido
  -- porque la subquery no esta agregada (array() no es una funcion de agregacion).
  v_ids := array(
    select thl.id
    from public.teacher_hours_log thl
    where thl.teacher_id = p_teacher_id
      and thl.teacher_payment_period_id is null
      and thl.created_at::date between p_period_start and p_period_end
    for update of thl
  );

  if v_ids is null or array_length(v_ids, 1) is null then
    raise exception 'NO_ELIGIBLE_HOURS: no hay horas dictadas elegibles para % en el rango indicado', p_teacher_id using errcode = 'P0001';
  end if;

  select coalesce(sum(billable_minutes), 0), coalesce(sum(amount), 0)
  into v_total_minutes, v_total_amount
  from public.teacher_hours_log
  where id = any(v_ids);

  insert into public.teacher_payment_periods (teacher_id, period_start, period_end, total_minutes, total_amount, status)
  values (p_teacher_id, p_period_start, p_period_end, v_total_minutes, v_total_amount, 'pending')
  returning * into v_period;

  update public.teacher_hours_log
  set teacher_payment_period_id = v_period.id
  where id = any(v_ids);

  return v_period;
end;
$$;

revoke all on function public.create_teacher_payment_period(uuid, date, date) from public, anon;
grant execute on function public.create_teacher_payment_period(uuid, date, date) to authenticated;

-- ============================================================================================
-- 10. upload_teacher_receipt
-- ============================================================================================

create or replace function public.upload_teacher_receipt(
  p_teacher_payment_period_id bigint,
  p_file_path text
)
returns table(period public.teacher_payment_periods, receipt_id bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid := (select auth.uid());
  v_caller_role public.user_role;
  v_period public.teacher_payment_periods;
  v_receipt_id bigint;
  v_expected_prefix text;
begin
  if v_caller_id is null then
    raise exception 'UNAUTHENTICATED: no autenticado' using errcode = '28000';
  end if;

  select role into v_caller_role from public.profiles where id = v_caller_id;

  select * into v_period from public.teacher_payment_periods where id = p_teacher_payment_period_id for update;
  if not found then
    raise exception 'PERIOD_NOT_FOUND: periodo % no existe', p_teacher_payment_period_id using errcode = 'P0002';
  end if;

  if v_caller_role = 'admin' then
    null;
  elsif v_caller_role = 'teacher' then
    if v_caller_id <> v_period.teacher_id then
      raise exception 'NOT_AUTHORIZED: no eres el dueno de este periodo' using errcode = '42501';
    end if;
  else
    raise exception 'NOT_AUTHORIZED: rol % no puede subir recibos', v_caller_role using errcode = '42501';
  end if;

  if v_period.status not in ('pending', 'pending_receipt', 'receipt_uploaded') then
    raise exception 'PERIOD_ALREADY_REVIEWED: el periodo ya fue aprobado o pagado' using errcode = 'P0001';
  end if;

  -- Validacion de forma de la ruta (defensa en profundidad; la policy real de Storage,
  -- pendiente en 0010, debe reforzar lo mismo de forma independiente).
  v_expected_prefix := 'receipts/' || v_period.teacher_id::text || '/' || p_teacher_payment_period_id::text || '/';
  if position(v_expected_prefix in p_file_path) <> 1 then
    raise exception 'INVALID_FILE_PATH: la ruta % no corresponde al docente/periodo esperado', p_file_path using errcode = 'P0001';
  end if;

  -- Un solo recibo VIGENTE por periodo (UNIQUE(teacher_payment_period_id) en 0008). Mientras el
  -- periodo no este approved/paid (ya descartado arriba), el docente puede reemplazar el recibo
  -- existente: upsert sobre esa unicidad, no insert-siempre. Idempotente por construccion (mismo
  -- o distinto file_path, el resultado final es una unica fila consistente con el ultimo envio).
  insert into public.teacher_receipts (teacher_id, teacher_payment_period_id, file_path, uploaded_at)
  values (v_period.teacher_id, p_teacher_payment_period_id, p_file_path, now())
  on conflict (teacher_payment_period_id) do update
    set file_path = excluded.file_path,
        uploaded_at = excluded.uploaded_at,
        teacher_id = excluded.teacher_id
  returning id into v_receipt_id;

  if v_period.status in ('pending', 'pending_receipt') then
    update public.teacher_payment_periods
    set status = 'receipt_uploaded'
    where id = p_teacher_payment_period_id
    returning * into v_period;
  end if;

  return query select v_period, v_receipt_id;
end;
$$;

revoke all on function public.upload_teacher_receipt(bigint, text) from public, anon;
grant execute on function public.upload_teacher_receipt(bigint, text) to authenticated;

-- ============================================================================================
-- 11. approve_teacher_payment_period
-- ============================================================================================

create or replace function public.approve_teacher_payment_period(
  p_teacher_payment_period_id bigint
)
returns public.teacher_payment_periods
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_caller_id uuid := (select auth.uid());
  v_caller_role public.user_role;
  v_period public.teacher_payment_periods;
begin
  if v_caller_id is null then
    raise exception 'UNAUTHENTICATED: no autenticado' using errcode = '28000';
  end if;

  select role into v_caller_role from public.profiles where id = v_caller_id;
  if v_caller_role <> 'admin' then
    raise exception 'NOT_AUTHORIZED: solo admin puede aprobar periodos de pago' using errcode = '42501';
  end if;

  select * into v_period from public.teacher_payment_periods where id = p_teacher_payment_period_id for update;
  if not found then
    raise exception 'PERIOD_NOT_FOUND: periodo % no existe', p_teacher_payment_period_id using errcode = 'P0002';
  end if;

  if v_period.status = 'approved' then
    return v_period;
  end if;

  if v_period.status = 'paid' then
    raise exception 'ALREADY_PAID: el periodo ya fue pagado' using errcode = 'P0001';
  end if;

  if v_period.status <> 'receipt_uploaded' then
    raise exception 'MISSING_RECEIPT: el periodo no tiene un recibo subido todavia' using errcode = 'P0001';
  end if;

  if not exists (select 1 from public.teacher_receipts where teacher_payment_period_id = p_teacher_payment_period_id) then
    raise exception 'MISSING_RECEIPT: no se encontro ningun recibo para este periodo' using errcode = 'P0001';
  end if;

  update public.teacher_payment_periods
  set status = 'approved'
  where id = p_teacher_payment_period_id
  returning * into v_period;

  return v_period;
end;
$$;

revoke all on function public.approve_teacher_payment_period(bigint) from public, anon;
grant execute on function public.approve_teacher_payment_period(bigint) to authenticated;

-- ============================================================================================
-- 12. mark_teacher_payment_period_paid
-- ============================================================================================

create or replace function public.mark_teacher_payment_period_paid(
  p_teacher_payment_period_id bigint,
  p_paid_at timestamptz default now()
)
returns public.teacher_payment_periods
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_caller_id uuid := (select auth.uid());
  v_caller_role public.user_role;
  v_period public.teacher_payment_periods;
begin
  if v_caller_id is null then
    raise exception 'UNAUTHENTICATED: no autenticado' using errcode = '28000';
  end if;

  select role into v_caller_role from public.profiles where id = v_caller_id;
  if v_caller_role <> 'admin' then
    raise exception 'NOT_AUTHORIZED: solo admin puede marcar un periodo como pagado' using errcode = '42501';
  end if;

  select * into v_period from public.teacher_payment_periods where id = p_teacher_payment_period_id for update;
  if not found then
    raise exception 'PERIOD_NOT_FOUND: periodo % no existe', p_teacher_payment_period_id using errcode = 'P0002';
  end if;

  -- Idempotente: no se sobrescribe paid_at si ya estaba pagado.
  if v_period.status = 'paid' then
    return v_period;
  end if;

  if v_period.status <> 'approved' then
    raise exception 'NOT_APPROVED: el periodo debe estar aprobado antes de marcarse como pagado' using errcode = 'P0001';
  end if;

  update public.teacher_payment_periods
  set status = 'paid', paid_at = p_paid_at
  where id = p_teacher_payment_period_id
  returning * into v_period;

  return v_period;
end;
$$;

revoke all on function public.mark_teacher_payment_period_paid(bigint, timestamptz) from public, anon;
grant execute on function public.mark_teacher_payment_period_paid(bigint, timestamptz) to authenticated;
