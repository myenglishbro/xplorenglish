-- Dominio: rediseño operativo (Slice E) -- pagos a profesores, reemplaza por completo el flujo
-- viejo de periodos/recibos/aprobación (eliminado en Slice A).
--
-- Fuente de verdad de obligaciones docentes: public.class_records. Una clase genera deuda
-- solamente si status IN ('present','absent') AND amount IS NOT NULL. PENDIENTE = teacher_payment_id
-- IS NULL; PAGADA = teacher_payment_id IS NOT NULL. No se crea ninguna tabla nueva de obligaciones
-- (no se recrea teacher_hours_log).
--
-- private.prevent_paid_class_record_mutation (Slice A) ya permite exactamente la transición que
-- este RPC necesita: solo bloquea cambios cuando OLD.teacher_payment_id ya NO es null. Asignar
-- teacher_payment_id por primera vez (NULL -> valor) pasa libre porque el guard solo se activa si
-- OLD.teacher_payment_id is not null. No requiere ningún cambio.

-- ============================================================================
-- 1) admin_teacher_payment_summary -- resumen por profesor (listado principal)
-- ============================================================================

create or replace function public.admin_teacher_payment_summary()
returns table (
  teacher_id uuid,
  first_name text,
  last_name text,
  pending_class_count integer,
  pending_minutes integer,
  pending_amount numeric,
  last_class_at timestamptz
)
language plpgsql
security definer
set search_path to ''
as $$
begin
  if not private.is_admin() then
    raise exception 'NOT_AUTHORIZED: esta operación es exclusiva para administradores' using errcode = '42501';
  end if;

  return query
    select
      tp.profile_id,
      p.first_name,
      p.last_name,
      count(cr.id) filter (
        where cr.status in ('present', 'absent') and cr.amount is not null and cr.teacher_payment_id is null
      )::integer,
      coalesce(sum(cr.minutes) filter (
        where cr.status in ('present', 'absent') and cr.amount is not null and cr.teacher_payment_id is null
      ), 0)::integer,
      coalesce(sum(cr.amount) filter (
        where cr.status in ('present', 'absent') and cr.amount is not null and cr.teacher_payment_id is null
      ), 0)::numeric,
      max(cr.occurred_at) filter (where cr.status in ('present', 'absent'))
    from public.teacher_profiles tp
    join public.profiles p on p.id = tp.profile_id
    left join public.class_records cr on cr.teacher_id = tp.profile_id
    group by tp.profile_id, p.first_name, p.last_name
    order by p.first_name, p.last_name;
end;
$$;

revoke all on function public.admin_teacher_payment_summary() from public, anon;
grant execute on function public.admin_teacher_payment_summary() to authenticated;

-- ============================================================================
-- 2) pay_teacher_classes -- pago real, reemplaza a create/approve/mark_teacher_payment_period_paid
-- ============================================================================

create or replace function public.pay_teacher_classes(
  p_teacher_id uuid,
  p_class_record_ids bigint[],
  p_reference text default null
)
returns table (
  payment_id bigint,
  teacher_id uuid,
  paid_at timestamptz,
  total_minutes integer,
  total_amount numeric,
  reference text,
  class_record_ids bigint[]
)
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_admin_id uuid;
  v_input_count integer;
  v_distinct_count integer;
  v_found_count integer;
  v_invalid_count integer;
  v_total_minutes integer;
  v_total_amount numeric(10,2);
  v_payment_id bigint;
begin
  v_admin_id := (select auth.uid());
  if v_admin_id is null then
    raise exception 'UNAUTHENTICATED: no autenticado' using errcode = '28000';
  end if;

  if not private.is_admin() then
    raise exception 'NOT_AUTHORIZED: esta operación es exclusiva para administradores' using errcode = '42501';
  end if;

  if p_teacher_id is null then
    raise exception 'INVALID_INPUT: p_teacher_id es obligatorio' using errcode = 'P0001';
  end if;

  if p_class_record_ids is null or array_length(p_class_record_ids, 1) is null then
    raise exception 'EMPTY_SELECTION: debes seleccionar al menos una clase' using errcode = 'P0001';
  end if;

  v_input_count := array_length(p_class_record_ids, 1);

  select count(distinct x) into v_distinct_count from unnest(p_class_record_ids) as x;
  if v_distinct_count <> v_input_count then
    raise exception 'DUPLICATE_IDS: la selección contiene ids duplicados' using errcode = 'P0001';
  end if;

  -- Lock ANTES de validar: si otra llamada concurrente está pagando las mismas clases, esta
  -- espera a que termine (commit/rollback) y luego re-lee el estado ya actualizado -- así ninguna
  -- clase puede pagarse dos veces, y no queda un pago parcial silencioso.
  perform 1 from public.class_records cr where cr.id = any(p_class_record_ids) for update;

  select count(*) into v_found_count from public.class_records cr where cr.id = any(p_class_record_ids);
  if v_found_count <> v_input_count then
    raise exception 'CLASS_RECORD_NOT_FOUND: alguna de las clases seleccionadas no existe' using errcode = 'P0002';
  end if;

  select count(*) into v_invalid_count
  from public.class_records cr
  where cr.id = any(p_class_record_ids)
    and (
      cr.teacher_id is distinct from p_teacher_id
      or cr.status not in ('present', 'absent')
      or cr.amount is null
      or cr.teacher_payment_id is not null
    );

  if v_invalid_count > 0 then
    raise exception 'INVALID_SELECTION: alguna clase no pertenece a este profesor, no es remunerable o ya fue pagada' using errcode = 'P0001';
  end if;

  select coalesce(sum(cr.minutes), 0), coalesce(sum(cr.amount), 0)
    into v_total_minutes, v_total_amount
  from public.class_records cr
  where cr.id = any(p_class_record_ids);

  insert into public.teacher_payments (teacher_id, paid_at, total_minutes, total_amount, reference, created_by)
  values (p_teacher_id, now(), v_total_minutes, v_total_amount, p_reference, v_admin_id)
  returning id into v_payment_id;

  update public.class_records cr
  set teacher_payment_id = v_payment_id
  where cr.id = any(p_class_record_ids);

  return query
    select tpay.id, tpay.teacher_id, tpay.paid_at, tpay.total_minutes, tpay.total_amount, tpay.reference, p_class_record_ids
    from public.teacher_payments tpay
    where tpay.id = v_payment_id;
end;
$$;

revoke all on function public.pay_teacher_classes(uuid, bigint[], text) from public, anon;
grant execute on function public.pay_teacher_classes(uuid, bigint[], text) to authenticated;
