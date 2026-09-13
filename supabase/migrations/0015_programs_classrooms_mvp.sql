-- Dominio: MVP de Programas y Salones (administración por admin, visibilidad por rol)
-- Depende de: 0001 (private schema), 0003 (profiles, private.is_admin), 0005 (classrooms,
--             classroom_teachers, classroom_students, private.is_classroom_teacher/
--             is_classroom_student/can_access_classroom)
--
-- El schema y las policies de 0002/0005 ya cubrían casi todo lo que pide este bloque (programas,
-- salones, roles PRIMARY/SUBSTITUTE, roster de estudiantes, y el aislamiento por rol vía
-- can_access_classroom). Esta migración cierra tres huecos encontrados en la auditoría, todos de
-- alcance acotado -- ninguno relaja una policy existente:
--   1. classroom_students no tenía forma de garantizar que student_id sea realmente un 'student'.
--   2. Un salón archivado seguía siendo 100% visible para sus miembros (is_classroom_teacher/
--      is_classroom_student no miraban classrooms.status).
--   3. Asignar el docente PRIMARY requiere una transacción atómica (desactivar el PRIMARY viejo +
--      activar el nuevo) por el índice único parcial de 0005 -- dos queries sueltas desde el
--      cliente podrían violarlo o dejar el salón momentáneamente sin titular.
--   (Y, al diseñar la UI de "Mis salones" del estudiante, un cuarto hueco: profiles_select (0003)
--    no permite que un estudiante lea el nombre de su propio docente titular.)

-- ============================================================================================
-- 1) Integridad de rol en classroom_students
-- ============================================================================================
-- Verificado antes de escribir esta migración: classroom_students está vacía en producción, así
-- que no hay filas existentes que pudieran violar esta regla -- no hace falta ningún backfill ni
-- limpieza previa. La DB es la autoridad final; la Server Action valida antes también, solo para
-- dar un mensaje amigable sin depender de parsear el error de Postgres en el camino feliz.
create or replace function private.check_classroom_student_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.user_role;
begin
  select role into v_role from public.profiles where id = new.student_id;

  if not found then
    raise exception 'INVALID_CLASSROOM_STUDENT: el perfil % no existe', new.student_id using errcode = 'P0002';
  end if;

  if v_role <> 'student' then
    raise exception 'INVALID_CLASSROOM_STUDENT: el perfil % no tiene role=student', new.student_id using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke all on function private.check_classroom_student_role() from public, anon, authenticated;

create trigger classroom_students_check_role
  before insert or update of student_id on public.classroom_students
  for each row
  execute function private.check_classroom_student_role();

-- ============================================================================================
-- 2) Salón archivado: se oculta a docentes/estudiantes, admin sigue viendo todo
-- ============================================================================================
-- Archivar NUNCA toca classroom_teachers/classroom_students -- esas filas quedan exactamente
-- como estaban (status='active' si lo eran). El corte de visibilidad ocurre solo aquí, en las
-- funciones que ya evaluaba can_access_classroom -- si el salón vuelve a 'active', sus miembros
-- activos recuperan acceso automáticamente sin ninguna acción adicional. is_admin() no pasa por
-- ninguna de estas dos funciones, así que el acceso de admin a salones archivados no cambia.
create or replace function private.is_classroom_teacher(p_classroom_id bigint)
returns boolean
language sql security definer set search_path = '' stable
as $$
  select exists (
    select 1
    from public.classroom_teachers ct
    join public.classrooms c on c.id = ct.classroom_id
    where ct.classroom_id = p_classroom_id
      and ct.teacher_id = (select auth.uid())
      and ct.status = 'active'
      and c.status = 'active'
  );
$$;

create or replace function private.is_classroom_student(p_classroom_id bigint)
returns boolean
language sql security definer set search_path = '' stable
as $$
  select exists (
    select 1
    from public.classroom_students cs
    join public.classrooms c on c.id = cs.classroom_id
    where cs.classroom_id = p_classroom_id
      and cs.student_id = (select auth.uid())
      and cs.status = 'active'
      and c.status = 'active'
  );
$$;

revoke execute on function private.is_classroom_teacher(bigint) from public, anon, authenticated;
revoke execute on function private.is_classroom_student(bigint) from public, anon, authenticated;
grant execute on function private.is_classroom_teacher(bigint) to authenticated;
grant execute on function private.is_classroom_student(bigint) to authenticated;

-- can_access_classroom() no cambia: sigue siendo is_admin() OR is_classroom_teacher() OR
-- is_classroom_student(), y ahora hereda el filtro de status='active' de las dos últimas.
-- Nota: can_access_classroom() también la usan sessions (0006) y classroom-files de storage
-- (0010) -- archivar un salón también corta, por ahora, el acceso de sus miembros a esas sesiones
-- y archivos históricos. Hoy no hay ninguna fila en sessions ni en el bucket de salones
-- (verificado antes de aplicar), así que no hay impacto real todavía; queda documentado para
-- cuando se construya el módulo de Calendario, por si ese comportamiento necesita revisarse ahí.

-- ============================================================================================
-- 3) assign_classroom_primary_teacher -- asignación atómica del docente titular
-- ============================================================================================
-- SECURITY INVOKER: el admin ya tiene INSERT/UPDATE en classroom_teachers vía su propia policy
-- (classroom_teachers_admin_write, 0005) -- no hace falta bypassear RLS. Orden dentro de la misma
-- transacción: primero desactiva cualquier PRIMARY activo distinto del target (a lo sumo 1, por
-- classroom_teachers_one_primary_active_uidx), luego hace upsert del target -- así nunca hay dos
-- PRIMARY activos ni una ventana sin ninguno cuando se está reemplazando. El upsert (ON CONFLICT
-- sobre unique(classroom_id, teacher_id)) cubre el caso de un docente que ya tenía una fila
-- inactiva o como SUBSTITUTE en este salón -- una segunda fila para el mismo (classroom_id,
-- teacher_id) violaría esa constraint si se intentara un INSERT plano.
create or replace function public.assign_classroom_primary_teacher(p_classroom_id bigint, p_teacher_id uuid)
returns public.classroom_teachers
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_caller_id uuid := (select auth.uid());
  v_caller_role public.user_role;
  v_teacher_status text;
  v_row public.classroom_teachers;
begin
  if v_caller_id is null then
    raise exception 'UNAUTHENTICATED: no autenticado' using errcode = '28000';
  end if;

  select role into v_caller_role from public.profiles where id = v_caller_id;
  if v_caller_role <> 'admin' then
    raise exception 'NOT_AUTHORIZED: solo admin puede asignar el docente titular' using errcode = '42501';
  end if;

  if not exists (select 1 from public.classrooms where id = p_classroom_id) then
    raise exception 'CLASSROOM_NOT_FOUND: el salón % no existe', p_classroom_id using errcode = 'P0002';
  end if;

  select status into v_teacher_status from public.teacher_profiles where profile_id = p_teacher_id;
  if not found then
    raise exception 'TEACHER_NOT_FOUND: % no es un docente', p_teacher_id using errcode = 'P0002';
  end if;
  if v_teacher_status <> 'active' then
    raise exception 'TEACHER_INACTIVE: el docente no está activo' using errcode = 'P0001';
  end if;

  update public.classroom_teachers
    set status = 'inactive'
    where classroom_id = p_classroom_id
      and teacher_role = 'PRIMARY'
      and status = 'active'
      and teacher_id <> p_teacher_id;

  insert into public.classroom_teachers (classroom_id, teacher_id, teacher_role, status)
  values (p_classroom_id, p_teacher_id, 'PRIMARY', 'active')
  on conflict (classroom_id, teacher_id)
  do update set teacher_role = 'PRIMARY', status = 'active'
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.assign_classroom_primary_teacher(bigint, uuid) from public, anon;
grant execute on function public.assign_classroom_primary_teacher(bigint, uuid) to authenticated;

-- ============================================================================================
-- 4) classroom_primary_teacher_name -- exposición mínima para "Mis salones" del estudiante
-- ============================================================================================
-- profiles_select (0003) es -- deliberadamente -- "solo tu propia fila, o admin". No se toca: en
-- vez de una policy nueva que expondría dni/phone/email del docente (RLS es por fila, no por
-- columna), esta función SECURITY DEFINER devuelve únicamente first_name/last_name, y solo del
-- PRIMARY activo del salón. Antes de leer nada valida que el caller pueda acceder a ese salón
-- (can_access_classroom) -- sin esa validación, cualquier authenticated podría sondear nombres de
-- docentes de salones ajenos pasando cualquier p_classroom_id. Sin PRIMARY activo, devuelve cero
-- filas (no es un error: un salón recién creado, sin titular todavía, es un estado válido). No es
-- un helper genérico -- no acepta ninguna otra columna ni ningún otro rol.
create or replace function public.classroom_primary_teacher_name(p_classroom_id bigint)
returns table (first_name text, last_name text)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if not private.can_access_classroom(p_classroom_id) then
    raise exception 'NOT_AUTHORIZED: no tienes acceso a este salón' using errcode = '42501';
  end if;

  return query
    select p.first_name, p.last_name
    from public.classroom_teachers ct
    join public.profiles p on p.id = ct.teacher_id
    where ct.classroom_id = p_classroom_id
      and ct.teacher_role = 'PRIMARY'
      and ct.status = 'active';
end;
$$;

revoke all on function public.classroom_primary_teacher_name(bigint) from public, anon;
grant execute on function public.classroom_primary_teacher_name(bigint) to authenticated;
