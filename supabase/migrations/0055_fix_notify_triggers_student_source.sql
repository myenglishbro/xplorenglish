-- Dominio: notificaciones (0049/0050/0051).
-- Corrige: notify_report_published (0051) y notify_activity_assigned (0050) leían
-- public.classroom_students, tabla eliminada en 0026 (el estudiante del salón ahora es
-- classrooms.student_id). Como plpgsql resuelve la tabla en ejecución, publicar un reporte y
-- asignar una actividad fallaban con "relation public.classroom_students does not exist"
-- (guardar borrador no, porque el trigger no avisa a nadie). Triggers y permisos no cambian.

create or replace function private.notify_report_published()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student uuid;
  v_classroom text;
begin
  if not new.published or (tg_op = 'UPDATE' and old.published) then
    return new;
  end if;

  select c.name, c.student_id into v_classroom, v_student
  from public.classrooms c where c.id = new.classroom_id;

  if v_student is not null then
    perform private.notify(v_student, 'report_published', 'Tu docente publicó un reporte',
      format('«%s» en el salón «%s».', new.title, coalesce(v_classroom, '')),
      '/student/salones/' || new.classroom_id || '?tab=reportes');
  end if;
  return new;
end;
$$;

revoke all on function private.notify_report_published() from public, anon, authenticated;

create or replace function private.notify_activity_assigned()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_classroom text;
  v_student uuid;
  v_body text;
begin
  select c.name, c.student_id into v_classroom, v_student
  from public.classrooms c where c.id = new.classroom_id;

  if v_student is null then
    return new;
  end if;

  v_body := format('«%s» en el salón «%s».', new.title, coalesce(v_classroom, ''));
  if new.due_at is not null then
    v_body := v_body || ' Fecha límite: ' || to_char(new.due_at at time zone 'America/Lima', 'DD/MM/YYYY HH24:MI') || '.';
  end if;

  perform private.notify(v_student, 'activity_assigned', 'Tienes una actividad nueva', v_body,
    '/student/salones/' || new.classroom_id || '?tab=actividades');
  return new;
end;
$$;

revoke all on function private.notify_activity_assigned() from public, anon, authenticated;
