-- Dominio: hardening del lifecycle de sesiones (auditoría post-implementación de asistencia/facturación)
-- Depende de: 0006 (sessions, session_attendance, classroom_students), 0009 (initialize_session_attendance,
-- complete_session originales)
--
-- Problema real encontrado: complete_session() exige actual_teacher_id IS NOT NULL, pero ese campo
-- se puede fijar por dos caminos -- start_session() (que SÍ llama initialize_session_attendance) o
-- change_session_teacher(ACTUAL_TEACHER_CHANGED) (que NO la llama). Una sesión completada por el
-- segundo camino queda sin ninguna fila en session_attendance, y como initialize_session_attendance
-- exige status='scheduled', ya no hay forma de generarla después -- set_student_session_billing
-- queda permanentemente inalcanzable (ATTENDANCE_NOT_FOUND) para esa sesión. El mismo hueco existía
-- en la cancelación, que hoy es un UPDATE directo desde el cliente (cancelSessionAction), sin
-- garantizar roster y sin bloqueo transaccional (select-then-update en dos round-trips, no
-- atómico).
--
-- Esta migración:
--   1) Endurece complete_session() reutilizando initialize_session_attendance() (sin duplicar su
--      INSERT) antes de marcar la sesión completed. Signature, autorización, locking, idempotencia,
--      cálculo de payroll docente: sin cambios de comportamiento externo.
--   2) Agrega cancel_session(bigint), nuevo RPC transaccional que sustituye el UPDATE directo:
--      admin-only, FOR UPDATE, solo desde scheduled, inicializa roster, idempotente.
--   3) Backfill conservador, una sola vez: rellena session_attendance para sesiones YA
--      completed/cancelled que hoy no tengan ninguna fila, únicamente para estudiantes
--      actualmente activos del salón. Nunca UPDATE ni DELETE de filas existentes.

-- ============================================================================================
-- 1. complete_session -- mismo signature/retorno, un único agregado: garantizar roster antes de
--    completar, reutilizando initialize_session_attendance (no se duplica su lógica).
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

  -- NUEVO (0018): garantiza el roster ANTES de completar -- actual_teacher_id puede haberse
  -- fijado vía change_session_teacher(ACTUAL_TEACHER_CHANGED) sin pasar nunca por start_session().
  -- Reutiliza initialize_session_attendance tal cual (idempotente por su propio
  -- ON CONFLICT (session_id, student_id) DO NOTHING): si el roster ya existe -- camino normal via
  -- start_session -- esto es un no-op total, cero filas nuevas, cero cambio de comportamiento.
  -- Sus propias precondiciones (status='scheduled', autorización admin/teacher=asignado) ya están
  -- garantizadas en este punto por las validaciones de arriba, así que nunca puede fallar acá.
  perform public.initialize_session_attendance(p_session_id);

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
-- 2. cancel_session -- nuevo. Sustituye el UPDATE directo (cancelSessionAction) por un RPC
--    transaccional: admin-only, FOR UPDATE, solo desde scheduled, garantiza roster, idempotente.
--    SECURITY INVOKER (no DEFINER): el caller ya se valida admin dentro del cuerpo, y
--    sessions_admin_write (RLS, 0006) ya permite el UPDATE a un admin real sin necesidad de
--    bypass -- mismo criterio que change_session_teacher (también admin-only, también INVOKER).
-- ============================================================================================

create or replace function public.cancel_session(
  p_session_id bigint
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
begin
  if v_caller_id is null then
    raise exception 'UNAUTHENTICATED: no autenticado' using errcode = '28000';
  end if;

  select role into v_caller_role from public.profiles where id = v_caller_id;
  if v_caller_role <> 'admin' then
    raise exception 'NOT_AUTHORIZED: solo admin puede cancelar sesiones' using errcode = '42501';
  end if;

  select * into v_session from public.sessions where id = p_session_id for update;
  if not found then
    raise exception 'SESSION_NOT_FOUND: sesion % no existe', p_session_id using errcode = 'P0002';
  end if;

  -- Idempotencia: ya cancelada -> no-op
  if v_session.status = 'cancelled' then
    return v_session;
  end if;

  if v_session.status <> 'scheduled' then
    raise exception 'INVALID_SESSION_STATUS: la sesion no esta en estado scheduled (actual: %)', v_session.status using errcode = 'P0001';
  end if;

  -- Mismo principio que en complete_session: garantizar roster ANTES de cerrar la sesión, para
  -- que set_student_session_billing (que ya acepta status='cancelled') nunca se tope con
  -- ATTENDANCE_NOT_FOUND. Idempotente, no-op si ya existe.
  perform public.initialize_session_attendance(p_session_id);

  update public.sessions
  set status = 'cancelled'
  where id = p_session_id
  returning * into v_session;

  return v_session;
end;
$$;

revoke all on function public.cancel_session(bigint) from public, anon;
grant execute on function public.cancel_session(bigint) to authenticated;

-- ============================================================================================
-- 3. Backfill conservador -- una sola vez, solo para sesiones YA completed/cancelled que hoy no
--    tengan NINGUNA fila en session_attendance. Nunca UPDATE ni DELETE de filas existentes
--    (ON CONFLICT DO NOTHING es la única garantía necesaria: por construcción no puede tocar una
--    fila que ya exista). Solo estudiantes actualmente activos en classroom_students -- no se
--    intenta reconstruir el roster histórico de alumnos que ya no están activos, por no haber
--    evidencia confiable de que estuvieran inscritos en el momento real de esa sesión.
--
--    IMPORTANTE (semántica, no solo para esta migración sino para cualquier lectura futura de
--    session_attendance): una fila con status='present' y minutes_charged IS NULL -- ya sea
--    creada por initialize_session_attendance en el flujo normal, o por este backfill -- NUNCA
--    representa una asistencia confirmada. Es únicamente el valor inicial técnico de la columna.
--    La UI (AttendanceSection) ya trata minutes_charged IS NULL como "Pendiente de facturación"
--    sin importar el status -- este backfill no crea evidencia histórica de asistencia real,
--    crea el mismo estado neutro/pendiente que existiría si el roster se hubiera generado a
--    tiempo.
-- ============================================================================================

insert into public.session_attendance (session_id, student_id, status, minutes_charged, decided_by, decided_at)
select s.id, cs.student_id, 'present', null, null, null
from public.sessions s
join public.classroom_students cs on cs.classroom_id = s.classroom_id and cs.status = 'active'
where s.status in ('completed', 'cancelled')
on conflict (session_id, student_id) do nothing;
