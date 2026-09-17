-- Dominio: rediseño operativo (Slice C) -- corrección de una clase ya registrada.
-- Depende de: 0026 (class_records, class_records_lock_paid trigger), 0027 (register_class,
-- convención de errores/locking).
--
-- correct_class permite al profesor que registró una clase corregir status/minutes/notes mientras
-- siga PENDIENTE (teacher_payment_id is null). Una vez PAGADA, solo notes es editable -- el
-- trigger class_records_lock_paid (0026) es la última barrera, pero acá se valida lo mismo antes
-- de intentar el UPDATE para devolver un error claro en vez de depender solo del trigger.
--
-- Movimientos compensatorios: se reutiliza 'adjustment' (ya existe en hours_movement_type) tanto
-- para revertir el consumo anterior como para reaplicar el nuevo -- no se inventa un tipo nuevo.
-- 'consumption' queda reservado para el consumo original creado por register_class.

create or replace function public.correct_class(
  p_class_record_id bigint,
  p_status public.class_record_status,
  p_minutes integer,
  p_notes text
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

  -- Clase PAGADA: solo notes es editable. Se rechaza explícitamente aquí (mensaje claro) además
  -- de la protección del trigger class_records_lock_paid (última barrera real).
  if v_initial.teacher_payment_id is not null then
    if p_status is distinct from v_initial.status or p_minutes is distinct from v_initial.minutes then
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
    update public.class_records cr
    set status = p_status, minutes = p_minutes, notes = p_notes, updated_at = now()
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

revoke all on function public.correct_class(bigint, public.class_record_status, integer, text) from public, anon;
grant execute on function public.correct_class(bigint, public.class_record_status, integer, text) to authenticated;
