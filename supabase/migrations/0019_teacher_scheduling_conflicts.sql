-- Dominio: cierre server-side del invariante de disponibilidad/conflictos docentes (MVP)
-- Depende de: 0003 (teacher_availability), 0005 (classroom_teachers), 0006 (class_schedules,
--             sessions), 0009 (change_session_teacher, reschedule_session), 0015
--             (assign_classroom_primary_teacher)
--
-- Contexto: la UI Vite ya calcula "elegible" (disponibilidad completa + sin conflicto) para
-- decidir qué mostrar/habilitar como docente titular (frontend-vite/src/server/scheduling/
-- compatibility.ts), pero esa validación es SOLO client-side -- confirmado en la auditoría previa:
-- una llamada directa a assign_classroom_primary_teacher con un docente en conflicto real se
-- ejecuta sin ningún error. Esta migración cierra ese hueco, y los mismos huecos en
-- class_schedules (cambiar el horario del salón después de asignar), reschedule_session y
-- change_session_teacher, con la MISMA regla de negocio en los cuatro puntos de entrada.
--
-- Regla de negocio (única, igual que en el frontend, ver compatibility.ts):
--   cobertura: existe un bloque de teacher_availability del mismo día con
--              start_time <= requested.start_time AND end_time >= requested.end_time
--   conflicto: requested.start < existing.end AND requested.end > existing.start (mismo día)
--   adyacente (fin de uno = inicio del otro) NO es conflicto.
--
-- Dos helpers pequeños en `private` (nunca expuestos vía PostgREST -- private no es un schema
-- API) centralizan esa regla, reutilizados por los cuatro flujos en vez de reimplementar el
-- solape/cobertura cuatro veces (punto 5 del pedido):
--
--   private.validate_teacher_weekly_block(...) -- validación de PATRÓN SEMANAL, usada por
--     assign_classroom_primary_teacher (valida cada class_schedule activo del salón) y por el
--     trigger nuevo sobre class_schedules (valida la fila que se inserta/activa/edita). "Ocupado"
--     = otros class_schedules activos de OTROS salones donde el docente ya es PRIMARY activo, MÁS
--     sessions 'scheduled' futuras del docente cuyo día/hora local (America/Lima) se solape --
--     exactamente las dos fuentes que ya usa compatibility.ts en Vite, nada nuevo inventado.
--
--   private.validate_teacher_session_slot(...) -- validación de INSTANTE CONCRETO, usada por
--     reschedule_session y change_session_teacher(SCHEDULED_TEACHER_CHANGED). "Ocupado" = otras
--     sessions 'scheduled'/'completed' del MISMO docente cuyo [scheduled_start, scheduled_end) se
--     solape con el nuevo instante -- comparación directa de timestamptz (más precisa para una
--     fecha concreta que reducir a día/hora). 'cancelled' y 'rescheduled' nunca cuentan como
--     ocupación: reschedule_session (0009) marca la sesión ORIGINAL como 'rescheduled' y crea una
--     hija 'scheduled' -- si 'rescheduled' contara como ocupado, la sesión original produciría un
--     falso conflicto contra sí misma para siempre. Se excluye además explícitamente la sesión que
--     se está reprogramando/reasignando (p_exclude_session_id).
--
-- Ambos helpers son SECURITY DEFINER: reschedule_session puede ser llamado por el propio docente
-- (no solo admin, ver 0009) -- bajo su propio RLS un docente NO puede leer teacher_availability ni
-- sessions de OTROS docentes (teacher_availability_owner, sessions_select en 0003/0006), lo que
-- produciría falsos negativos (conflictos reales invisibles) si el helper corriera SECURITY
-- INVOKER. Mismo patrón que private.can_access_classroom (0005): revocado de public/anon/
-- authenticated y otorgado solo a authenticated -- nunca alcanzable como RPC propio (private no es
-- un schema expuesto).
--
-- Fuera de alcance (deliberado, ver auditoría): no se cambia el modelo de tablas, no se debilita
-- ninguna RLS, no se expone service_role, no se toca paquetes/hours_movements/student_payments/
-- payroll/attendance-billing/contenido/Auth. change_session_teacher(ACTUAL_TEACHER_CHANGED) (la
-- corrección de quién dictó realmente una clase, usada por start_session) NO se valida aquí a
-- propósito: es una corrección administrativa de un hecho ya ocurrido/en curso, no una decisión de
-- programación futura -- y el único caller real en todo el código (frontend + start_session) usa
-- siempre 'SCHEDULED_TEACHER_CHANGED' para reasignaciones, confirmado por auditoría de código.

-- ============================================================================================
-- 1) Helpers de validación (privados, reutilizados por los 4 puntos de entrada)
-- ============================================================================================

create or replace function private.validate_teacher_weekly_block(
  p_teacher_id uuid,
  p_day_of_week smallint,
  p_start_time time,
  p_end_time time,
  p_exclude_classroom_id bigint default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_has_any_availability boolean;
  v_covered boolean;
  v_conflict boolean;
begin
  select exists (
    select 1 from public.teacher_availability a where a.teacher_id = p_teacher_id
  ) into v_has_any_availability;

  select exists (
    select 1 from public.teacher_availability a
    where a.teacher_id = p_teacher_id
      and a.day_of_week = p_day_of_week
      and a.start_time <= p_start_time
      and a.end_time >= p_end_time
  ) into v_covered;

  if not v_covered then
    if not v_has_any_availability then
      raise exception 'NO_AVAILABILITY: el docente no tiene disponibilidad registrada' using errcode = 'P0001';
    else
      raise exception 'INSUFFICIENT_AVAILABILITY: la disponibilidad del docente no cubre el horario solicitado' using errcode = 'P0001';
    end if;
  end if;

  -- Fuente 1: otros class_schedules activos de OTRO salón donde el docente ya es PRIMARY activo.
  select exists (
    select 1
    from public.class_schedules cs
    join public.classroom_teachers ct
      on ct.classroom_id = cs.classroom_id
     and ct.teacher_id = p_teacher_id
     and ct.teacher_role = 'PRIMARY'
     and ct.status = 'active'
    where cs.is_active = true
      and cs.day_of_week = p_day_of_week
      and (p_exclude_classroom_id is null or cs.classroom_id <> p_exclude_classroom_id)
      and p_start_time < cs.end_time
      and p_end_time > cs.start_time
  ) into v_conflict;

  if not v_conflict then
    -- Fuente 2: sessions 'scheduled' futuras del docente cuyo día/hora local (America/Lima) se
    -- solape con el bloque semanal solicitado -- mismo criterio que compatibility.ts (Vite).
    select exists (
      select 1 from public.sessions s
      where s.scheduled_teacher_id = p_teacher_id
        and s.status = 'scheduled'
        and (p_exclude_classroom_id is null or s.classroom_id <> p_exclude_classroom_id)
        and extract(dow from (s.scheduled_start at time zone 'America/Lima'))::smallint = p_day_of_week
        and p_start_time < (s.scheduled_end at time zone 'America/Lima')::time
        and p_end_time > (s.scheduled_start at time zone 'America/Lima')::time
    ) into v_conflict;
  end if;

  if v_conflict then
    raise exception 'SCHEDULE_CONFLICT: el docente ya tiene un compromiso que se solapa con este horario' using errcode = 'P0001';
  end if;
end;
$$;

revoke all on function private.validate_teacher_weekly_block(uuid, smallint, time, time, bigint) from public, anon, authenticated;
grant execute on function private.validate_teacher_weekly_block(uuid, smallint, time, time, bigint) to authenticated;

create or replace function private.validate_teacher_session_slot(
  p_teacher_id uuid,
  p_start timestamptz,
  p_end timestamptz,
  p_exclude_session_id bigint default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_day smallint;
  v_start_time time;
  v_end_time time;
  v_has_any_availability boolean;
  v_covered boolean;
  v_conflict boolean;
begin
  v_day := extract(dow from (p_start at time zone 'America/Lima'))::smallint;
  v_start_time := (p_start at time zone 'America/Lima')::time;
  v_end_time := (p_end at time zone 'America/Lima')::time;

  select exists (
    select 1 from public.teacher_availability a where a.teacher_id = p_teacher_id
  ) into v_has_any_availability;

  select exists (
    select 1 from public.teacher_availability a
    where a.teacher_id = p_teacher_id
      and a.day_of_week = v_day
      and a.start_time <= v_start_time
      and a.end_time >= v_end_time
  ) into v_covered;

  if not v_covered then
    if not v_has_any_availability then
      raise exception 'NO_AVAILABILITY: el docente no tiene disponibilidad registrada' using errcode = 'P0001';
    else
      raise exception 'INSUFFICIENT_AVAILABILITY: la disponibilidad del docente no cubre el horario solicitado' using errcode = 'P0001';
    end if;
  end if;

  -- 'cancelled'/'rescheduled' no representan ocupación real (ver nota de cabecera) -- solo
  -- 'scheduled'/'completed' cuentan.
  select exists (
    select 1 from public.sessions s
    where s.scheduled_teacher_id = p_teacher_id
      and s.status in ('scheduled', 'completed')
      and (p_exclude_session_id is null or s.id <> p_exclude_session_id)
      and p_start < s.scheduled_end
      and p_end > s.scheduled_start
  ) into v_conflict;

  if v_conflict then
    raise exception 'SCHEDULE_CONFLICT: el docente ya tiene otra sesión que se solapa con este horario' using errcode = 'P0001';
  end if;
end;
$$;

revoke all on function private.validate_teacher_session_slot(uuid, timestamptz, timestamptz, bigint) from public, anon, authenticated;
grant execute on function private.validate_teacher_session_slot(uuid, timestamptz, timestamptz, bigint) to authenticated;

-- ============================================================================================
-- 2) assign_classroom_primary_teacher -- valida TODOS los class_schedules activos del salón
-- ============================================================================================
-- Mismo cuerpo que 0015, con un solo bloque nuevo: antes de la asignación, valida el bloque
-- semanal candidato contra CADA class_schedule activo del salón (si no hay ninguno activo, el
-- loop no itera y no hay nada que validar -- igual que hoy la UI oculta el selector hasta que
-- exista horario). SECURITY INVOKER sin cambios: el admin llamante ya tiene los privilegios
-- necesarios vía su propia policy, y el helper (SECURITY DEFINER) no depende de eso de todas
-- formas.
create or replace function public.assign_classroom_primary_teacher(p_classroom_id bigint, p_teacher_id uuid)
returns public.classroom_teachers
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_caller_id uuid := (select auth.uid());
  v_caller_role public.user_role;
  v_teacher_status text;
  v_row public.classroom_teachers;
  v_schedule record;
begin
  if v_caller_id is null then
    raise exception 'UNAUTHENTICATED: no autenticado' using errcode = '28000';
  end if;

  select role into v_caller_role from public.profiles where id = v_caller_id;
  if v_caller_role <> 'admin' then
    raise exception 'NOT_AUTHORIZED: solo admin puede asignar el docente titular' using errcode = '42501';
  end if;

  if not exists (select 1 from public.classrooms where id = p_classroom_id) then
    raise exception 'CLASSROOM_NOT_FOUND: el salón % no existe', p_classroom_id using errcode = 'P0002';
  end if;

  select status into v_teacher_status from public.teacher_profiles where profile_id = p_teacher_id;
  if not found then
    raise exception 'TEACHER_NOT_FOUND: % no es un docente', p_teacher_id using errcode = 'P0002';
  end if;
  if v_teacher_status <> 'active' then
    raise exception 'TEACHER_INACTIVE: el docente no está activo' using errcode = 'P0001';
  end if;

  for v_schedule in
    select day_of_week, start_time, end_time
    from public.class_schedules
    where classroom_id = p_classroom_id and is_active = true
  loop
    perform private.validate_teacher_weekly_block(
      p_teacher_id, v_schedule.day_of_week, v_schedule.start_time, v_schedule.end_time, p_classroom_id
    );
  end loop;

  update public.classroom_teachers
    set status = 'inactive'
    where classroom_id = p_classroom_id
      and teacher_role = 'PRIMARY'
      and status = 'active'
      and teacher_id <> p_teacher_id;

  insert into public.classroom_teachers (classroom_id, teacher_id, teacher_role, status)
  values (p_classroom_id, p_teacher_id, 'PRIMARY', 'active')
  on conflict (classroom_id, teacher_id)
  do update set teacher_role = 'PRIMARY', status = 'active'
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.assign_classroom_primary_teacher(bigint, uuid) from public, anon;
grant execute on function public.assign_classroom_primary_teacher(bigint, uuid) to authenticated;

-- ============================================================================================
-- 3) class_schedules -- revalida al PRIMARY activo al crear/editar/activar un horario
-- ============================================================================================
-- Cierra el bypass descrito: asignar con horario válido y luego cambiar el horario del salón por
-- debajo. class_schedules_admin_write (0006) permite a admin INSERT/UPDATE directo desde el
-- cliente (browser-direct, sin RPC) -- por eso la protección tiene que vivir en un trigger, no en
-- una función que se pueda simplemente no llamar. Solo se dispara cuando la fila resultante queda
-- is_active = true (desactivar nunca reduce cobertura, siempre es seguro) y solo si el salón YA
-- tiene un PRIMARY activo (si no lo tiene todavía, no hay nada que proteger -- mismo criterio que
-- la UI). NO desasigna al docente, NO toca otros salones, NO reprograma sesiones -- solo rechaza
-- la escritura del horario cuando produciría disponibilidad insuficiente o conflicto.
create or replace function private.check_class_schedule_teacher_compatibility()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_primary_teacher uuid;
begin
  if not new.is_active then
    return new;
  end if;

  select teacher_id into v_primary_teacher
  from public.classroom_teachers
  where classroom_id = new.classroom_id
    and teacher_role = 'PRIMARY'
    and status = 'active'
  limit 1;

  if v_primary_teacher is null then
    return new;
  end if;

  perform private.validate_teacher_weekly_block(
    v_primary_teacher, new.day_of_week, new.start_time, new.end_time, new.classroom_id
  );

  return new;
end;
$$;

revoke all on function private.check_class_schedule_teacher_compatibility() from public, anon, authenticated;

create trigger class_schedules_check_primary_compatibility
  before insert or update of day_of_week, start_time, end_time, is_active on public.class_schedules
  for each row
  execute function private.check_class_schedule_teacher_compatibility();

-- ============================================================================================
-- 4) reschedule_session -- valida el nuevo instante contra el docente resultante
-- ============================================================================================
-- Mismo cuerpo que 0009, con un solo bloque nuevo justo antes de mutar datos: valida
-- disponibilidad + conflicto de v_new_teacher (el docente resultante, sea el mismo o uno nuevo
-- pasado en p_new_scheduled_teacher_id) contra el instante concreto [p_new_scheduled_start,
-- p_new_scheduled_end), excluyendo la sesión que se está reprogramando. Usa la fecha REAL de la
-- nueva sesión (no el patrón semanal del salón) vía validate_teacher_session_slot. SECURITY
-- DEFINER sin cambios (ya lo era: necesario para que el propio docente, con su RLS restringido,
-- pueda reprogramar su sesión).
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

  perform private.validate_teacher_session_slot(
    v_new_teacher, p_new_scheduled_start, p_new_scheduled_end, p_session_id
  );

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
-- 5) change_session_teacher -- valida SOLO SCHEDULED_TEACHER_CHANGED
-- ============================================================================================
-- Mismo cuerpo que 0009, con un solo bloque nuevo dentro de la rama SCHEDULED_TEACHER_CHANGED:
-- valida al nuevo docente contra el instante concreto YA programado de la sesión (scheduled_start/
-- scheduled_end), excluyendo la propia sesión. ACTUAL_TEACHER_CHANGED (corrección de quién dictó
-- realmente la clase) NO se valida a propósito -- ver nota de cabecera.
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
    perform private.validate_teacher_session_slot(
      p_new_teacher_id, v_session.scheduled_start, v_session.scheduled_end, p_session_id
    );
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
