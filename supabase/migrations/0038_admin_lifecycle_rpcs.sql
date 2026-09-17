-- Dominio: ciclo de vida de usuarios y paquetes de horas (versión reducida, aprobada).
-- 4 RPCs administrativas, cada una: valida admin, valida estado actual, aplica el cambio mínimo,
-- escribe audit_logs. Ninguna hace DELETE de historial ni de auth.users.

-- ============================================================================================
-- admin_archive_user / admin_restore_user -- solo profiles.archived_at + auditoría. NUNCA tocan
-- status/role ni ninguna otra tabla. Restaurar NO reactiva status (queda como estaba).
-- ============================================================================================
create or replace function public.admin_archive_user(p_target_id uuid, p_reason text default null)
returns public.profiles
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_admin_id uuid := (select auth.uid());
  v_before public.profiles;
  v_after public.profiles;
begin
  if v_admin_id is null then
    raise exception 'UNAUTHENTICATED: no autenticado' using errcode = '28000';
  end if;
  if not private.is_admin() then
    raise exception 'NOT_AUTHORIZED: esta operación es exclusiva para administradores' using errcode = '42501';
  end if;
  if p_target_id = v_admin_id then
    raise exception 'CANNOT_ARCHIVE_SELF: no puedes archivar tu propio perfil' using errcode = 'P0001';
  end if;

  select * into v_before from public.profiles where id = p_target_id;
  if not found then
    raise exception 'PROFILE_NOT_FOUND: el perfil no existe' using errcode = 'P0002';
  end if;
  if v_before.archived_at is not null then
    raise exception 'ALREADY_ARCHIVED: el perfil ya está archivado' using errcode = 'P0001';
  end if;

  update public.profiles set archived_at = now() where id = p_target_id
  returning * into v_after;

  perform private.write_audit_log(v_admin_id, 'USER_ARCHIVED', 'profile', p_target_id::text,
    to_jsonb(v_before), to_jsonb(v_after), p_reason);

  return v_after;
end;
$function$;

create or replace function public.admin_restore_user(p_target_id uuid, p_reason text default null)
returns public.profiles
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_admin_id uuid := (select auth.uid());
  v_before public.profiles;
  v_after public.profiles;
begin
  if v_admin_id is null then
    raise exception 'UNAUTHENTICATED: no autenticado' using errcode = '28000';
  end if;
  if not private.is_admin() then
    raise exception 'NOT_AUTHORIZED: esta operación es exclusiva para administradores' using errcode = '42501';
  end if;

  select * into v_before from public.profiles where id = p_target_id;
  if not found then
    raise exception 'PROFILE_NOT_FOUND: el perfil no existe' using errcode = 'P0002';
  end if;
  if v_before.archived_at is null then
    raise exception 'NOT_ARCHIVED: el perfil no está archivado' using errcode = 'P0001';
  end if;

  update public.profiles set archived_at = null where id = p_target_id
  returning * into v_after;

  perform private.write_audit_log(v_admin_id, 'USER_RESTORED', 'profile', p_target_id::text,
    to_jsonb(v_before), to_jsonb(v_after), p_reason);

  return v_after;
end;
$function$;

revoke all on function public.admin_archive_user(uuid, text) from public, anon;
grant execute on function public.admin_archive_user(uuid, text) to authenticated;
revoke all on function public.admin_restore_user(uuid, text) from public, anon;
grant execute on function public.admin_restore_user(uuid, text) to authenticated;

-- ============================================================================================
-- admin_cancel_hours_package / admin_refund_hours_package
--
-- Relación real verificada antes de escribir esto: create_hour_package (0009) crea SIEMPRE, en
-- una sola transacción, 1 student_payments + 1 hours_packages (payment_id) + 1 hours_movements
-- (movement_type='purchase', package_id, minutes_delta=+total_minutes). No hay UNIQUE en
-- hours_packages.payment_id (1:1 solo por convención de esa RPC, no forzado por schema), así que
-- aquí se navega siempre hacia adelante (package -> su payment_id), nunca se asume la inversa.
--
-- "Efecto neto del paquete en el ledger" = SUM(hours_movements.minutes_delta) WHERE package_id =
-- este paquete (hoy siempre == total_minutes, un solo movimiento 'purchase' -- generalizado por
-- si alguna vez hubiera más de un movimiento atado a package_id). El movimiento compensatorio
-- revierte exactamente ese neto, nunca edita/borra el movimiento original.
--
-- movement_type='adjustment' (NUNCA 'refund') para el movimiento compensatorio: la constraint
-- existente hours_movements_sign_matches_type exige minutes_delta > 0 para 'purchase'/'refund'
-- (ese valor está reservado para ACREDITAR minutos al estudiante, ej. una corrección a su favor).
-- Retirar minutos ya otorgados (porque se cancela o se devuelve el dinero de un paquete) es un
-- ajuste negativo -- solo 'adjustment' no tiene restricción de signo. Verificado con sanity check
-- real: usar 'refund' aquí viola esa constraint y la operación falla siempre.
--
-- Regla de saldo (la más importante): el saldo TOTAL del estudiante (SUM de TODOS sus
-- hours_movements, cualquier paquete) nunca puede quedar negativo. Se verifica ANTES de insertar
-- el movimiento compensatorio, bajo el mismo advisory lock por estudiante que usa register_class/
-- correct_class (pg_advisory_xact_lock(hashtext(student_id::text))) -- si no alcanza, se rechaza
-- la operación completa, sin tocar nada.
--
-- Diferencia cancel vs refund: cancel = status 'cancelled', NUNCA toca student_payments (no se
-- afirma que haya dinero de por medio). refund = status 'refunded', Y ADEMÁS marca el
-- student_payments vinculado (via payment_id) como 'refunded' -- así Financial Reporting
-- (Ingresos = student_payments.status='completed') deja de contar ese dinero automáticamente,
-- sin fórmula nueva.
-- ============================================================================================
create or replace function public.admin_cancel_hours_package(p_package_id bigint, p_reason text default null)
returns public.hours_packages
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_admin_id uuid := (select auth.uid());
  v_package public.hours_packages;
  v_package_net integer;
  v_student_balance integer;
  v_after public.hours_packages;
begin
  if v_admin_id is null then
    raise exception 'UNAUTHENTICATED: no autenticado' using errcode = '28000';
  end if;
  if not private.is_admin() then
    raise exception 'NOT_AUTHORIZED: esta operación es exclusiva para administradores' using errcode = '42501';
  end if;

  select * into v_package from public.hours_packages where id = p_package_id;
  if not found then
    raise exception 'PACKAGE_NOT_FOUND: el paquete no existe' using errcode = 'P0002';
  end if;
  if v_package.status in ('cancelled', 'refunded') then
    raise exception 'INVALID_PACKAGE_STATUS: el paquete ya está %', v_package.status using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_package.student_id::text));

  select coalesce(sum(hm.minutes_delta), 0) into v_package_net
  from public.hours_movements hm where hm.package_id = p_package_id;

  select coalesce(sum(hm.minutes_delta), 0) into v_student_balance
  from public.hours_movements hm where hm.student_id = v_package.student_id;

  if v_student_balance - v_package_net < 0 then
    raise exception 'INSUFFICIENT_BALANCE: el saldo del alumno quedaría negativo (saldo actual % min, se retirarían % min)',
      v_student_balance, v_package_net using errcode = 'P0001';
  end if;

  if v_package_net <> 0 then
    insert into public.hours_movements (student_id, package_id, movement_type, minutes_delta, created_by, notes)
    values (v_package.student_id, p_package_id, 'adjustment', -v_package_net, v_admin_id, coalesce(p_reason, 'Cancelación de paquete'));
  end if;

  update public.hours_packages set status = 'cancelled' where id = p_package_id
  returning * into v_after;

  perform private.write_audit_log(v_admin_id, 'HOURS_PACKAGE_CANCELLED', 'hours_package', p_package_id::text,
    to_jsonb(v_package), to_jsonb(v_after), p_reason);

  return v_after;
end;
$function$;

create or replace function public.admin_refund_hours_package(p_package_id bigint, p_reason text default null)
returns public.hours_packages
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_admin_id uuid := (select auth.uid());
  v_package public.hours_packages;
  v_package_net integer;
  v_student_balance integer;
  v_after public.hours_packages;
  v_payment_before public.student_payments;
  v_payment_after public.student_payments;
begin
  if v_admin_id is null then
    raise exception 'UNAUTHENTICATED: no autenticado' using errcode = '28000';
  end if;
  if not private.is_admin() then
    raise exception 'NOT_AUTHORIZED: esta operación es exclusiva para administradores' using errcode = '42501';
  end if;

  select * into v_package from public.hours_packages where id = p_package_id;
  if not found then
    raise exception 'PACKAGE_NOT_FOUND: el paquete no existe' using errcode = 'P0002';
  end if;
  if v_package.status in ('cancelled', 'refunded') then
    raise exception 'INVALID_PACKAGE_STATUS: el paquete ya está %', v_package.status using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_package.student_id::text));

  select coalesce(sum(hm.minutes_delta), 0) into v_package_net
  from public.hours_movements hm where hm.package_id = p_package_id;

  select coalesce(sum(hm.minutes_delta), 0) into v_student_balance
  from public.hours_movements hm where hm.student_id = v_package.student_id;

  if v_student_balance - v_package_net < 0 then
    raise exception 'INSUFFICIENT_BALANCE: el saldo del alumno quedaría negativo (saldo actual % min, se retirarían % min)',
      v_student_balance, v_package_net using errcode = 'P0001';
  end if;

  if v_package_net <> 0 then
    insert into public.hours_movements (student_id, package_id, movement_type, minutes_delta, created_by, notes)
    values (v_package.student_id, p_package_id, 'adjustment', -v_package_net, v_admin_id, coalesce(p_reason, 'Reembolso de paquete'));
  end if;

  update public.hours_packages set status = 'refunded' where id = p_package_id
  returning * into v_after;

  perform private.write_audit_log(v_admin_id, 'HOURS_PACKAGE_REFUNDED', 'hours_package', p_package_id::text,
    to_jsonb(v_package), to_jsonb(v_after), p_reason);

  select * into v_payment_before from public.student_payments where id = v_package.payment_id;
  if found and v_payment_before.status is distinct from 'refunded' then
    update public.student_payments set status = 'refunded' where id = v_package.payment_id
    returning * into v_payment_after;

    perform private.write_audit_log(v_admin_id, 'STUDENT_PAYMENT_REFUNDED', 'student_payment', v_package.payment_id::text,
      to_jsonb(v_payment_before), to_jsonb(v_payment_after), p_reason);
  end if;

  return v_after;
end;
$function$;

revoke all on function public.admin_cancel_hours_package(bigint, text) from public, anon;
grant execute on function public.admin_cancel_hours_package(bigint, text) to authenticated;
revoke all on function public.admin_refund_hours_package(bigint, text) from public, anon;
grant execute on function public.admin_refund_hours_package(bigint, text) to authenticated;
