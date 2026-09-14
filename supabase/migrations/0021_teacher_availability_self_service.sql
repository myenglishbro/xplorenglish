-- Dominio: cierre de la migración Next -> Supabase para las mutaciones de teacher_availability
-- Depende de: 0003 (teacher_availability, teacher_availability_owner RLS, profiles_select,
--             teacher_profiles_select_self), 0019/0020 (mismo patrón: helper privado reutilizado
--             por varios entry points públicos, funciones SECURITY INVOKER)
--
-- Contexto: frontend-vite todavía llamaba POST/PATCH/DELETE /api/teacher/availability (Next Route
-- Handlers, src/app/api/teacher/availability/{route.ts,[id]/route.ts,guard.ts}) porque la RLS
-- actual (teacher_availability_owner, 0003) NO reproduce la regla de negocio que sí aplicaba
-- requireActiveTeacherId() en el guard de Next: "teacher_profiles.status = 'active'". La RLS de
-- 0003 solo exige teacher_id = auth.uid() -- suficiente para "solo tocas TU fila" (y, vía el FK a
-- teacher_profiles.profile_id, ya implica "eres un docente real": un student/admin sin fila propia
-- en teacher_profiles no puede insertar ninguna fila con su propio uid como teacher_id), pero NO
-- alcanza para bloquear a un docente ya desactivado. Sin esa regla en la DB, cualquier browser-direct
-- hubiera permitido que un docente inactivo siguiera escribiendo su disponibilidad -- por eso hasta
-- ahora la mutación pasaba por Next. Esta migración cierra ese hueco con tres RPCs pequeños, sin
-- tocar RLS ni el modelo de tablas.
--
-- Garantías (idénticas a requireActiveTeacherId + los .eq("teacher_id", ...) explícitos del Route
-- Handler viejo, ahora verificadas en DB en vez de en Next):
--   - auth.uid() identifica al llamante -- nunca se acepta un teacher_id arbitrario desde el
--     cliente (los tres RPCs ni siquiera lo reciben como parámetro).
--   - profiles.role debe ser 'teacher' (mismo orden de checks que el guard original: primero rol,
--     luego status).
--   - teacher_profiles.status debe ser 'active'.
--   - update/delete solo afectan la fila cuyo (id, teacher_id = auth.uid()) coincide -- WHERE
--     explícito, además de que teacher_availability_owner ya lo exigiría de todas formas por RLS.
--
-- SECURITY INVOKER en los tres (+ en el helper privado): no hace falta bypassear RLS para nada de
-- esto. teacher_availability_owner (0003) ya permite a un docente leer/escribir su propia fila, y
-- profiles_select / teacher_profiles_select_self (0003) ya permiten que cualquier usuario lea su
-- propio role/status. Los RPCs solo centralizan la validación de negocio que faltaba -- no
-- necesitan ningún privilegio que el invocador no tenga ya. Distinto del caso de 0019
-- (validate_teacher_weekly_block/session_slot son SECURITY DEFINER porque ahí sí hace falta leer
-- disponibilidad/sesiones de OTROS docentes, que el invocador no puede ver bajo su propio RLS).
--
-- Fuera de alcance (deliberado): no se cambia teacher_availability_owner ni ninguna otra policy, no
-- se toca compatibility.ts (Vite) ni los helpers de 0019 -- esos validan disponibilidad de un
-- docente CONTRA salones/sesiones ya comprometidos, un problema distinto de "quién puede escribir
-- SU PROPIA fila de disponibilidad". Reducir disponibilidad existente nunca cancela, borra,
-- desasigna ni reprograma nada: estos RPCs son un insert/update/delete simple sobre
-- teacher_availability, exactamente lo mismo que hacía el Route Handler que reemplazan -- la nueva
-- disponibilidad solo afecta decisiones futuras (próxima asignación de PRIMARY, próxima generación
-- de sesiones), nunca las sesiones/asignaciones ya existentes.

create or replace function private.require_active_teacher()
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_caller_id uuid := (select auth.uid());
  v_role public.user_role;
  v_status text;
begin
  if v_caller_id is null then
    raise exception 'UNAUTHENTICATED: no autenticado' using errcode = '28000';
  end if;

  -- Mismo orden que requireActiveTeacherId (Next): primero rol, luego estado del perfil docente --
  -- nunca se asume que solo un docente real puede tener fila en teacher_profiles.
  select role into v_role from public.profiles where id = v_caller_id;
  if v_role is null or v_role <> 'teacher' then
    raise exception 'NOT_AUTHORIZED: esta operación es exclusiva para docentes' using errcode = '42501';
  end if;

  select status into v_status from public.teacher_profiles where profile_id = v_caller_id;
  if v_status is null then
    raise exception 'NOT_AUTHORIZED: no pudimos verificar tu perfil docente' using errcode = '42501';
  end if;
  if v_status <> 'active' then
    raise exception 'TEACHER_INACTIVE: tu perfil docente está inactivo' using errcode = 'P0001';
  end if;

  return v_caller_id;
end;
$$;

revoke all on function private.require_active_teacher() from public, anon, authenticated;
grant execute on function private.require_active_teacher() to authenticated;

create or replace function public.create_my_teacher_availability(
  p_day_of_week smallint,
  p_start_time time,
  p_end_time time
)
returns public.teacher_availability
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_teacher_id uuid;
  v_row public.teacher_availability;
begin
  v_teacher_id := private.require_active_teacher();

  if p_day_of_week < 0 or p_day_of_week > 6 then
    raise exception 'INVALID_DAY: día inválido' using errcode = 'P0001';
  end if;
  if p_end_time <= p_start_time then
    raise exception 'INVALID_TIME_RANGE: la hora de fin debe ser mayor que la de inicio' using errcode = 'P0001';
  end if;

  insert into public.teacher_availability (teacher_id, day_of_week, start_time, end_time)
  values (v_teacher_id, p_day_of_week, p_start_time, p_end_time)
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.create_my_teacher_availability(smallint, time, time) from public, anon;
grant execute on function public.create_my_teacher_availability(smallint, time, time) to authenticated;

create or replace function public.update_my_teacher_availability(
  p_id bigint,
  p_day_of_week smallint,
  p_start_time time,
  p_end_time time
)
returns public.teacher_availability
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_teacher_id uuid;
  v_row public.teacher_availability;
begin
  v_teacher_id := private.require_active_teacher();

  if p_day_of_week < 0 or p_day_of_week > 6 then
    raise exception 'INVALID_DAY: día inválido' using errcode = 'P0001';
  end if;
  if p_end_time <= p_start_time then
    raise exception 'INVALID_TIME_RANGE: la hora de fin debe ser mayor que la de inicio' using errcode = 'P0001';
  end if;

  update public.teacher_availability
  set day_of_week = p_day_of_week, start_time = p_start_time, end_time = p_end_time
  where id = p_id and teacher_id = v_teacher_id
  returning * into v_row;

  if not found then
    raise exception 'BLOCK_NOT_FOUND: el bloque % no existe o no te pertenece', p_id using errcode = 'P0002';
  end if;

  return v_row;
end;
$$;

revoke all on function public.update_my_teacher_availability(bigint, smallint, time, time) from public, anon;
grant execute on function public.update_my_teacher_availability(bigint, smallint, time, time) to authenticated;

create or replace function public.delete_my_teacher_availability(p_id bigint)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_teacher_id uuid;
  v_deleted_id bigint;
begin
  v_teacher_id := private.require_active_teacher();

  delete from public.teacher_availability
  where id = p_id and teacher_id = v_teacher_id
  returning id into v_deleted_id;

  if v_deleted_id is null then
    raise exception 'BLOCK_NOT_FOUND: el bloque % no existe o no te pertenece', p_id using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.delete_my_teacher_availability(bigint) from public, anon;
grant execute on function public.delete_my_teacher_availability(bigint) to authenticated;
