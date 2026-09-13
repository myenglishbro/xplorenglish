-- Dominio: seguridad de escritura sobre perfiles (protección de columnas sensibles)
-- Depende de: 0001 (private schema), 0003 (profiles, private.is_admin)
--
-- Contexto (auditoría de solo lectura previa, contra el proyecto real): profiles_update_self
-- (0003) solo valida `id = auth.uid()` en su WITH CHECK -- no restringe qué columnas cambian.
-- Combinado con grants de tabla/columna sin restricción (authenticated tiene UPDATE sobre las
-- 11 columnas, incluida `role`), CUALQUIER usuario autenticado podía escalar su propio `role`
-- a 'admin' con un único UPDATE directo vía PostgREST. Severidad: CRÍTICA.
--
-- Esta migración cierra el hueco con un trigger BEFORE UPDATE, sin tocar profiles_update_self,
-- profiles_admin_all, profiles_select, ni ningún grant existente.
--
-- Nota de corrección de diseño: el bypass de infraestructura se evalúa contra `session_user`,
-- NO `current_user`. Dentro de una función SECURITY DEFINER, `current_user` pasa a ser el
-- DUEÑO de la función (aquí, `postgres`) durante toda la ejecución -- usarlo aquí concedería el
-- bypass siempre, sin importar quién ejecutó realmente el UPDATE. `session_user` no cambia bajo
-- SECURITY DEFINER y refleja el rol de conexión real: 'postgres' para migraciones/CLI/SQL
-- Editor/bootstrap (rolbypassrls=true, verificado), y 'authenticator' para todo el tráfico real
-- de PostgREST -- tanto admin como student de la app (rolbypassrls=false, verificado) -- que se
-- distingue únicamente por private.is_admin() (bypass 2), nunca por el rol de conexión.

create or replace function private.protect_profile_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_privileged boolean;
begin
  -- Bypass 1: ejecución de infraestructura (migraciones, SQL Editor, CLI, bootstrap de admin).
  -- pg_roles vive en pg_catalog; se califica explícitamente aunque pg_catalog ya se busca
  -- implícitamente siempre (incluso con search_path=''), por coherencia con el resto del
  -- proyecto, donde todo objeto se referencia calificado.
  select coalesce(
    (select rolbypassrls from pg_catalog.pg_roles where rolname = session_user),
    false
  ) into v_privileged;

  -- Bypass 2: admin de aplicación, validado exclusivamente vía public.profiles.role para el
  -- auth.uid() real del llamante -- nunca vía user_metadata, app_metadata ni ningún dato
  -- enviado por el cliente.
  if not v_privileged then
    v_privileged := private.is_admin();
  end if;

  if v_privileged then
    new.updated_at := now();
    return new;
  end if;

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

  -- first_name, last_name, phone: sin restricción -- quedan editables por el propio usuario.

  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.protect_profile_update() from public, anon, authenticated;

create trigger profiles_protect_update
  before update on public.profiles
  for each row
  execute function private.protect_profile_update();
