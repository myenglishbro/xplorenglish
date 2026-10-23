-- Dominio: notificaciones in-app (campana de la barra superior).
-- Depende de: 0003 (profiles), 0005 (classroom_teachers, classrooms).
--
-- Primer evento: cuando se habilita a un docente en un salón (alta nueva o reactivación) se le crea
-- la notificación "Nueva clase asignada". La tabla es genérica (type/title/body/link) para sumar
-- otros eventos después sin cambiar el esquema.
--
-- Escritura: solo funciones SECURITY DEFINER (private.notify desde triggers). El usuario únicamente
-- lee las suyas y las marca como leídas vía RPC -- no puede insertar ni editar contenido.

create table public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index notifications_user_unread_idx on public.notifications (user_id) where read_at is null;

alter table public.notifications enable row level security;

create policy notifications_select_own on public.notifications
  for select to authenticated
  using (user_id = (select auth.uid()));

-- ── Helper de creación (solo triggers/funciones definer) ────────────────────────────────────

create or replace function private.notify(p_user_id uuid, p_type text, p_title text, p_body text, p_link text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, type, title, body, link)
  values (p_user_id, p_type, p_title, p_body, p_link);
$$;

revoke all on function private.notify(uuid, text, text, text, text) from public, anon, authenticated;

-- ── Marcar como leídas ──────────────────────────────────────────────────────────────────────

create or replace function public.mark_notification_read(p_id bigint)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.notifications
     set read_at = now()
   where id = p_id and user_id = (select auth.uid()) and read_at is null;
$$;

create or replace function public.mark_all_notifications_read()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.notifications
     set read_at = now()
   where user_id = (select auth.uid()) and read_at is null;
$$;

revoke all on function public.mark_notification_read(bigint) from public, anon;
revoke all on function public.mark_all_notifications_read() from public, anon;
grant execute on function public.mark_notification_read(bigint) to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;

-- ── Evento: docente habilitado en un salón ──────────────────────────────────────────────────
-- Dispara en INSERT o cuando el vínculo vuelve a 'active'. Un upsert sobre un vínculo que ya estaba
-- activo (old.status = 'active') NO notifica de nuevo.

create or replace function private.notify_teacher_assigned()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
  v_level text;
  v_status text;
begin
  if new.status::text <> 'active' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status::text = 'active' then
    return new;
  end if;

  select c.name, c.level::text, c.status into v_name, v_level, v_status
  from public.classrooms c where c.id = new.classroom_id;
  if not found or v_status <> 'active' then
    return new;
  end if;

  perform private.notify(
    new.teacher_id,
    'classroom_assigned',
    'Tienes una clase nueva asignada',
    format('Se te asignó el salón «%s» (nivel %s).', v_name, v_level),
    '/teacher/salones/' || new.classroom_id
  );
  return new;
end;
$$;

revoke all on function private.notify_teacher_assigned() from public, anon, authenticated;

create trigger classroom_teachers_notify_assigned
  after insert or update of status on public.classroom_teachers
  for each row execute function private.notify_teacher_assigned();

-- ── Realtime: la campana se actualiza sin recargar ──────────────────────────────────────────
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
     ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;
