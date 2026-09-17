-- Dominio: rediseño operativo (Slice D) -- niveles/capacidades docentes + disponibilidad semanal.
-- Depende de: 0002 (skills), 0003 (teacher_skills, teacher_availability, private.is_admin),
-- 0021 (private.require_active_teacher).
--
-- Reutiliza el esquema existente tal cual (skills/teacher_skills/teacher_availability ya
-- representan limpiamente el modelo nuevo -- ver auditoría previa). Solo se agregan dos RPCs de
-- reemplazo-total ("set" en vez de CRUD fila-a-fila) y se retira el CRUD viejo de disponibilidad
-- (create/update/delete_my_teacher_availability, 0021), ya sin consumidores una vez migrada la UI
-- en este mismo slice.
--
-- Disponibilidad/skills son SOLO recomendación -- no bloquean register_class ni la asignación de
-- un profesor a un salón (las restricciones duras ya se eliminaron en Slice A).

-- ============================================================================
-- 1) Seed idempotente del catálogo de niveles/capacidades
-- ============================================================================

insert into public.skills (name)
values ('A1'), ('A2'), ('B1'), ('B2'), ('C1'), ('C2'), ('Kids'), ('Teens'), ('Cambridge')
on conflict (name) do nothing;

-- ============================================================================
-- 2) set_my_teacher_skills -- reemplazo total de la selección del profesor autenticado
-- ============================================================================

create or replace function public.set_my_teacher_skills(p_skill_ids bigint[])
returns setof public.skills
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_teacher_id uuid;
  v_invalid_count integer;
begin
  v_teacher_id := private.require_active_teacher();

  if p_skill_ids is null then
    raise exception 'INVALID_INPUT: p_skill_ids no puede ser null (usa un arreglo vacío para no seleccionar ninguno)' using errcode = 'P0001';
  end if;

  if array_length(p_skill_ids, 1) > 0 then
    select count(*) into v_invalid_count
    from unnest(p_skill_ids) as sid
    where not exists (select 1 from public.skills s where s.id = sid);

    if v_invalid_count > 0 then
      raise exception 'INVALID_SKILL: alguno de los niveles seleccionados no existe' using errcode = 'P0001';
    end if;
  end if;

  delete from public.teacher_skills where teacher_id = v_teacher_id;

  insert into public.teacher_skills (teacher_id, skill_id)
  select v_teacher_id, sid from unnest(p_skill_ids) as sid;

  return query
    select s.*
    from public.skills s
    join public.teacher_skills ts on ts.skill_id = s.id
    where ts.teacher_id = v_teacher_id
    order by s.id;
end;
$$;

revoke all on function public.set_my_teacher_skills(bigint[]) from public, anon;
grant execute on function public.set_my_teacher_skills(bigint[]) to authenticated;

-- ============================================================================
-- 3) set_my_teacher_availability -- reemplazo total de la disponibilidad semanal
-- ============================================================================
-- Payload: jsonb[] de {"dayOfWeek": 0-6, "startTime": "HH:MM", "endTime": "HH:MM"}
-- (0=domingo..6=sábado, mismo criterio que EXTRACT(DOW), ya usado por teacher_availability).

create or replace function public.set_my_teacher_availability(p_blocks jsonb)
returns setof public.teacher_availability
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_teacher_id uuid;
begin
  v_teacher_id := private.require_active_teacher();

  if p_blocks is null or jsonb_typeof(p_blocks) <> 'array' then
    raise exception 'INVALID_INPUT: p_blocks debe ser un arreglo' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_blocks) as b
    where (b->>'dayOfWeek') is null or ((b->>'dayOfWeek')::smallint) not between 0 and 6
  ) then
    raise exception 'INVALID_DAY: day_of_week debe estar entre 0 y 6' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_blocks) as b
    where (b->>'endTime')::time <= (b->>'startTime')::time
  ) then
    raise exception 'INVALID_TIME_RANGE: end_time debe ser mayor que start_time' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_blocks) as b
    where (b->>'startTime')::time < time '06:00' or (b->>'endTime')::time > time '23:00'
  ) then
    raise exception 'OUT_OF_RANGE: los bloques deben estar entre 06:00 y 23:00' using errcode = 'P0001';
  end if;

  -- Solapamiento (incluye duplicados exactos, que son un caso degenerado de solape) dentro del
  -- mismo día -- se instancia jsonb_array_elements() dos veces con ordinalidad propia; ambas
  -- preservan el mismo orden del arreglo, así que "ord" identifica consistentemente cada bloque
  -- entre p1 y p2 sin necesitar una tabla temporal.
  if exists (
    select 1
    from (
      select ord, (b->>'dayOfWeek')::smallint as day_of_week, (b->>'startTime')::time as start_time, (b->>'endTime')::time as end_time
      from jsonb_array_elements(p_blocks) with ordinality as t(b, ord)
    ) p1
    join (
      select ord, (b->>'dayOfWeek')::smallint as day_of_week, (b->>'startTime')::time as start_time, (b->>'endTime')::time as end_time
      from jsonb_array_elements(p_blocks) with ordinality as t(b, ord)
    ) p2
      on p1.ord < p2.ord and p1.day_of_week = p2.day_of_week
    where p1.start_time < p2.end_time and p2.start_time < p1.end_time
  ) then
    raise exception 'OVERLAPPING_BLOCKS: hay bloques solapados o duplicados en el mismo día' using errcode = 'P0001';
  end if;

  delete from public.teacher_availability where teacher_id = v_teacher_id;

  insert into public.teacher_availability (teacher_id, day_of_week, start_time, end_time)
  select v_teacher_id, (b->>'dayOfWeek')::smallint, (b->>'startTime')::time, (b->>'endTime')::time
  from jsonb_array_elements(p_blocks) as b;

  return query
    select * from public.teacher_availability
    where teacher_id = v_teacher_id
    order by day_of_week, start_time;
end;
$$;

revoke all on function public.set_my_teacher_availability(jsonb) from public, anon;
grant execute on function public.set_my_teacher_availability(jsonb) to authenticated;

-- ============================================================================
-- 4) Retiro del CRUD viejo de disponibilidad (0021) -- sin consumidores tras migrar la UI
-- ============================================================================

drop function if exists public.create_my_teacher_availability(smallint, time, time);
drop function if exists public.update_my_teacher_availability(bigint, smallint, time, time);
drop function if exists public.delete_my_teacher_availability(bigint);
