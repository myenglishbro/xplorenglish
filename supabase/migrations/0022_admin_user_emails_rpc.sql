-- Dominio: cierre de la migración Next -> Supabase para la resolución de emails de admin
-- Depende de: 0003 (profiles, profiles_select), 0019/0021 (mismo patrón: función pequeña,
--             SECURITY DEFINER solo cuando hay una razón técnica real, SET search_path fijo)
--
-- Contexto: frontend-vite todavía llamaba GET /api/admin/users/emails (Next Route Handler,
-- src/app/api/admin/users/emails/route.ts) porque `profiles` no tiene columna email -- solo vive
-- en auth.users, y auth.users NO se expone vía la API automática de Supabase (schema no incluido
-- en las "exposed schemas"). El Route Handler resolvía esto con auth.admin.listUsers() +
-- service_role, con cuatro round-trips servidor-a-servidor en cadena (verificar el Bearer contra
-- GoTrue, leer profiles.role vía PostgREST, listar usuarios vía la Admin API, responder) y un bug
-- de escalabilidad real: listUsers({ perPage: 200 }) solo trae la PRIMERA página de hasta 200
-- usuarios y filtra en memoria -- pasado ese umbral, emails de usuarios reales empezarían a
-- devolver null en silencio.
--
-- Esta migración reemplaza esa cadena completa por una única función SECURITY DEFINER que hace
-- exactamente lo mismo que el Route Handler autorizaba (admin, mirando solo los ids pedidos) pero
-- en una sola llamada, sin service_role en el cliente ni en la función, y sin la limitación de
-- paginación: filtra auth.users por los ids exactos vía `= any(p_user_ids)`, nunca lista a nadie
-- más.
--
-- Por qué SECURITY DEFINER es la única opción técnica real acá (a diferencia de la mayoría de
-- RPCs de este proyecto, que son SECURITY INVOKER): ningún rol de PostgREST (`anon`/`authenticated`)
-- tiene privilegios de lectura sobre auth.users -- ese schema lo administra Supabase y no está
-- pensado para consultarse directo desde clientes normales. SECURITY DEFINER hace que la función
-- corra con los privilegios de su dueño (`postgres`, ver 0019/0020), que sí puede leer auth.users,
-- sin necesidad de otorgarle ese acceso a `authenticated` en general -- exactamente el mismo
-- principio que ya usan private.validate_teacher_weekly_block/validate_teacher_session_slot para
-- leer disponibilidad/sesiones de OTROS docentes que el invocador no vería bajo su propio RLS.
--
-- Garantías de seguridad (verificadas también en vivo tras aplicar esta migración, no solo leídas
-- del código):
--   - auth.uid() debe existir (si no, UNAUTHENTICATED) -- nunca se acepta un caller anónimo.
--   - profiles.role del caller debe ser 'admin' -- student/teacher reciben NOT_AUTHORIZED.
--   - Solo acepta un array de uuid; nunca un modo "traer todos" (un array null o vacío devuelve
--     0 filas, jamás la tabla completa).
--   - SELECT explícito de auth.users.id y auth.users.email únicamente -- nunca `select *`, nunca
--     encrypted_password/tokens/raw_app_meta_data/raw_user_meta_data/etc.
--   - No se le concede EXECUTE a `anon` ni queda alcanzable por `public` -- solo `authenticated`,
--     y aun así bloqueada para cualquier rol de negocio que no sea 'admin'.
--   - No se toca ninguna policy de RLS existente ni se le da a `authenticated` ningún privilegio
--     nuevo sobre el schema `auth` -- el acceso vive enteramente dentro de esta función.
create or replace function public.get_user_emails(p_user_ids uuid[])
returns table(user_id uuid, email text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'UNAUTHENTICATED: no autenticado' using errcode = '28000';
  end if;

  if (select role from public.profiles where id = (select auth.uid())) is distinct from 'admin' then
    raise exception 'NOT_AUTHORIZED: esta operación es exclusiva para administradores' using errcode = '42501';
  end if;

  if p_user_ids is null or array_length(p_user_ids, 1) is null then
    return;
  end if;

  return query
  select u.id, u.email::text
  from auth.users u
  where u.id = any(p_user_ids);
end;
$$;

revoke all on function public.get_user_emails(uuid[]) from public, anon;
grant execute on function public.get_user_emails(uuid[]) to authenticated;
