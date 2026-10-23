-- Dominio: foto de perfil (URL) y docentes visibles en las tarjetas de salón.
-- Depende de: 0003 (profiles), 0005 (classroom_teachers, private.can_access_classroom),
--             0012 (private.protect_profile_update: no bloquea columnas nuevas, así que cada usuario
--             edita la suya con profiles_update_self).
--
-- La foto vive en profiles.photo_url (no en teacher_profiles, que no tiene policy de UPDATE para el
-- docente). Es solo una URL https: la app no sube archivos. El cliente normaliza enlaces de Google
-- Drive a su miniatura (ver lib/images/photoUrl.ts).
--
-- profiles_select solo deja leer la fila propia, así que un estudiante no puede leer la foto de su
-- docente directamente: get_classroom_teachers_cards la expone, acotada a los salones a los que el
-- llamante tiene acceso y solo con nombre y foto (nada de DNI, teléfono, etc.).

alter table public.profiles
  add column photo_url text
  check (photo_url is null or (length(photo_url) <= 500 and photo_url ~* '^https://'));

create or replace function public.get_classroom_teachers_cards(p_classroom_ids bigint[])
returns table (classroom_id bigint, teacher_id uuid, first_name text, last_name text, photo_url text)
language sql
security definer
set search_path = ''
stable
as $$
  select ct.classroom_id, p.id, p.first_name, p.last_name, p.photo_url
  from public.classroom_teachers ct
  join public.profiles p on p.id = ct.teacher_id
  where ct.classroom_id = any (p_classroom_ids)
    and ct.status::text = 'active'
    and private.can_access_classroom(ct.classroom_id)
  order by ct.classroom_id, p.first_name, p.last_name;
$$;

revoke all on function public.get_classroom_teachers_cards(bigint[]) from public, anon;
grant execute on function public.get_classroom_teachers_cards(bigint[]) to authenticated;
