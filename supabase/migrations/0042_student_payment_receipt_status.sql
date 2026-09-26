-- FIX 11 (segunda etapa) -- Estado ADMINISTRATIVO/DOCUMENTARIO de la boleta/comprobante de venta
-- asociada a una compra del estudiante. Dimensión completamente independiente de
-- student_payments.status (financiero): "Pago: completed" + "Boleta: pending" es un estado válido,
-- igual que "Pago: refunded" + "Boleta: sent". NO reutiliza payment_status ni package_status.
--
-- NO CONFUNDIR con teacher_profiles.receipt_drive_url (FIX 2, recibos por HONORARIOS de docentes)
-- ni con el bucket student-payment-proofs / PaymentProofSection (evidencia de que el estudiante
-- pagó, ver lib/storage/paymentProofs.ts) -- ambos son conceptos completamente distintos de la
-- boleta/comprobante de venta que emite la academia, que es lo que esta migración modela.
--
-- Depende de: 0001 (private schema, private.is_admin), 0003 (profiles), 0007 (student_payments,
-- hours_packages, create_hour_package), 0036 (audit_logs, private.write_audit_log).

-- ============================================================================================
-- 1) Enum -- dominio propio, nunca payment_status/package_status.
-- ============================================================================================
create type public.receipt_status as enum (
  'pending',
  'issued',
  'sent',
  'not_applicable'
);

-- ============================================================================================
-- 2) Columna -- NULLABLE, SIN DEFAULT, SIN BACKFILL.
--
-- Todo student_payments histórico existente queda con receipt_status = NULL ("Sin registrar" en
-- UI): NO sabemos si esas boletas ya fueron emitidas/enviadas, así que no se afirma 'pending' ni
-- ningún otro valor para compras pasadas. NULL nunca se vuelve a asignar desde la aplicación una
-- vez que Admin clasifica un registro (ver admin_set_receipt_status más abajo, que solo acepta los
-- 4 valores del enum, nunca NULL) -- NULL representa exclusivamente "desconocido/no clasificado
-- todavía", no un estado operable.
--
-- Sin DEFAULT a nivel de columna: create_hour_package() (modificado abajo) es el ÚNICO punto de
-- escritura de student_payments hoy, y asigna 'pending' EXPLÍCITAMENTE -- un DEFAULT global
-- aplicaría esa misma semántica documental a cualquier inserción futura fuera de ese flujo (por
-- ejemplo, una migración de datos legacy) sin que eso sea necesariamente correcto. Explícito en el
-- único INSERT real > implícito en la columna.
-- ============================================================================================
alter table public.student_payments
  add column receipt_status public.receipt_status;

comment on column public.student_payments.receipt_status is
  'Estado ADMINISTRATIVO/DOCUMENTARIO de la boleta/comprobante de venta (FIX 11, segunda etapa) -- '
  'NUNCA el estado financiero del pago (ver student_payments.status). NULL = histórico sin '
  'clasificar ("Sin registrar" en UI), nunca reasignado automáticamente. Cambia únicamente vía '
  'admin_set_receipt_status() (auditado); cancelar/reembolsar un paquete NUNCA lo modifica.';

-- ============================================================================================
-- 3) create_hour_package() -- MISMA firma exacta (create or replace, sin cambiar tipos de
-- parámetros ni de retorno). Único cambio: el INSERT en student_payments ahora fija
-- receipt_status = 'pending' explícitamente para compras NUEVAS. Ninguna otra semántica cambia:
-- sigue creando payment (status='completed') + package (status='active') + movement ('purchase'),
-- sigue siendo atómico e idempotente por idempotency_key.
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

  -- receipt_status = 'pending' explícito (FIX 11) -- único cambio real de este INSERT respecto a
  -- la versión anterior de la función.
  insert into public.student_payments (student_id, amount, currency, payment_method, status, paid_at, reference, idempotency_key, receipt_status)
  values (p_student_id, p_price, p_currency, p_payment_method, 'completed', now(), p_payment_reference, p_idempotency_key, 'pending')
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
-- 4) admin_set_receipt_status -- único punto de escritura de receipt_status DESPUÉS de la compra
-- inicial. Admin-only, auditado (private.write_audit_log, mismo patrón que
-- admin_cancel_hours_package/admin_refund_hours_package, 0038). NUNCA toca student_payments.status,
-- amount, paid_at, hours_packages ni hours_movements -- exclusivamente la columna documental.
--
-- No acepta NULL como valor destino a propósito (el enum public.receipt_status no incluye NULL
-- como miembro; el parámetro SÍ podría recibir NULL en teoría, pero no hay ningún caller en el
-- frontend que lo permita -- el <Select> de UI solo ofrece los 4 valores clasificados, nunca
-- "Sin registrar" como opción elegible, por diseño de producto: una vez clasificado, no se vuelve
-- a NULL). Si p_status es idéntico al valor actual (incluida la comparación NULL-safe), no genera
-- UPDATE ni entrada de auditoría -- evita ruido en audit_logs por reenvíos accidentales del mismo
-- valor.
-- ============================================================================================
create or replace function public.admin_set_receipt_status(
  p_payment_id bigint,
  p_status public.receipt_status,
  p_reason text default null
)
returns public.student_payments
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_admin_id uuid := (select auth.uid());
  v_before public.student_payments;
  v_after public.student_payments;
begin
  if v_admin_id is null then
    raise exception 'UNAUTHENTICATED: no autenticado' using errcode = '28000';
  end if;
  if not private.is_admin() then
    raise exception 'NOT_AUTHORIZED: esta operación es exclusiva para administradores' using errcode = '42501';
  end if;

  select * into v_before from public.student_payments where id = p_payment_id;
  if not found then
    raise exception 'PAYMENT_NOT_FOUND: el pago no existe' using errcode = 'P0002';
  end if;

  if v_before.receipt_status is not distinct from p_status then
    return v_before;
  end if;

  update public.student_payments set receipt_status = p_status where id = p_payment_id
  returning * into v_after;

  perform private.write_audit_log(v_admin_id, 'student_payment_receipt_status_changed', 'student_payment', p_payment_id::text,
    to_jsonb(v_before), to_jsonb(v_after), p_reason);

  return v_after;
end;
$function$;

revoke all on function public.admin_set_receipt_status(bigint, public.receipt_status, text) from public, anon;
grant execute on function public.admin_set_receipt_status(bigint, public.receipt_status, text) to authenticated;

-- ============================================================================================
-- 5) RLS -- SIN CAMBIOS. student_payments_admin_write (0007, `for all` / `is_admin()`) ya cubre
-- la columna nueva automáticamente (RLS es por fila, no por columna). No se crea ninguna policy
-- nueva. admin_set_receipt_status es SECURITY DEFINER y valida is_admin() internamente, igual que
-- el resto de RPCs administrativos -- no depende de RLS para su propia autorización.
-- ============================================================================================
