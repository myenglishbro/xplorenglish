-- Dominio: banco de preguntas (docentes/admin) + actividades asignadas a salones + entregas de
-- estudiantes (autocorrección, writing/speaking con feedback del docente).
-- Depende de: 0003 (private.is_admin), 0005 (classrooms, private.is_classroom_teacher/
--             is_classroom_student), 0010 (private.safe_bigint/safe_uuid), 0036 (private.write_audit_log),
--             0039 (private.is_teacher), 0021 (private.require_active_teacher).
--
-- Modelo:
--   exercises            -- banco compartido. Contenido COMPLETO (con respuestas correctas) en `content`.
--                           Lo ven/crean todos los docentes y admins; edita/borra solo el autor o admin.
--   classroom_activities -- una asignación de un ejercicio a un salón. Guarda una COPIA del contenido
--                           SIN respuestas (`content`): editar o borrar el ejercicio del banco jamás
--                           altera lo que un estudiante ya vio o respondió.
--   activity_answer_keys -- las respuestas correctas de esa copia, legibles solo por docente/admin.
--                           Así el estudiante nunca puede leer la solución desde la API.
--   activity_submissions -- cada intento del estudiante. Solo se escribe vía submit_activity (que
--                           califica en el servidor) y give_submission_feedback.
--
-- Formato de `content` (validado en el cliente con zod, ver server/questionBank/validation.ts):
--   { kind, title, instructions?, level?, prompt? (writing/speaking), audio_url? (listening),
--     items?: [{ type: multiple_choice|true_false|fill_blank|matching, prompt, ..., answer }] }
--   `answer` vive dentro de cada item en el banco y se separa en assign_exercise.

-- ============================================================================================
-- Tablas
-- ============================================================================================

create table public.exercises (
  id bigint generated always as identity primary key,
  created_by uuid not null references public.profiles (id) on delete restrict,
  kind text not null check (kind in ('writing', 'listening', 'speaking', 'exercise')),
  title text not null check (length(btrim(title)) > 0),
  level text,
  content jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exercises_content_kind_matches check (content ->> 'kind' = kind),
  constraint exercises_content_size check (octet_length(content::text) <= 200000)
);

create index exercises_created_by_idx on public.exercises (created_by);
create index exercises_kind_idx on public.exercises (kind);

create table public.classroom_activities (
  id bigint generated always as identity primary key,
  classroom_id bigint not null references public.classrooms (id) on delete cascade,
  exercise_id bigint references public.exercises (id) on delete set null,
  assigned_by uuid not null references public.profiles (id) on delete restrict,
  kind text not null check (kind in ('writing', 'listening', 'speaking', 'exercise')),
  title text not null,
  content jsonb not null,
  due_at timestamptz,
  created_at timestamptz not null default now()
);

create index classroom_activities_classroom_idx on public.classroom_activities (classroom_id, created_at desc);

create table public.activity_answer_keys (
  activity_id bigint primary key references public.classroom_activities (id) on delete cascade,
  answer_key jsonb not null default '[]'::jsonb
);

create table public.activity_submissions (
  id bigint generated always as identity primary key,
  activity_id bigint not null references public.classroom_activities (id) on delete cascade,
  -- Denormalizado para policies simples y para limpiar audios al archivar un salón.
  classroom_id bigint not null references public.classrooms (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  answers jsonb,
  text_response text,
  audio_path text,
  score integer,
  max_score integer,
  results jsonb,
  submitted_at timestamptz not null default now(),
  feedback text,
  feedback_by uuid references public.profiles (id) on delete set null,
  feedback_at timestamptz
);

create index activity_submissions_activity_student_idx on public.activity_submissions (activity_id, student_id, submitted_at desc);
create index activity_submissions_classroom_idx on public.activity_submissions (classroom_id) where audio_path is not null;

-- ============================================================================================
-- RLS
-- ============================================================================================

alter table public.exercises enable row level security;
alter table public.classroom_activities enable row level security;
alter table public.activity_answer_keys enable row level security;
alter table public.activity_submissions enable row level security;

-- Banco compartido: cualquier docente o admin lee todo; escribe solo lo propio (admin, todo).
create policy exercises_select on public.exercises
  for select to authenticated
  using ((select private.is_admin()) or (select private.is_teacher()));

create policy exercises_insert on public.exercises
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and ((select private.is_admin()) or (select private.is_teacher()))
  );

create policy exercises_update on public.exercises
  for update to authenticated
  using ((select private.is_admin()) or created_by = (select auth.uid()))
  with check ((select private.is_admin()) or created_by = (select auth.uid()));

create policy exercises_delete on public.exercises
  for delete to authenticated
  using ((select private.is_admin()) or created_by = (select auth.uid()));

-- Actividades: lectura para quien accede al salón; sin escritura directa (assign_exercise /
-- delete_classroom_activity son la única vía).
create policy classroom_activities_select on public.classroom_activities
  for select to authenticated
  using ((select private.can_access_classroom(classroom_id)));

-- Respuestas correctas: solo admin o docente del salón. El estudiante NO tiene policy.
create policy activity_answer_keys_select on public.activity_answer_keys
  for select to authenticated
  using (
    (select private.is_admin())
    or exists (
      select 1 from public.classroom_activities ca
      where ca.id = activity_id and (select private.is_classroom_teacher(ca.classroom_id))
    )
  );

-- Entregas: el estudiante lee las suyas; docente del salón y admin leen todas.
create policy activity_submissions_select on public.activity_submissions
  for select to authenticated
  using (
    (select private.is_admin())
    or student_id = (select auth.uid())
    or (select private.is_classroom_teacher(classroom_id))
  );

-- ============================================================================================
-- Calificación (privada): compara respuestas del estudiante contra la clave, item por item.
-- multiple_choice / true_false / matching: igualdad exacta de jsonb. fill_blank: un arreglo con
-- una respuesta por hueco; cada clave admite alternativas separadas por '|' (sin distinguir
-- mayúsculas ni espacios en los bordes). Un item vale 1 punto y solo cuenta si TODO es correcto.
-- ============================================================================================

create or replace function private.grade_activity(p_items jsonb, p_key jsonb, p_answers jsonb)
returns table (score integer, max_score integer, results jsonb)
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_n integer := coalesce(jsonb_array_length(p_items), 0);
  v_score integer := 0;
  v_results jsonb := '[]'::jsonb;
  v_ok boolean;
  v_type text;
  v_a jsonb;
  v_k jsonb;
  v_j integer;
  v_alts text[];
begin
  for i in 0 .. v_n - 1 loop
    v_type := p_items -> i ->> 'type';
    v_a := p_answers -> i;
    v_k := p_key -> i;
    v_ok := false;

    if v_a is not null and jsonb_typeof(v_a) <> 'null' and v_k is not null then
      if v_type = 'fill_blank' then
        if jsonb_typeof(v_a) = 'array' and jsonb_typeof(v_k) = 'array'
           and jsonb_array_length(v_a) = jsonb_array_length(v_k) then
          v_ok := true;
          for v_j in 0 .. jsonb_array_length(v_k) - 1 loop
            if jsonb_typeof(v_a -> v_j) <> 'string' or jsonb_typeof(v_k -> v_j) <> 'string' then
              v_ok := false;
              exit;
            end if;
            select array_agg(lower(btrim(x))) into v_alts
            from unnest(string_to_array(v_k ->> v_j, '|')) as x;
            if not (lower(btrim(v_a ->> v_j)) = any (v_alts)) then
              v_ok := false;
              exit;
            end if;
          end loop;
        end if;
      else
        v_ok := (v_a = v_k);
      end if;
    end if;

    if v_ok then v_score := v_score + 1; end if;
    v_results := v_results || to_jsonb(v_ok);
  end loop;

  return query select v_score, v_n, v_results;
end;
$$;

revoke all on function private.grade_activity(jsonb, jsonb, jsonb) from public, anon, authenticated;

-- ============================================================================================
-- assign_exercise -- copia el ejercicio al salón, separando las respuestas del contenido público.
-- ============================================================================================

create or replace function public.assign_exercise(p_exercise_id bigint, p_classroom_id bigint, p_due_at timestamptz default null)
returns public.classroom_activities
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller uuid := (select auth.uid());
  v_ex public.exercises;
  v_status text;
  v_public jsonb;
  v_key jsonb;
  v_row public.classroom_activities;
begin
  if v_caller is null then
    raise exception 'UNAUTHENTICATED: no autenticado' using errcode = '28000';
  end if;
  if not (private.is_admin() or private.is_classroom_teacher(p_classroom_id)) then
    raise exception 'NOT_AUTHORIZED: solo el docente del salón o un admin puede asignar actividades' using errcode = '42501';
  end if;

  select status into v_status from public.classrooms where id = p_classroom_id;
  if not found then
    raise exception 'CLASSROOM_NOT_FOUND: el salón % no existe', p_classroom_id using errcode = 'P0002';
  end if;
  if v_status <> 'active' then
    raise exception 'CLASSROOM_ARCHIVED: el salón está archivado' using errcode = 'P0001';
  end if;

  select * into v_ex from public.exercises where id = p_exercise_id;
  if not found then
    raise exception 'EXERCISE_NOT_FOUND: el ejercicio no existe' using errcode = 'P0002';
  end if;

  if v_ex.kind in ('exercise', 'listening')
     and (jsonb_typeof(v_ex.content -> 'items') <> 'array' or jsonb_array_length(v_ex.content -> 'items') = 0) then
    raise exception 'INVALID_CONTENT: el ejercicio no tiene preguntas' using errcode = 'P0001';
  end if;

  if v_ex.content ? 'items' then
    select
      coalesce(jsonb_agg(t.i - 'answer' order by t.ord), '[]'::jsonb),
      coalesce(jsonb_agg(coalesce(t.i -> 'answer', 'null'::jsonb) order by t.ord), '[]'::jsonb)
    into v_public, v_key
    from jsonb_array_elements(v_ex.content -> 'items') with ordinality as t (i, ord);
    v_public := (v_ex.content - 'items') || jsonb_build_object('items', v_public);
  else
    v_public := v_ex.content;
    v_key := '[]'::jsonb;
  end if;
  -- `transcript` (guion del audio de listening) es material del docente, no del estudiante.
  v_public := v_public - 'transcript';

  insert into public.classroom_activities (classroom_id, exercise_id, assigned_by, kind, title, content, due_at)
  values (p_classroom_id, v_ex.id, v_caller, v_ex.kind, v_ex.title, v_public, p_due_at)
  returning * into v_row;

  insert into public.activity_answer_keys (activity_id, answer_key) values (v_row.id, v_key);

  return v_row;
end;
$$;

revoke all on function public.assign_exercise(bigint, bigint, timestamptz) from public, anon;
grant execute on function public.assign_exercise(bigint, bigint, timestamptz) to authenticated;

-- ============================================================================================
-- delete_classroom_activity -- borra la actividad y sus entregas (cascade). Los audios se limpian
-- en el cliente (Storage no permite DELETE directo sobre storage.objects), por eso devuelve las
-- rutas de audio para que el llamador las elimine.
-- ============================================================================================

create or replace function public.delete_classroom_activity(p_activity_id bigint)
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_classroom_id bigint;
  v_paths text[];
begin
  select classroom_id into v_classroom_id from public.classroom_activities where id = p_activity_id;
  if not found then
    raise exception 'ACTIVITY_NOT_FOUND: la actividad no existe' using errcode = 'P0002';
  end if;
  if not (private.is_admin() or private.is_classroom_teacher(v_classroom_id)) then
    raise exception 'NOT_AUTHORIZED: no tienes permisos para esta acción' using errcode = '42501';
  end if;

  select coalesce(array_agg(audio_path), '{}') into v_paths
  from public.activity_submissions where activity_id = p_activity_id and audio_path is not null;

  delete from public.classroom_activities where id = p_activity_id;
  return v_paths;
end;
$$;

revoke all on function public.delete_classroom_activity(bigint) from public, anon;
grant execute on function public.delete_classroom_activity(bigint) to authenticated;

-- ============================================================================================
-- submit_activity -- único punto de escritura de entregas del estudiante. Califica en el servidor.
-- ============================================================================================

create or replace function public.submit_activity(
  p_activity_id bigint,
  p_answers jsonb default null,
  p_text text default null,
  p_audio_path text default null
)
returns public.activity_submissions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller uuid := (select auth.uid());
  v_act public.classroom_activities;
  v_status text;
  v_key jsonb;
  v_score integer;
  v_max integer;
  v_results jsonb;
  v_row public.activity_submissions;
begin
  if v_caller is null then
    raise exception 'UNAUTHENTICATED: no autenticado' using errcode = '28000';
  end if;

  select * into v_act from public.classroom_activities where id = p_activity_id;
  if not found then
    raise exception 'ACTIVITY_NOT_FOUND: la actividad no existe' using errcode = 'P0002';
  end if;
  if not private.is_classroom_student(v_act.classroom_id) then
    raise exception 'NOT_AUTHORIZED: esta actividad no es de tu salón' using errcode = '42501';
  end if;

  select status into v_status from public.classrooms where id = v_act.classroom_id;
  if v_status <> 'active' then
    raise exception 'CLASSROOM_ARCHIVED: el salón está archivado' using errcode = 'P0001';
  end if;

  if v_act.kind in ('exercise', 'listening') then
    if p_answers is null or jsonb_typeof(p_answers) <> 'array' then
      raise exception 'INVALID_ANSWERS: faltan las respuestas' using errcode = 'P0001';
    end if;
    select answer_key into v_key from public.activity_answer_keys where activity_id = v_act.id;
    select g.score, g.max_score, g.results into v_score, v_max, v_results
    from private.grade_activity(v_act.content -> 'items', coalesce(v_key, '[]'::jsonb), p_answers) g;
  elsif v_act.kind = 'writing' then
    if p_text is null or length(btrim(p_text)) = 0 then
      raise exception 'EMPTY_TEXT: escribe tu respuesta antes de enviar' using errcode = 'P0001';
    end if;
    if length(p_text) > 20000 then
      raise exception 'TEXT_TOO_LONG: el texto es demasiado largo' using errcode = 'P0001';
    end if;
  else -- speaking
    if p_audio_path is null
       or p_audio_path not like (v_act.classroom_id::text || '/' || v_act.id::text || '/' || v_caller::text || '/%') then
      raise exception 'INVALID_AUDIO: la grabación no es válida' using errcode = 'P0001';
    end if;
    if not exists (select 1 from storage.objects o where o.bucket_id = 'speaking-recordings' and o.name = p_audio_path) then
      raise exception 'INVALID_AUDIO: la grabación no se subió correctamente' using errcode = 'P0001';
    end if;
  end if;

  insert into public.activity_submissions (
    activity_id, classroom_id, student_id, answers, text_response, audio_path, score, max_score, results
  ) values (
    v_act.id, v_act.classroom_id, v_caller,
    case when v_act.kind in ('exercise', 'listening') then p_answers end,
    case when v_act.kind = 'writing' then btrim(p_text) end,
    case when v_act.kind = 'speaking' then p_audio_path end,
    v_score, v_max, v_results
  )
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.submit_activity(bigint, jsonb, text, text) from public, anon;
grant execute on function public.submit_activity(bigint, jsonb, text, text) to authenticated;

-- ============================================================================================
-- give_submission_feedback -- el docente del salón (o admin) comenta writing y speaking.
-- ============================================================================================

create or replace function public.give_submission_feedback(p_submission_id bigint, p_feedback text)
returns public.activity_submissions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller uuid := (select auth.uid());
  v_sub public.activity_submissions;
  v_kind text;
  v_row public.activity_submissions;
begin
  if v_caller is null then
    raise exception 'UNAUTHENTICATED: no autenticado' using errcode = '28000';
  end if;
  select * into v_sub from public.activity_submissions where id = p_submission_id;
  if not found then
    raise exception 'SUBMISSION_NOT_FOUND: la entrega no existe' using errcode = 'P0002';
  end if;
  if not (private.is_admin() or private.is_classroom_teacher(v_sub.classroom_id)) then
    raise exception 'NOT_AUTHORIZED: no tienes permisos para esta acción' using errcode = '42501';
  end if;
  select kind into v_kind from public.classroom_activities where id = v_sub.activity_id;
  if v_kind not in ('writing', 'speaking') then
    raise exception 'FEEDBACK_NOT_SUPPORTED: solo writing y speaking llevan feedback' using errcode = 'P0001';
  end if;
  if p_feedback is null or length(btrim(p_feedback)) = 0 then
    raise exception 'EMPTY_FEEDBACK: escribe un comentario' using errcode = 'P0001';
  end if;
  if length(p_feedback) > 5000 then
    raise exception 'FEEDBACK_TOO_LONG: el comentario es demasiado largo' using errcode = 'P0001';
  end if;

  update public.activity_submissions
     set feedback = btrim(p_feedback), feedback_by = v_caller, feedback_at = now()
   where id = p_submission_id
  returning * into v_row;
  return v_row;
end;
$$;

revoke all on function public.give_submission_feedback(bigint, text) from public, anon;
grant execute on function public.give_submission_feedback(bigint, text) to authenticated;

-- ============================================================================================
-- admin_clear_classroom_recordings -- tras archivar un salón, el cliente borra los archivos de
-- Storage (la API de Storage es la única forma soportada) y luego llama a esta RPC para dejar las
-- entregas sin referencia a audios inexistentes. Solo toca audio_path.
-- ============================================================================================

create or replace function public.admin_clear_classroom_recordings(p_classroom_id bigint)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid := (select auth.uid());
  v_count integer;
begin
  if not private.is_admin() then
    raise exception 'NOT_AUTHORIZED: esta operación es exclusiva para administradores' using errcode = '42501';
  end if;

  update public.activity_submissions set audio_path = null
   where classroom_id = p_classroom_id and audio_path is not null;
  get diagnostics v_count = row_count;

  if v_count > 0 then
    perform private.write_audit_log(v_admin_id, 'CLASSROOM_RECORDINGS_DELETED', 'classroom', p_classroom_id::text,
      null, jsonb_build_object('recordings_deleted', v_count), null);
  end if;
  return v_count;
end;
$$;

revoke all on function public.admin_clear_classroom_recordings(bigint) from public, anon;
grant execute on function public.admin_clear_classroom_recordings(bigint) to authenticated;

-- ============================================================================================
-- Storage: bucket privado de grabaciones de speaking.
-- Path: <classroom_id>/<activity_id>/<student_id>/<archivo>
-- ============================================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('speaking-recordings', 'speaking-recordings', false, 20971520,
  array['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/x-m4a'])
on conflict (id) do nothing;

-- Subir: solo el propio estudiante, en una actividad speaking de su salón activo.
create or replace function private.can_upload_recording(p_classroom_id bigint, p_activity_id bigint, p_student_id uuid)
returns boolean
language sql security definer set search_path = '' stable
as $$
  select p_classroom_id is not null and p_activity_id is not null
    and p_student_id = (select auth.uid())
    and private.is_classroom_student(p_classroom_id)
    and exists (
      select 1
      from public.classroom_activities ca
      join public.classrooms c on c.id = ca.classroom_id
      where ca.id = p_activity_id and ca.classroom_id = p_classroom_id
        and ca.kind = 'speaking' and c.status = 'active'
    );
$$;

revoke execute on function private.can_upload_recording(bigint, bigint, uuid) from public, anon, authenticated;
grant execute on function private.can_upload_recording(bigint, bigint, uuid) to authenticated;

-- Leer: admin, docente del salón, o el propio estudiante.
create or replace function private.can_read_recording(p_classroom_id bigint, p_student_id uuid)
returns boolean
language sql security definer set search_path = '' stable
as $$
  select private.is_admin()
    or (
      p_classroom_id is not null
      and (
        private.is_classroom_teacher(p_classroom_id)
        or (p_student_id = (select auth.uid()) and private.is_classroom_student(p_classroom_id))
      )
    );
$$;

revoke execute on function private.can_read_recording(bigint, uuid) from public, anon, authenticated;
grant execute on function private.can_read_recording(bigint, uuid) to authenticated;

drop policy if exists speaking_recordings_select on storage.objects;
create policy speaking_recordings_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'speaking-recordings'
    and (select private.can_read_recording(
      private.safe_bigint((storage.foldername(name))[1]),
      private.safe_uuid((storage.foldername(name))[3])
    ))
  );

drop policy if exists speaking_recordings_insert on storage.objects;
create policy speaking_recordings_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'speaking-recordings'
    and (select private.can_upload_recording(
      private.safe_bigint((storage.foldername(name))[1]),
      private.safe_bigint((storage.foldername(name))[2]),
      private.safe_uuid((storage.foldername(name))[3])
    ))
  );

-- Borrar: solo admin (limpieza al archivar el salón / borrar la actividad) o el docente del salón
-- al eliminar una actividad.
drop policy if exists speaking_recordings_delete on storage.objects;
create policy speaking_recordings_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'speaking-recordings'
    and (
      (select private.is_admin())
      or (select private.is_classroom_teacher(private.safe_bigint((storage.foldername(name))[1])))
    )
  );
