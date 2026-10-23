-- Dominio: reportes del docente por salón (resumen + comentario por skill) visibles al estudiante.
-- Depende de: 0005 (classrooms, is_classroom_teacher/is_classroom_student), 0003 (is_admin),
--             0049 (private.notify).
--
-- Un reporte nace como borrador (solo lo ven docentes del salón y admin) y el estudiante lo ve
-- únicamente cuando el docente lo publica. Se conservan al archivar el salón (solo los audios de
-- speaking se eliminan, ver 0048).

create table public.classroom_reports (
  id bigint generated always as identity primary key,
  classroom_id bigint not null references public.classrooms (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete restrict,
  title text not null check (length(btrim(title)) > 0),
  summary text,
  speaking_comment text,
  writing_comment text,
  listening_comment text,
  reading_comment text,
  comments text,
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint classroom_reports_has_content check (
    coalesce(btrim(summary), '') <> '' or coalesce(btrim(speaking_comment), '') <> ''
    or coalesce(btrim(writing_comment), '') <> '' or coalesce(btrim(listening_comment), '') <> ''
    or coalesce(btrim(reading_comment), '') <> '' or coalesce(btrim(comments), '') <> ''
  ),
  constraint classroom_reports_length check (
    length(coalesce(summary, '')) <= 5000 and length(coalesce(speaking_comment, '')) <= 5000
    and length(coalesce(writing_comment, '')) <= 5000 and length(coalesce(listening_comment, '')) <= 5000
    and length(coalesce(reading_comment, '')) <= 5000 and length(coalesce(comments, '')) <= 5000
  )
);

create index classroom_reports_classroom_idx on public.classroom_reports (classroom_id, created_at desc);

alter table public.classroom_reports enable row level security;

-- Lectura: admin y docentes del salón ven todo; el estudiante, solo lo publicado.
create policy classroom_reports_select on public.classroom_reports
  for select to authenticated
  using (
    (select private.is_admin())
    or (select private.is_classroom_teacher(classroom_id))
    or (published and (select private.is_classroom_student(classroom_id)))
  );

-- Escritura: docentes activos del salón (autor = quien crea). Admin solo lee/borra.
create policy classroom_reports_insert on public.classroom_reports
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and (select private.is_classroom_teacher(classroom_id))
  );

create policy classroom_reports_update on public.classroom_reports
  for update to authenticated
  using ((select private.is_classroom_teacher(classroom_id)))
  with check ((select private.is_classroom_teacher(classroom_id)));

create policy classroom_reports_delete on public.classroom_reports
  for delete to authenticated
  using ((select private.is_admin()) or (select private.is_classroom_teacher(classroom_id)));

-- Fechas automáticas: updated_at siempre; published_at al publicar (y se limpia al volver a borrador).
-- classroom_id y author_id son inmutables tras crear el reporte.
create or replace function private.classroom_reports_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' then
    new.classroom_id := old.classroom_id;
    new.author_id := old.author_id;
  end if;
  if new.published then
    if tg_op = 'INSERT' or not old.published then
      new.published_at := now();
    else
      new.published_at := old.published_at;
    end if;
  else
    new.published_at := null;
  end if;
  return new;
end;
$$;

create trigger classroom_reports_before_write
  before insert or update on public.classroom_reports
  for each row execute function private.classroom_reports_before_write();

-- Aviso al estudiante cuando se publica (solo en la transición a publicado).
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

  select name into v_classroom from public.classrooms where id = new.classroom_id;

  for v_student in
    select cs.student_id from public.classroom_students cs
    where cs.classroom_id = new.classroom_id and cs.status::text = 'active'
  loop
    perform private.notify(v_student, 'report_published', 'Tu docente publicó un reporte',
      format('«%s» en el salón «%s».', new.title, coalesce(v_classroom, '')),
      '/student/salones/' || new.classroom_id || '?tab=reportes');
  end loop;
  return new;
end;
$$;

revoke all on function private.notify_report_published() from public, anon, authenticated;

create trigger classroom_reports_notify_published
  after insert or update of published on public.classroom_reports
  for each row execute function private.notify_report_published();
