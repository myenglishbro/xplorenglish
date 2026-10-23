-- Dominio: notificaciones de actividades (usa la tabla y private.notify de 0049).
-- Depende de: 0005 (classroom_students, classroom_teachers, classrooms), 0048 (classroom_activities,
--             activity_submissions), 0049 (notifications, private.notify).
--
-- Tres eventos:
--   1. Se asigna una actividad al salón      -> aviso al/los estudiante(s) activos del salón.
--   2. Un estudiante entrega writing/speaking -> aviso al/los docentes activos del salón (hay que dar feedback).
--   3. El docente deja o actualiza feedback   -> aviso al estudiante que entregó.
-- Los enlaces llevan ?tab=actividades para abrir el salón directamente en esa pestaña.

-- ── 1. Actividad asignada -> estudiante ─────────────────────────────────────────────────────
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
  select name into v_classroom from public.classrooms where id = new.classroom_id;

  v_body := format('«%s» en el salón «%s».', new.title, coalesce(v_classroom, ''));
  if new.due_at is not null then
    v_body := v_body || ' Fecha límite: ' || to_char(new.due_at at time zone 'America/Lima', 'DD/MM/YYYY HH24:MI') || '.';
  end if;

  for v_student in
    select cs.student_id from public.classroom_students cs
    where cs.classroom_id = new.classroom_id and cs.status::text = 'active'
  loop
    perform private.notify(v_student, 'activity_assigned', 'Tienes una actividad nueva', v_body,
      '/student/salones/' || new.classroom_id || '?tab=actividades');
  end loop;
  return new;
end;
$$;

revoke all on function private.notify_activity_assigned() from public, anon, authenticated;

create trigger classroom_activities_notify_assigned
  after insert on public.classroom_activities
  for each row execute function private.notify_activity_assigned();

-- ── 2. Entrega de writing/speaking -> docentes ──────────────────────────────────────────────
create or replace function private.notify_submission_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kind text;
  v_title text;
  v_student text;
  v_teacher uuid;
begin
  select kind, title into v_kind, v_title from public.classroom_activities where id = new.activity_id;
  if v_kind not in ('writing', 'speaking') then
    return new;
  end if;

  select btrim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')) into v_student
  from public.profiles where id = new.student_id;

  for v_teacher in
    select ct.teacher_id from public.classroom_teachers ct
    where ct.classroom_id = new.classroom_id and ct.status::text = 'active'
  loop
    perform private.notify(v_teacher, 'submission_received', 'Nueva entrega para revisar',
      format('%s entregó «%s» (%s).', coalesce(nullif(v_student, ''), 'Tu estudiante'), v_title, v_kind),
      '/teacher/salones/' || new.classroom_id || '?tab=actividades');
  end loop;
  return new;
end;
$$;

revoke all on function private.notify_submission_created() from public, anon, authenticated;

create trigger activity_submissions_notify_created
  after insert on public.activity_submissions
  for each row execute function private.notify_submission_created();

-- ── 3. Feedback del docente -> estudiante ───────────────────────────────────────────────────
create or replace function private.notify_feedback_given()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text;
begin
  if new.feedback is null or new.feedback is not distinct from old.feedback then
    return new;
  end if;

  select title into v_title from public.classroom_activities where id = new.activity_id;

  perform private.notify(
    new.student_id,
    'feedback_received',
    case when old.feedback is null then 'Tu docente te dejó feedback' else 'Tu docente actualizó su feedback' end,
    format('En «%s».', coalesce(v_title, 'tu actividad')),
    '/student/salones/' || new.classroom_id || '?tab=actividades'
  );
  return new;
end;
$$;

revoke all on function private.notify_feedback_given() from public, anon, authenticated;

create trigger activity_submissions_notify_feedback
  after update of feedback on public.activity_submissions
  for each row execute function private.notify_feedback_given();
