-- Dominio: ciclo de vida de usuarios (versión reducida, aprobada) -- "Archivar"/"Restaurar" un
-- usuario sin tocar profiles.status (mucha lógica existente depende de status='active') y sin
-- implementar eliminación definitiva (fuera de alcance de este slice).
--
-- archived_at NULL = operativo (según su status normal); archived_at NOT NULL = no operativo,
-- pero NUNCA se borra profiles/auth.users/historial. Un usuario archivado no debe seguir
-- apareciendo como candidato en flujos de selección (asignar a salón, promover a docente) --
-- eso se refuerza tanto en servidor (triggers/RPC de abajo) como en las queries de "asignables"
-- del frontend.
alter table public.profiles add column archived_at timestamptz null;

-- ============================================================================================
-- protect_profile_update (0012): se agrega archived_at a la lista de columnas bloqueadas para
-- cualquier caller no privilegiado -- mismo criterio que status/role/dni. Sin este bloqueo,
-- profiles_update_self (RLS) permitiría a cualquier usuario auto-archivarse/desarchivarse con un
-- UPDATE directo, sin pasar por admin_archive_user/admin_restore_user ni dejar auditoría.
-- ============================================================================================
create or replace function private.protect_profile_update()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_privileged boolean;
  v_pw_flag_flip_allowed boolean;
begin
  select coalesce(
    (select rolbypassrls from pg_catalog.pg_roles where rolname = session_user),
    false
  ) into v_privileged;

  if not v_privileged then
    v_privileged := private.is_admin();
  end if;

  if v_privileged then
    new.updated_at := now();
    return new;
  end if;

  v_pw_flag_flip_allowed := coalesce(current_setting('xplorenglish.allow_pw_flag_flip', true), '') = 'on';

  if new.id is distinct from old.id then
    raise exception 'PROFILE_FIELD_LOCKED: id' using errcode = '42501';
  end if;
  if new.dni is distinct from old.dni then
    raise exception 'PROFILE_FIELD_LOCKED: dni' using errcode = '42501';
  end if;
  if new.program_id is distinct from old.program_id then
    raise exception 'PROFILE_FIELD_LOCKED: program_id' using errcode = '42501';
  end if;
  if new.level is distinct from old.level then
    raise exception 'PROFILE_FIELD_LOCKED: level' using errcode = '42501';
  end if;
  if new.status is distinct from old.status then
    raise exception 'PROFILE_FIELD_LOCKED: status' using errcode = '42501';
  end if;
  if new.role is distinct from old.role then
    raise exception 'PROFILE_FIELD_LOCKED: role' using errcode = '42501';
  end if;
  if new.archived_at is distinct from old.archived_at then
    raise exception 'PROFILE_FIELD_LOCKED: archived_at' using errcode = '42501';
  end if;
  if new.created_at is distinct from old.created_at then
    raise exception 'PROFILE_FIELD_LOCKED: created_at' using errcode = '42501';
  end if;
  if new.must_change_password is distinct from old.must_change_password and not v_pw_flag_flip_allowed then
    raise exception 'PROFILE_FIELD_LOCKED: must_change_password' using errcode = '42501';
  end if;

  -- first_name, last_name, phone: sin restricción -- quedan editables por el propio usuario.

  new.updated_at := now();
  return new;
end;
$function$;

-- ============================================================================================
-- check_classroom_student_assignment (0015): un estudiante archivado no debe poder asignarse
-- como alumno de un salón (nuevo o existente) -- enforcement en servidor, no solo en el picker
-- de "asignables" del frontend.
-- ============================================================================================
create or replace function private.check_classroom_student_assignment()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_role public.user_role;
  v_status text;
  v_archived_at timestamptz;
begin
  if new.student_id is null then
    return new;
  end if;

  select role, status, archived_at into v_role, v_status, v_archived_at
  from public.profiles
  where id = new.student_id;

  if not found then
    raise exception 'INVALID_CLASSROOM_STUDENT: el perfil % no existe', new.student_id using errcode = 'P0002';
  end if;

  if v_role <> 'student' then
    raise exception 'INVALID_CLASSROOM_STUDENT: el perfil % no tiene role=student', new.student_id using errcode = 'P0001';
  end if;

  if v_status <> 'active' then
    raise exception 'INVALID_CLASSROOM_STUDENT: el perfil % no está activo', new.student_id using errcode = 'P0001';
  end if;

  if v_archived_at is not null then
    raise exception 'INVALID_CLASSROOM_STUDENT: el perfil % está archivado', new.student_id using errcode = 'P0001';
  end if;

  return new;
end;
$function$;

-- ============================================================================================
-- promote_user_to_teacher (0013): un estudiante archivado no debe poder promoverse a docente.
-- Mismo estilo exacto que la función original (sin SECURITY DEFINER -- se apoya en RLS
-- profiles_admin_all para el UPDATE, igual que antes), solo se agrega el chequeo de archived_at.
-- ============================================================================================
create or replace function public.promote_user_to_teacher(p_target_profile_id uuid, p_initial_hourly_rate numeric)
returns table (profile profiles, teacher_profile teacher_profiles)
language plpgsql
set search_path to ''
as $function$
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

  if v_target.archived_at is not null then
    raise exception 'PROFILE_ARCHIVED: el perfil % está archivado', p_target_profile_id using errcode = 'P0001';
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
$function$;
