-- Dominio: transición de rol docente -> estudiante (inversa de promote_user_to_teacher).
-- Depende de: 0003 (profiles, role_changes, teacher_profiles), 0005 (classroom_teachers),
-- 0035 (promote_user_to_teacher con chequeo de archivado), 0044 (classrooms.status 'archived').
--
-- Solo admin. Nunca borra teacher_profiles ni historial (sessions/class_records/pagos referencian
-- teacher_profiles con on delete restrict): el perfil docente queda 'inactive' para que no aparezca
-- como asignable, y se reactiva si el usuario vuelve a promoverse.

create or replace function public.demote_teacher_to_student(p_target_profile_id uuid)
returns public.profiles
language plpgsql
set search_path to ''
as $function$
declare
  v_caller_id uuid := (select auth.uid());
  v_caller_role public.user_role;
  v_target public.profiles;
begin
  if v_caller_id is null then
    raise exception 'UNAUTHENTICATED: no autenticado' using errcode = '28000';
  end if;

  select role into v_caller_role from public.profiles where id = v_caller_id;
  if v_caller_role <> 'admin' then
    raise exception 'NOT_AUTHORIZED: solo admin puede pasar un docente a estudiante' using errcode = '42501';
  end if;

  select * into v_target from public.profiles where id = p_target_profile_id for update;
  if not found then
    raise exception 'PROFILE_NOT_FOUND: perfil % no existe', p_target_profile_id using errcode = 'P0002';
  end if;

  if v_target.role <> 'teacher' then
    raise exception 'NOT_A_TEACHER: el perfil % no es docente', p_target_profile_id using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.classroom_teachers ct
    join public.classrooms c on c.id = ct.classroom_id
    where ct.teacher_id = p_target_profile_id
      and ct.status = 'active'
      and c.status <> 'archived'
  ) then
    raise exception 'HAS_ACTIVE_CLASSROOMS: el docente % tiene salones activos asignados', p_target_profile_id using errcode = 'P0001';
  end if;

  update public.profiles set role = 'student' where id = p_target_profile_id returning * into v_target;

  update public.teacher_profiles set status = 'inactive' where profile_id = p_target_profile_id;

  insert into public.role_changes (profile_id, previous_role, new_role, changed_by)
  values (p_target_profile_id, 'teacher', 'student', v_caller_id);

  return v_target;
end;
$function$;

revoke all on function public.demote_teacher_to_student(uuid) from public, anon;
grant execute on function public.demote_teacher_to_student(uuid) to authenticated;

-- promote_user_to_teacher (0035): un teacher_profiles existente (ex-docente) quedaba 'inactive' tras
-- demote_teacher_to_student; al volver a promoverlo se reactiva conservando su tarifa/bio previas.
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
  elsif v_teacher_profile.status <> 'active' then
    update public.teacher_profiles set status = 'active' where profile_id = p_target_profile_id
    returning * into v_teacher_profile;
  end if;

  if v_role_changed then
    insert into public.role_changes (profile_id, previous_role, new_role, changed_by)
    values (p_target_profile_id, v_old_role, 'teacher', v_caller_id);
  end if;

  return query select v_target, v_teacher_profile;
end;
$function$;
