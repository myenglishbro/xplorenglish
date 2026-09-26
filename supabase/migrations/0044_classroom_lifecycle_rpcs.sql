-- Dominio: ciclo de vida de salones (Finalizar/Reactivar) -- reutiliza el lifecycle YA EXISTENTE
-- de classrooms.status ('active'/'archived', 0005/0015), ningún estado nuevo. Mismo patrón exacto
-- que admin_archive_user/admin_restore_user (0038): valida admin, valida transición, aplica el
-- cambio mínimo, escribe audit_logs. No hace DELETE ni toca ninguna otra tabla.
--
-- Depende de: 0001 (private schema), 0005 (classrooms), 0036 (audit_logs, private.write_audit_log),
-- 0038 (private.is_admin ya existe desde 0003, patrón de referencia).

-- ============================================================================================
-- admin_set_classroom_status -- único RPC (un solo p_status, en vez de dos funciones simétricas
-- tipo admin_archive_user/admin_restore_user) porque la transición es simétrica y cabe en una sola
-- validación de "estado actual vs. destino" sin duplicar código. Acción de auditoría derivada del
-- destino: 'archived' -> CLASSROOM_ARCHIVED, 'active' -> CLASSROOM_RESTORED.
-- ============================================================================================
create or replace function public.admin_set_classroom_status(p_classroom_id bigint, p_status text, p_reason text default null)
returns public.classrooms
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_admin_id uuid := (select auth.uid());
  v_before public.classrooms;
  v_after public.classrooms;
  v_action text;
begin
  if v_admin_id is null then
    raise exception 'UNAUTHENTICATED: no autenticado' using errcode = '28000';
  end if;
  if not private.is_admin() then
    raise exception 'NOT_AUTHORIZED: esta operación es exclusiva para administradores' using errcode = '42501';
  end if;
  if p_status not in ('active', 'archived') then
    raise exception 'INVALID_STATUS: status debe ser active o archived' using errcode = 'P0001';
  end if;

  select * into v_before from public.classrooms where id = p_classroom_id;
  if not found then
    raise exception 'CLASSROOM_NOT_FOUND: el salón % no existe', p_classroom_id using errcode = 'P0002';
  end if;

  if v_before.status = p_status then
    raise exception 'INVALID_STATUS_TRANSITION: el salón ya está %', p_status using errcode = 'P0001';
  end if;

  update public.classrooms set status = p_status where id = p_classroom_id
  returning * into v_after;

  v_action := case when p_status = 'archived' then 'CLASSROOM_ARCHIVED' else 'CLASSROOM_RESTORED' end;

  perform private.write_audit_log(v_admin_id, v_action, 'classroom', p_classroom_id::text,
    to_jsonb(v_before), to_jsonb(v_after), p_reason);

  return v_after;
end;
$function$;

revoke all on function public.admin_set_classroom_status(bigint, text, text) from public, anon;
grant execute on function public.admin_set_classroom_status(bigint, text, text) to authenticated;

-- ============================================================================================
-- register_class -- cierra el gap encontrado en la auditoría: la función es SECURITY DEFINER y
-- hasta ahora NUNCA validaba classrooms.status, así que un docente que conservara el
-- classroom_id de un salón ya archivado podía seguir registrando clases nuevas contra él (su fila
-- en classroom_teachers no se toca al archivar -- sigue 'active' para siempre). Se agrega UNA
-- sola validación, inmediatamente después de resolver v_classroom y ANTES de cualquier insert
-- (class_records/hours_movements) o cálculo de remuneración/saldo. Ninguna otra regla de la
-- función cambia -- el resto del cuerpo es idéntico a 0027_register_class.sql.
--
-- correct_class (0028/0040) deliberadamente NO recibe este chequeo: corregir una clase ya
-- registrada debe seguir funcionando aunque el salón se archive después -- eso es historial, no
-- una clase nueva.
create or replace function public.register_class(
  p_classroom_id bigint,
  p_occurred_at timestamptz,
  p_status public.class_record_status,
  p_minutes integer,
  p_notes text,
  p_idempotency_key uuid
)
returns table (
  id bigint,
  classroom_id bigint,
  student_id uuid,
  teacher_id uuid,
  occurred_at timestamptz,
  status public.class_record_status,
  minutes integer,
  notes text,
  hourly_rate_snapshot numeric,
  amount numeric,
  teacher_payment_id bigint,
  student_balance integer
)
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_teacher_id uuid;
  v_existing public.class_records;
  v_classroom public.classrooms;
  v_student_role public.user_role;
  v_student_status text;
  v_rate numeric(10,2);
  v_balance integer;
  v_amount numeric(10,2);
  v_new public.class_records;
begin
  if p_idempotency_key is null then
    raise exception 'MISSING_IDEMPOTENCY_KEY: p_idempotency_key es obligatorio' using errcode = 'P0001';
  end if;

  -- Idempotencia PRIMERO: un retry con la misma key nunca debe evaluarse contra saldo de nuevo
  -- (el primer intento ya pudo haber consumido minutos). idempotency_key es un uuid generado por
  -- el cliente por intento de registro -- la unicidad global (ya existe como constraint desde
  -- 0026) alcanza; para blindar contra una key ajena reutilizada por error, igual se verifica que
  -- la fila encontrada pertenezca al mismo profesor y salón antes de devolverla.
  select * into v_existing from public.class_records where idempotency_key = p_idempotency_key;
  if found then
    if v_existing.teacher_id is distinct from (select auth.uid())
       or v_existing.classroom_id is distinct from p_classroom_id then
      raise exception 'IDEMPOTENCY_KEY_CONFLICT: esta idempotency_key ya fue usada por otra operación' using errcode = 'P0001';
    end if;

    select coalesce(sum(hm.minutes_delta), 0) into v_balance
    from public.hours_movements hm where hm.student_id = v_existing.student_id;

    return query select
      v_existing.id, v_existing.classroom_id, v_existing.student_id, v_existing.teacher_id,
      v_existing.occurred_at, v_existing.status, v_existing.minutes, v_existing.notes,
      v_existing.hourly_rate_snapshot, v_existing.amount, v_existing.teacher_payment_id, v_balance;
    return;
  end if;

  -- Autorización: docente autenticado y activo.
  v_teacher_id := private.require_active_teacher();

  -- Nota: las columnas de RETURNS TABLE (id, classroom_id, teacher_id, student_id, status, ...)
  -- quedan en el mismo scope que el cuerpo de la función -- toda referencia a esas columnas en
  -- las tablas reales debe ir calificada con alias para evitar "column reference is ambiguous".
  select c.* into v_classroom from public.classrooms c where c.id = p_classroom_id;
  if not found then
    raise exception 'CLASSROOM_NOT_FOUND: el salón % no existe', p_classroom_id using errcode = 'P0002';
  end if;

  -- NUEVO (cierre de gap de auditoría): salón archivado -> abortar ANTES de tocar class_records/
  -- hours_movements. classroom_teachers nunca se desactiva al archivar, así que este es el único
  -- punto de autoridad real que impide registrar clases nuevas contra un salón finalizado.
  if v_classroom.status is distinct from 'active' then
    raise exception 'CLASSROOM_ARCHIVED: el salón % está archivado, no se pueden registrar clases nuevas', p_classroom_id using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.classroom_teachers ct
    where ct.classroom_id = p_classroom_id
      and ct.teacher_id = v_teacher_id
      and ct.status = 'active'
  ) then
    raise exception 'TEACHER_NOT_ENABLED: no estás habilitado para registrar clases en este salón' using errcode = '42501';
  end if;

  if v_classroom.student_id is null then
    raise exception 'NO_STUDENT_ASSIGNED: el salón no tiene un alumno asignado' using errcode = 'P0001';
  end if;

  select p.role, p.status into v_student_role, v_student_status
  from public.profiles p where p.id = v_classroom.student_id;

  if v_student_role is distinct from 'student' or v_student_status is distinct from 'active' then
    raise exception 'INVALID_STUDENT: el alumno asignado al salón no es válido/activo' using errcode = 'P0001';
  end if;

  if p_status = 'rescheduled' then
    -- Reprogramada: 0 minutos siempre. Si el cliente envía algo distinto de 0, se rechaza (más
    -- seguro que normalizar en silencio -- evita ocultar un bug de UI que crea/consulta con
    -- minutos incorrectos). No se valida saldo ni se crea movimiento.
    if p_minutes is distinct from 0 then
      raise exception 'INVALID_MINUTES: una clase reprogramada debe registrarse con minutes = 0' using errcode = 'P0001';
    end if;

    insert into public.class_records (
      classroom_id, teacher_id, student_id, occurred_at, status, minutes, notes,
      hourly_rate_snapshot, amount, teacher_payment_id, idempotency_key
    ) values (
      p_classroom_id, v_teacher_id, v_classroom.student_id, p_occurred_at, p_status, 0, p_notes,
      null, null, null, p_idempotency_key
    )
    returning * into v_new;

    select coalesce(sum(hm.minutes_delta), 0) into v_balance
    from public.hours_movements hm where hm.student_id = v_classroom.student_id;
  else
    -- present / absent: mismo comportamiento financiero, solo difiere el status histórico.
    if p_minutes is null or p_minutes <= 0 then
      raise exception 'INVALID_MINUTES: minutes debe ser mayor a 0 para status=%', p_status using errcode = 'P0001';
    end if;

    select hourly_rate into v_rate from public.teacher_profiles where profile_id = v_teacher_id;
    if v_rate is null then
      raise exception 'MISSING_HOURLY_RATE: tu perfil docente no tiene tarifa configurada' using errcode = 'P0001';
    end if;

    -- Serializa consumos concurrentes del MISMO alumno (dos registros a la vez no pueden ambos
    -- pasar la validación de saldo); alumnos distintos nunca se bloquean entre sí. No hace falta
    -- una fila "de saldo" que lockear porque el saldo es un SUM() sobre filas que aún no existen
    -- -- SELECT ... FOR UPDATE no sirve aquí. El lock es de transacción: se libera solo al
    -- terminar (commit o rollback), sin riesgo de quedar tomado.
    perform pg_advisory_xact_lock(hashtext(v_classroom.student_id::text));

    select coalesce(sum(hm.minutes_delta), 0) into v_balance
    from public.hours_movements hm where hm.student_id = v_classroom.student_id;

    if v_balance < p_minutes then
      raise exception 'INSUFFICIENT_BALANCE: saldo insuficiente (disponible % min, solicitado % min)',
        v_balance, p_minutes using errcode = 'P0001';
    end if;

    v_amount := round((p_minutes::numeric / 60) * v_rate, 2);

    insert into public.class_records (
      classroom_id, teacher_id, student_id, occurred_at, status, minutes, notes,
      hourly_rate_snapshot, amount, teacher_payment_id, idempotency_key
    ) values (
      p_classroom_id, v_teacher_id, v_classroom.student_id, p_occurred_at, p_status, p_minutes, p_notes,
      v_rate, v_amount, null, p_idempotency_key
    )
    returning * into v_new;

    insert into public.hours_movements (
      student_id, package_id, class_record_id, movement_type, minutes_delta, created_by, notes
    ) values (
      v_classroom.student_id, null, v_new.id, 'consumption', -p_minutes, v_teacher_id, null
    );

    v_balance := v_balance - p_minutes;
  end if;

  return query select
    v_new.id, v_new.classroom_id, v_new.student_id, v_new.teacher_id,
    v_new.occurred_at, v_new.status, v_new.minutes, v_new.notes,
    v_new.hourly_rate_snapshot, v_new.amount, v_new.teacher_payment_id, v_balance;
end;
$$;

revoke all on function public.register_class(bigint, timestamptz, public.class_record_status, integer, text, uuid) from public, anon;
grant execute on function public.register_class(bigint, timestamptz, public.class_record_status, integer, text, uuid) to authenticated;
