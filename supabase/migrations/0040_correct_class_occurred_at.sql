-- Dominio: AJUSTE 2 (post-entrega) -- permitir corregir occurred_at (fecha/hora) de una clase
-- PENDIENTE DE PAGO desde la misma acción "Corregir" (correct_class, 0028).
--
-- p_occurred_at es un parámetro NUEVO, opcional (default null) al final de la firma -- las 4
-- llamadas existentes (positional, 4 argumentos) siguen funcionando sin cambios. Cuando se envía,
-- solo reemplaza occurred_at vía coalesce(); nunca toca minutes/status/hourly_rate_snapshot/
-- amount/teacher_payment_id por su cuenta, así que corregir SOLO fecha/hora (sin cambiar
-- status/minutes) sigue sin generar ningún hours_movements -- misma rama v_old_effective =
-- v_new_effective de siempre, ahora también arrastrando occurred_at.
--
-- Clase PAGADA: occurred_at sigue bloqueada -- si se pide cambiarla se rechaza con el mismo
-- CLASS_RECORD_PAID que ya protege status/minutes, antes de intentar el UPDATE. El trigger
-- class_records_lock_paid (0026) sigue como última barrera real; no se modifica.
--
-- IMPORTANTE: create or replace NO reemplaza una función cuando la lista de tipos de parámetros
-- cambia (4 args -> 5 args, aunque el 5to tenga default) -- Postgres la trataría como un overload
-- nuevo y dejaría a la vieja de 4 args viva (ambigüedad/duplicación). Por eso se hace drop
-- explícito de la firma vieja antes de crear la nueva: queda una sola función, y las llamadas
-- existentes de 4 args siguen resolviendo ahí mismo gracias al default de p_occurred_at.

drop function if exists public.correct_class(bigint, public.class_record_status, integer, text);

create or replace function public.correct_class(
  p_class_record_id bigint,
  p_status public.class_record_status,
  p_minutes integer,
  p_notes text,
  p_occurred_at timestamptz default null
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
  v_initial public.class_records;
  v_old public.class_records;
  v_old_effective integer;
  v_new_effective integer;
  v_rate numeric(10,2);
  v_amount numeric(10,2);
  v_balance integer;
  v_updated public.class_records;
begin
  if p_status is null or p_minutes is null then
    raise exception 'INVALID_INPUT: status y minutes son obligatorios' using errcode = 'P0001';
  end if;

  if p_status = 'rescheduled' then
    if p_minutes is distinct from 0 then
      raise exception 'INVALID_MINUTES: una clase reprogramada debe quedar con minutes = 0' using errcode = 'P0001';
    end if;
  else
    if p_minutes <= 0 then
      raise exception 'INVALID_MINUTES: minutes debe ser mayor a 0 para status=%', p_status using errcode = 'P0001';
    end if;
  end if;

  v_teacher_id := private.require_active_teacher();

  -- Lectura inicial (sin lock): solo para existencia/propiedad/atajo de "ya pagada". No exige
  -- que el profesor siga habilitado en classroom_teachers -- sigue siendo responsable de su
  -- registro histórico aunque lo hayan retirado del salón después.
  select cr.* into v_initial from public.class_records cr where cr.id = p_class_record_id;
  if not found then
    raise exception 'CLASS_RECORD_NOT_FOUND: la clase % no existe', p_class_record_id using errcode = 'P0002';
  end if;

  if v_initial.teacher_id is distinct from v_teacher_id then
    raise exception 'NOT_AUTHORIZED: no eres el profesor que registró esta clase' using errcode = '42501';
  end if;

  -- Clase PAGADA: solo notes es editable -- fecha/hora sigue bloqueada. Se rechaza explícitamente
  -- aquí (mensaje claro) además de la protección del trigger class_records_lock_paid (última
  -- barrera real).
  if v_initial.teacher_payment_id is not null then
    if p_status is distinct from v_initial.status
       or p_minutes is distinct from v_initial.minutes
       or (p_occurred_at is not null and p_occurred_at is distinct from v_initial.occurred_at)
    then
      raise exception 'CLASS_RECORD_PAID: una clase pagada solo permite corregir notes' using errcode = 'P0001';
    end if;

    update public.class_records cr
    set notes = p_notes, updated_at = now()
    where cr.id = p_class_record_id
    returning * into v_updated;

    select coalesce(sum(hm.minutes_delta), 0) into v_balance
    from public.hours_movements hm where hm.student_id = v_updated.student_id;

    return query select
      v_updated.id, v_updated.classroom_id, v_updated.student_id, v_updated.teacher_id,
      v_updated.occurred_at, v_updated.status, v_updated.minutes, v_updated.notes,
      v_updated.hourly_rate_snapshot, v_updated.amount, v_updated.teacher_payment_id, v_balance;
    return;
  end if;

  -- Clase PENDIENTE: serializa por alumno (mismo criterio que register_class) y vuelve a leer la
  -- fila YA bloqueada, por si cambió entre la lectura inicial y la adquisición del lock (p.ej. si
  -- justo se pagó en ese instante).
  perform pg_advisory_xact_lock(hashtext(v_initial.student_id::text));

  select cr.* into v_old from public.class_records cr where cr.id = p_class_record_id for update;

  if v_old.teacher_payment_id is not null then
    raise exception 'CLASS_RECORD_PAID: una clase pagada solo permite corregir notes' using errcode = 'P0001';
  end if;

  v_old_effective := case when v_old.status in ('present', 'absent') then v_old.minutes else 0 end;
  v_new_effective := case when p_status in ('present', 'absent') then p_minutes else 0 end;

  if v_old_effective = v_new_effective then
    -- Sin cambio neto de minutos facturables (present<->absent con los mismos minutos, o
    -- rescheduled->rescheduled): no se tocan hours_movements, se conserva tarifa/monto tal cual.
    -- occurred_at puede cambiar aquí sin ningún efecto sobre saldo/hours_movements.
    update public.class_records cr
    set status = p_status, minutes = p_minutes, notes = p_notes,
        occurred_at = coalesce(p_occurred_at, cr.occurred_at),
        updated_at = now()
    where cr.id = p_class_record_id
    returning * into v_updated;
  else
    if v_old_effective > 0 then
      insert into public.hours_movements (
        student_id, package_id, class_record_id, movement_type, minutes_delta, created_by, notes
      ) values (
        v_old.student_id, null, v_old.id, 'adjustment', v_old_effective, v_teacher_id,
        'Reversión por corrección de class_record'
      );
    end if;

    if v_new_effective > 0 then
      select coalesce(sum(hm.minutes_delta), 0) into v_balance
      from public.hours_movements hm where hm.student_id = v_old.student_id;

      if v_balance < v_new_effective then
        raise exception 'INSUFFICIENT_BALANCE: saldo insuficiente para la corrección (disponible % min, solicitado % min)',
          v_balance, v_new_effective using errcode = 'P0001';
      end if;

      -- Tarifa: si la clase YA era present/absent, se conserva el snapshot original (nunca se
      -- recalcula con la tarifa vigente). Si venía de rescheduled (nunca tuvo snapshot), se toma
      -- la tarifa ACTUAL del profesor en este instante.
      if v_old_effective > 0 then
        v_rate := v_old.hourly_rate_snapshot;
      else
        select tp.hourly_rate into v_rate from public.teacher_profiles tp where tp.profile_id = v_teacher_id;
        if v_rate is null then
          raise exception 'MISSING_HOURLY_RATE: tu perfil docente no tiene tarifa configurada' using errcode = 'P0001';
        end if;
      end if;

      v_amount := round((v_new_effective::numeric / 60) * v_rate, 2);

      insert into public.hours_movements (
        student_id, package_id, class_record_id, movement_type, minutes_delta, created_by, notes
      ) values (
        v_old.student_id, null, v_old.id, 'adjustment', -v_new_effective, v_teacher_id,
        'Reaplicación por corrección de class_record'
      );
    else
      v_rate := null;
      v_amount := null;
    end if;

    update public.class_records cr
    set status = p_status,
        minutes = p_minutes,
        notes = p_notes,
        occurred_at = coalesce(p_occurred_at, cr.occurred_at),
        hourly_rate_snapshot = v_rate,
        amount = v_amount,
        updated_at = now()
    where cr.id = p_class_record_id
    returning * into v_updated;
  end if;

  select coalesce(sum(hm.minutes_delta), 0) into v_balance
  from public.hours_movements hm where hm.student_id = v_updated.student_id;

  return query select
    v_updated.id, v_updated.classroom_id, v_updated.student_id, v_updated.teacher_id,
    v_updated.occurred_at, v_updated.status, v_updated.minutes, v_updated.notes,
    v_updated.hourly_rate_snapshot, v_updated.amount, v_updated.teacher_payment_id, v_balance;
end;
$$;

revoke all on function public.correct_class(bigint, public.class_record_status, integer, text, timestamptz) from public, anon;
grant execute on function public.correct_class(bigint, public.class_record_status, integer, text, timestamptz) to authenticated;
