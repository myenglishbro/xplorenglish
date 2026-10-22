-- Dominio: "Mis pagos" del docente debe incluir salones archivados/finalizados.
-- Depende de: 0015 (archivar oculta el salón a sus miembros vía is_classroom_teacher),
-- 0026 (class_records, teacher_payments), 0032 (get_classroom_people).
--
-- Problema: class_records_select, classrooms_select y get_classroom_people dependen de
-- is_classroom_teacher(), que exige classrooms.status='active'. Al archivar un salón, el docente
-- deja de ver sus propias clases (y por tanto lo pagado/pendiente) de ese salón.
--
-- Solución (solo LECTURA, acotada a lo que el docente mismo dictó): NO se toca is_classroom_teacher
-- -- esa función también habilita escritura (contenido, registrar clases). Se agrega un chequeo
-- aparte basado en class_records.teacher_id = auth.uid(). Las escrituras siguen siendo admin-only /
-- RPC (register_class rechaza salones archivados), así que un salón finalizado sigue inmutable.

-- (Revierte el enfoque anterior de RPCs de historial, si llegó a ejecutarse.)
drop function if exists public.get_my_classroom_history();
drop function if exists public.get_my_classroom_history_records(bigint);

create or replace function private.has_taught_classroom(p_classroom_id bigint)
returns boolean
language sql security definer set search_path = '' stable
as $$
  select exists (
    select 1
    from public.class_records cr
    where cr.classroom_id = p_classroom_id
      and cr.teacher_id = (select auth.uid())
  );
$$;

revoke execute on function private.has_taught_classroom(bigint) from public, anon, authenticated;
grant execute on function private.has_taught_classroom(bigint) to authenticated;

-- 1) El docente siempre lee SUS PROPIAS clases, esté el salón activo o archivado.
drop policy class_records_select on public.class_records;
create policy class_records_select on public.class_records
  for select
  using (
    private.is_admin()
    or teacher_id = (select auth.uid())
    or private.is_classroom_teacher(classroom_id)
    or private.is_classroom_student(classroom_id)
  );

-- 2) Y el salón (nombre/programa) donde las dictó -- policies permisivas se combinan con OR.
create policy classrooms_select_taught on public.classrooms
  for select to authenticated
  using ((select private.has_taught_classroom(id)));

-- 3) get_classroom_people: mismo cuerpo que 0032, pero también permite a quien dictó clases en el
-- salón (necesario para resolver el nombre del alumno en el estado de cuenta del docente).
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
  if not (private.can_access_classroom(p_classroom_id) or private.has_taught_classroom(p_classroom_id)) then
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
