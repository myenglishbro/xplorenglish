-- Dominio: aprovisionamiento de estudiantes creados por un admin (Auth ya existe, falta profile)
-- Depende de: 0001 (private, enums), 0002 (programs), 0003 (profiles, private.is_admin),
--             0011 (mismo criterio de idempotencia/traducción de errores que complete_registration)
--
-- Contexto: complete_registration() (0011) es estrictamente auto-servicio (usa auth.uid(), no
-- acepta un target arbitrario) -- deliberadamente no se toca ni se generaliza para no debilitar
-- esa propiedad. Este archivo agrega el camino paralelo para cuando el ADMIN, no el propio
-- usuario, provisiona el profile de una identidad de Auth que él mismo creó vía
-- auth.admin.inviteUserByEmail() (Admin API, fuera de la base de datos).
--
-- account_invitations rastrea si esa invitación ya fue aceptada. No se reutiliza
-- profiles.status ('active'/'inactive') para esto: ese campo es un criterio de negocio del
-- admin, independiente de si el estudiante alguna vez activó su acceso.

create table public.account_invitations (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  invited_by uuid not null references public.profiles (id) on delete restrict,
  invited_at timestamptz not null default now(),
  accepted_at timestamptz
);

create index account_invitations_invited_by_idx on public.account_invitations (invited_by);

alter table public.account_invitations enable row level security;

-- Solo admin tiene acceso directo a esta tabla. El propio estudiante nunca la lee ni escribe
-- directamente -- su único punto de contacto es mark_invitation_accepted() (SECURITY DEFINER,
-- más abajo), que solo puede tocar su propia fila y solo la columna accepted_at.
create policy account_invitations_admin_all on public.account_invitations
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- ============================================================================================
-- admin_provision_student_profile
-- ============================================================================================
-- Crea profiles + account_invitations para un uuid que YA existe en auth.users (creado antes,
-- fuera de esta función, vía auth.admin.inviteUserByEmail() desde el servidor). role='student'
-- y status='active' están fijos en el INSERT, nunca son parámetros -- el caller no puede
-- especificar ni uno ni otro. SECURITY INVOKER: el admin ya tiene INSERT en profiles y en
-- account_invitations vía sus propias policies (profiles_admin_all / account_invitations_admin_all),
-- no hace falta bypassear RLS.
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

  -- Idempotencia por target uuid (mismo criterio que complete_registration): si el profile ya
  -- existe, se devuelve tal cual -- un retry de la Server Action tras un fallo de red no debe
  -- reinsertar ni pisar datos ya guardados.
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
    insert into public.profiles (id, first_name, last_name, dni, phone, role, status, program_id, level)
    values (p_target_id, btrim(p_first_name), btrim(p_last_name), btrim(p_dni), btrim(p_phone), 'student', 'active', p_program_id, p_level)
    returning * into v_profile;
  exception
    when unique_violation then
      -- Solo se traduce el caso de negocio conocido (DNI duplicado). Cualquier otro
      -- unique_violation -- en la práctica, profiles_pkey, que no debería poder ocurrir porque
      -- p_target_id lo generó Auth momentos antes y es la primera vez que se usa -- se re-lanza
      -- sin traducir, mismo criterio que complete_registration.
      get stacked diagnostics v_constraint = constraint_name;
      if v_constraint = 'profiles_dni_uidx' then
        raise exception 'DNI_ALREADY_REGISTERED: el DNI % ya está registrado', p_dni using errcode = 'P0001';
      else
        raise;
      end if;
  end;

  insert into public.account_invitations (profile_id, invited_by, invited_at)
  values (p_target_id, v_caller_id, now());

  return v_profile;
end;
$$;

revoke all on function public.admin_provision_student_profile(uuid, text, text, text, text, bigint, public.academic_level) from public, anon;
grant execute on function public.admin_provision_student_profile(uuid, text, text, text, text, bigint, public.academic_level) to authenticated;

-- ============================================================================================
-- mark_invitation_accepted
-- ============================================================================================
-- Sin parámetros deliberadamente: el target SIEMPRE es auth.uid(), nunca algo que el cliente
-- pueda especificar. SECURITY DEFINER porque el estudiante no tiene (ni debe tener) ninguna
-- policy propia sobre account_invitations -- este es su único punto de contacto con la tabla,
-- y la función solo puede tocar accepted_at de su propia fila (invited_by/invited_at nunca
-- aparecen en el UPDATE, así que no hay forma de que esta función los modifique).
create or replace function public.mark_invitation_accepted()
returns public.account_invitations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid := (select auth.uid());
  v_invitation public.account_invitations;
begin
  if v_caller_id is null then
    raise exception 'UNAUTHENTICATED: no autenticado' using errcode = '28000';
  end if;

  select * into v_invitation from public.account_invitations where profile_id = v_caller_id;
  if not found then
    raise exception 'INVITATION_NOT_FOUND: no existe una invitación para este usuario' using errcode = 'P0002';
  end if;

  -- Idempotente: una segunda llamada (doble clic, reintento de red) no vuelve a tocar la fila.
  if v_invitation.accepted_at is not null then
    return v_invitation;
  end if;

  update public.account_invitations
  set accepted_at = now()
  where profile_id = v_caller_id
  returning * into v_invitation;

  return v_invitation;
end;
$$;

revoke all on function public.mark_invitation_accepted() from public, anon;
grant execute on function public.mark_invitation_accepted() to authenticated;
