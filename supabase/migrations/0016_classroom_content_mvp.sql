-- Dominio: contenido académico del salón (módulos, lecciones, recursos) -- publicación y
-- permisos de escritura para docentes
-- Depende de: 0001 (private schema), 0003 (private.is_admin), 0005 (modules, lessons, resources,
--             private.is_classroom_teacher/is_classroom_student/can_access_classroom/
--             classroom_id_for_module/classroom_id_for_lesson), 0010 (materials bucket,
--             can_read_material/can_write_material -- sin cambios, ya cubren el path de Storage)
--
-- Contexto: 0005 ya construyó toda la jerarquía y el aislamiento por salón, pero (a) la escritura
-- de modules/lessons/resources era 100% admin-only -- ningún docente podía tocar el contenido de
-- su propio salón -- y (b) no existía ningún concepto de "borrador" -- todo lo que existiera era
-- visible de inmediato a cualquier miembro del salón. Esta migración cierra ambos huecos.
--
-- Verificado antes de escribir esta migración: modules/lessons/resources están vacías en
-- producción -- el default 'draft' no oculta contenido real de nadie.
--
-- Modelo de publicación (decisión de producto): dos niveles independientes, ambos deben estar
-- 'published' para que un ESTUDIANTE vea una lección -- un módulo en draft oculta TODAS sus
-- lecciones sin tener que despublicarlas una por una. admin y el/los docente(s) del salón
-- (PRIMARY o SUBSTITUTE, sin distinción) siempre ven todo, incluidos los drafts. Los recursos no
-- tienen estado propio: heredan la visibilidad de su lección.

alter table public.modules
  add column status text not null default 'draft' check (status in ('draft', 'published'));

alter table public.lessons
  add column status text not null default 'draft' check (status in ('draft', 'published'));

-- ============================================================================================
-- private.can_read_lesson -- cascada módulo+lección, reutilizada por lessons_select y
-- resources_select (un recurso hereda la visibilidad de su lección, sin estado propio)
-- ============================================================================================
create or replace function private.can_read_lesson(p_lesson_id bigint)
returns boolean
language sql security definer set search_path = '' stable
as $$
  select
    private.is_admin()
    or private.is_classroom_teacher(private.classroom_id_for_lesson(p_lesson_id))
    or (
      private.is_classroom_student(private.classroom_id_for_lesson(p_lesson_id))
      and exists (
        select 1
        from public.lessons l
        join public.modules m on m.id = l.module_id
        where l.id = p_lesson_id
          and l.status = 'published'
          and m.status = 'published'
      )
    );
$$;

revoke all on function private.can_read_lesson(bigint) from public, anon, authenticated;
grant execute on function private.can_read_lesson(bigint) to authenticated;

-- ============================================================================================
-- Policies de lectura: reemplazan las de 0005 para incorporar el filtro de publicación
-- ============================================================================================
-- modules: classroom_id/status ya son columnas propias de la fila -- no hace falta una función
-- dedicada, se evalúan inline. admin/docente ven todo (incl. draft); estudiante solo published.
drop policy if exists modules_select on public.modules;
create policy modules_select on public.modules
  for select to authenticated
  using (
    (select private.is_admin())
    or (select private.is_classroom_teacher(classroom_id))
    or ((select private.is_classroom_student(classroom_id)) and status = 'published')
  );

drop policy if exists lessons_select on public.lessons;
create policy lessons_select on public.lessons
  for select to authenticated
  using ((select private.can_read_lesson(id)));

drop policy if exists resources_select on public.resources;
create policy resources_select on public.resources
  for select to authenticated
  using ((select private.can_read_lesson(lesson_id)));

-- ============================================================================================
-- Policies de escritura para docentes -- coexisten con las *_admin_write de 0005 (policies
-- permisivas: Postgres las combina con OR para el mismo comando, no hace falta tocar las de
-- admin). is_classroom_teacher() no distingue PRIMARY/SUBSTITUTE -- ambos administran contenido
-- por igual (decisión de producto confirmada). Ya exige classrooms.status='active' (0015): un
-- docente pierde edición de contenido automáticamente si su salón se archiva.
-- ============================================================================================
drop policy if exists modules_teacher_write on public.modules;
create policy modules_teacher_write on public.modules
  for all to authenticated
  using ((select private.is_classroom_teacher(classroom_id)))
  with check ((select private.is_classroom_teacher(classroom_id)));

drop policy if exists lessons_teacher_write on public.lessons;
create policy lessons_teacher_write on public.lessons
  for all to authenticated
  using ((select private.is_classroom_teacher(private.classroom_id_for_module(module_id))))
  with check ((select private.is_classroom_teacher(private.classroom_id_for_module(module_id))));

drop policy if exists resources_teacher_write on public.resources;
create policy resources_teacher_write on public.resources
  for all to authenticated
  using ((select private.is_classroom_teacher(private.classroom_id_for_lesson(lesson_id))))
  with check ((select private.is_classroom_teacher(private.classroom_id_for_lesson(lesson_id))));
