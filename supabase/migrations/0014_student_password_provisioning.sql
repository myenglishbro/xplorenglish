-- Dominio: contraseña temporal obligatoria para estudiantes creados por un admin
-- Depende de: 0001 (private schema), 0003 (profiles, private.is_admin), 0012 (protect_profile_update),
--             0013 (admin_provision_student_profile)
--
-- Contexto: se reemplaza auth.admin.inviteUserByEmail() (envía correo, deja pendiente la
-- aceptación vía account_invitations) por auth.admin.createUser() con una contraseña temporal
-- generada por el servidor (fuera de la base de datos, en la Server Action) y mostrada al admin
-- una sola vez -- nunca se persiste. must_change_password es la única fuente de verdad de "este
-- estudiante todavía usa la temporal"; account_invitations se conserva intacta para el histórico
-- y para cualquier invitación por correo ya enviada antes de este cambio, pero deja de recibir
-- filas nuevas (ver admin_provision_student_profile más abajo).

alter table public.profiles
  add column must_change_password boolean not null default false;

-- ============================================================================================
-- private.protect_profile_update -- bypass angosto de una sola columna
-- ============================================================================================
-- must_change_password es, para el propio usuario, tan sensible como role/status/dni: si
-- estuviera desbloqueada sin más, cualquier estudiante podría hacer
-- `PATCH profiles SET must_change_password=false` directo por PostgREST sin cambiar nunca su
-- contraseña real, y el guard completo (requireProfile -> /change-password) quedaría inútil.
--
-- Pero SÍ hace falta que el propio estudiante pueda pasarla de true a false -- eso es
-- exactamente lo que hace mark_password_changed() más abajo. Como esa función es
-- SECURITY DEFINER, `session_user` sigue siendo 'authenticator' dentro de ella (no 'postgres'),
-- así que el bypass 1 de este trigger (session_user con rolbypassrls) no aplica, y el estudiante
-- tampoco es admin (bypass 2). Se agrega un tercer bypass, deliberadamente acotado a esta única
-- columna -- no un v_privileged general -- vía un GUC local a la transacción que SOLO
-- mark_password_changed() setea, inmediatamente antes de su único UPDATE, con is_local=true
-- (tercer argumento de set_config): no sobrevive más allá de esa transacción y no habilita nada
-- más que el cambio de must_change_password. El resto de columnas protegidas (id/dni/
-- program_id/level/status/role/created_at) sigue exactamente igual que en 0012.
create or replace function private.protect_profile_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
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

  -- Bypass 3, acotado a una sola columna: solo mark_password_changed() setea este GUC, y solo
  -- justo antes de su propio UPDATE (ver esa función). No es un v_privileged general -- no
  -- afecta ninguna otra columna de esta tabla, ni siquiera dentro de esta misma sesión.
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
$$;

revoke all on function private.protect_profile_update() from public, anon, authenticated;

-- ============================================================================================
-- mark_password_changed
-- ============================================================================================
-- Sin parámetros deliberadamente: el target SIEMPRE es auth.uid(), nunca algo que el cliente
-- pueda especificar -- mismo criterio que mark_invitation_accepted() (0013). Se llama justo
-- después de que auth.updateUser({password}) tiene éxito desde la sesión del propio estudiante
-- (mismo trust model que esa función: la RPC confía en que el cliente solo la invoca tras un
-- cambio de contraseña exitoso, no hay forma de verificar "la contraseña cambió" de forma
-- confiable desde dentro de Postgres sin depender de columnas internas de auth.users no
-- pensadas para eso).
create or replace function public.mark_password_changed()
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid := (select auth.uid());
  v_profile public.profiles;
begin
  if v_caller_id is null then
    raise exception 'UNAUTHENTICATED: no autenticado' using errcode = '28000';
  end if;

  select * into v_profile from public.profiles where id = v_caller_id;
  if not found then
    raise exception 'PROFILE_NOT_FOUND: no existe un perfil para este usuario' using errcode = 'P0002';
  end if;

  -- Idempotente: si ya está en false (doble clic, reintento de red), no se toca la fila ni se
  -- activa el bypass del trigger para nada.
  if not v_profile.must_change_password then
    return v_profile;
  end if;

  -- GUC local a esta transacción (is_local=true): expira sola al terminar, y
  -- protect_profile_update() solo la consulta para esta columna -- ver ese archivo.
  perform set_config('xplorenglish.allow_pw_flag_flip', 'on', true);

  update public.profiles
    set must_change_password = false
    where id = v_caller_id and must_change_password = true
    returning * into v_profile;

  return v_profile;
end;
$$;

revoke all on function public.mark_password_changed() from public, anon;
grant execute on function public.mark_password_changed() to authenticated;

-- ============================================================================================
-- admin_provision_student_profile -- se agrega must_change_password, se retira account_invitations
-- ============================================================================================
-- Mismo cuerpo que 0013 salvo dos cambios: (1) must_change_password se fija en true en el
-- INSERT, igual que role/status -- nunca es parámetro; (2) ya no inserta en account_invitations:
-- esa tabla modelaba "invitación por correo pendiente de aceptar", un concepto que no existe en
-- este flujo (la cuenta se crea con auth.admin.createUser() + contraseña temporal, sin correo).
-- account_invitations y sus filas existentes no se tocan ni se borran.
create or replace function public.admin_provision_student_profile(
  p_target_id uuid,
  p_first_name text,
  p_last_name text,
  p_dni text,
  p_phone text,
  p_program_id bigint,
  p_level public.academic_level
)
returns public.profiles
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_caller_id uuid := (select auth.uid());
  v_caller_role public.user_role;
  v_profile public.profiles;
  v_constraint text;
begin
  if v_caller_id is null then
    raise exception 'UNAUTHENTICATED: no autenticado' using errcode = '28000';
  end if;

  select role into v_caller_role from public.profiles where id = v_caller_id;
  if v_caller_role <> 'admin' then
    raise exception 'NOT_AUTHORIZED: solo admin puede aprovisionar estudiantes' using errcode = '42501';
  end if;

  if p_target_id is null then
    raise exception 'INVALID_TARGET: p_target_id es obligatorio' using errcode = 'P0001';
  end if;

  select * into v_profile from public.profiles where id = p_target_id;
  if found then
    return v_profile;
  end if;

  if p_first_name is null or btrim(p_first_name) = '' then
    raise exception 'INVALID_FIRST_NAME: first_name es obligatorio' using errcode = 'P0001';
  end if;
  if p_last_name is null or btrim(p_last_name) = '' then
    raise exception 'INVALID_LAST_NAME: last_name es obligatorio' using errcode = 'P0001';
  end if;
  if p_dni is null or btrim(p_dni) = '' then
    raise exception 'INVALID_DNI: dni es obligatorio' using errcode = 'P0001';
  end if;
  if p_phone is null or btrim(p_phone) = '' then
    raise exception 'INVALID_PHONE: phone es obligatorio' using errcode = 'P0001';
  end if;
  if p_program_id is not null and not exists (select 1 from public.programs where id = p_program_id) then
    raise exception 'PROGRAM_NOT_FOUND: programa % no existe', p_program_id using errcode = 'P0002';
  end if;

  begin
    insert into public.profiles
      (id, first_name, last_name, dni, phone, role, status, program_id, level, must_change_password)
    values
      (p_target_id, btrim(p_first_name), btrim(p_last_name), btrim(p_dni), btrim(p_phone), 'student', 'active', p_program_id, p_level, true)
    returning * into v_profile;
  exception
    when unique_violation then
      get stacked diagnostics v_constraint = constraint_name;
      if v_constraint = 'profiles_dni_uidx' then
        raise exception 'DNI_ALREADY_REGISTERED: el DNI % ya está registrado', p_dni using errcode = 'P0001';
      else
        raise;
      end if;
  end;

  return v_profile;
end;
$$;

revoke all on function public.admin_provision_student_profile(uuid, text, text, text, text, bigint, public.academic_level) from public, anon;
grant execute on function public.admin_provision_student_profile(uuid, text, text, text, text, bigint, public.academic_level) to authenticated;

-- ============================================================================================
-- admin_reset_student_password_flag
-- ============================================================================================
-- Compañera de la acción de admin "regenerar contraseña temporal": esta RPC solo vuelve a poner
-- must_change_password en true para un estudiante puntual; el cambio de contraseña en sí ocurre
-- del lado de la Server Action vía auth.admin.updateUserById() (Admin API, fuera de la base de
-- datos), que debe llamarse ANTES que esta RPC -- así, si el UPDATE de Auth falla, nunca se
-- llega a marcar la fila y no hay ninguna contraseña "fantasma" mostrada al admin.
--
-- SECURITY INVOKER, no SECURITY DEFINER ni bypass de trigger: el admin ya está entre los
-- "privilegiados" de protect_profile_update() (private.is_admin()), así que su propio UPDATE
-- sobre must_change_password ya pasa el trigger sin necesitar el GUC de mark_password_changed().
-- Acotada a role='student' -- no existe (ni debe existir) un flujo de contraseña temporal para
-- admin/teacher.
create or replace function public.admin_reset_student_password_flag(p_target_id uuid)
returns public.profiles
language plpgsql
security invoker
set search_path = ''
as $$
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
    raise exception 'NOT_AUTHORIZED: solo admin puede regenerar contraseñas temporales' using errcode = '42501';
  end if;

  if p_target_id is null then
    raise exception 'INVALID_TARGET: p_target_id es obligatorio' using errcode = 'P0001';
  end if;

  select * into v_target from public.profiles where id = p_target_id;
  if not found then
    raise exception 'PROFILE_NOT_FOUND: el perfil no existe' using errcode = 'P0002';
  end if;

  if v_target.role <> 'student' then
    raise exception 'TARGET_NOT_STUDENT: esta acción solo aplica a estudiantes' using errcode = 'P0001';
  end if;

  update public.profiles
    set must_change_password = true
    where id = p_target_id
    returning * into v_target;

  return v_target;
end;
$$;

revoke all on function public.admin_reset_student_password_flag(uuid) from public, anon;
grant execute on function public.admin_reset_student_password_flag(uuid) to authenticated;
