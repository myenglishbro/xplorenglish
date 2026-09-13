-- Dominio: aprovisionamiento de perfil en el registro (Auth -> profiles)
-- Depende de: 0001 (private schema), 0002 (programs), 0003 (profiles, user_role, academic_level).
--
-- Contexto (auditoría previa, solo lectura, contra el proyecto real):
--   * auth.users no tiene ningún trigger que cree automáticamente una fila en profiles.
--   * profiles solo tiene 3 policies (profiles_select, profiles_update_self, profiles_admin_all);
--     ninguna permite INSERT propio. Sin esta función, nadie puede completar su registro.
--   * role ('student') y level ('A1') ya son DEFAULT reales de columna (0003) — no se insertan
--     explícitos aquí, y "role" deliberadamente no es parámetro de esta función.
--   * profiles_dni_uidx (UNIQUE sobre dni) y profiles_program_id_fkey son los dos constraints
--     existentes que esta función debe respetar/traducir a errores legibles.
--
-- Idempotencia (alcance deliberadamente acotado): el SELECT inicial cubre el caso normal de
-- reintento (retry de red, doble llamada no simultánea). Una carrera verdaderamente concurrente
-- de dos llamadas del mismo usuario en el mismo instante no se intenta convertir en un retorno
-- idempotente aquí -- ese es un caso extraordinario que el frontend evita deshabilitando el
-- submit mientras la operación está pendiente; si ocurre igual, la propia PK de profiles es la
-- última protección: la segunda transacción falla con unique_violation sin traducir, en vez de
-- fingir una idempotencia no verificada bajo el modelo de transacciones real de Supabase RPC.

create or replace function public.complete_registration(
  p_first_name text,
  p_last_name text,
  p_dni text,
  p_phone text,
  p_program_id bigint default null
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid := (select auth.uid());
  v_profile public.profiles;
  v_constraint text;
begin
  if v_caller_id is null then
    raise exception 'UNAUTHENTICATED: no autenticado' using errcode = '28000';
  end if;

  -- Idempotencia (camino normal): si el perfil ya existe para este usuario, se devuelve tal
  -- cual. Completar el registro es una operación de una sola vez; un retry no debe pisar datos
  -- ya guardados con los parámetros de una segunda llamada.
  select * into v_profile from public.profiles where id = v_caller_id;
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
    insert into public.profiles (id, first_name, last_name, dni, phone, program_id)
    values (v_caller_id, btrim(p_first_name), btrim(p_last_name), btrim(p_dni), btrim(p_phone), p_program_id)
    returning * into v_profile;
  exception
    when unique_violation then
      -- Solo se traduce el caso de negocio conocido (DNI duplicado entre dos usuarios
      -- distintos). Cualquier otro unique_violation -- en la práctica, profiles_pkey por una
      -- carrera concurrente real del mismo usuario -- se re-lanza sin traducir: es la última
      -- protección para un caso extraordinario, no un camino que se intente "arreglar" aquí.
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

revoke all on function public.complete_registration(text, text, text, text, bigint) from public, anon;
grant execute on function public.complete_registration(text, text, text, text, bigint) to authenticated;
