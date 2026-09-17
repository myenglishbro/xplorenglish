-- Dominio: Slice F -- el detalle del salón para Teacher/Student necesita el nombre del alumno y
-- de los profesores habilitados, pero profiles_select (0003) solo permite leer la propia fila o
-- ser admin. Sin esta función, un profesor no puede ver el nombre del alumno ni un alumno el de
-- sus profesores (RLS ya lo bloquearía). Reemplaza conceptualmente a classroom_primary_teacher_name
-- (Slice A, eliminada) -- ahora devuelve TODOS los profesores habilitados, no un único titular.

create or replace function public.get_classroom_people(p_classroom_id bigint)
returns table (
  student_id uuid,
  student_first_name text,
  student_last_name text,
  teachers jsonb
)
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_student_id uuid;
begin
  if not private.can_access_classroom(p_classroom_id) then
    raise exception 'NOT_AUTHORIZED: no tienes acceso a este salón' using errcode = '42501';
  end if;

  select c.student_id into v_student_id from public.classrooms c where c.id = p_classroom_id;

  return query
  select
    v_student_id,
    p.first_name,
    p.last_name,
    coalesce((
      select jsonb_agg(jsonb_build_object('id', t.id, 'firstName', t.first_name, 'lastName', t.last_name) order by t.first_name)
      from public.classroom_teachers ct
      join public.profiles t on t.id = ct.teacher_id
      where ct.classroom_id = p_classroom_id and ct.status = 'active'
    ), '[]'::jsonb)
  from (select 1) as dummy
  left join public.profiles p on p.id = v_student_id;
end;
$$;

revoke all on function public.get_classroom_people(bigint) from public, anon;
grant execute on function public.get_classroom_people(bigint) to authenticated;
