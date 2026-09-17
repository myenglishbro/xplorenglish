-- Dominio: bitácora de administración (versión mínima aprobada). Append-only: sin policy de
-- UPDATE/DELETE para ningún rol (ni siquiera admin) -- solo INSERT vía private.write_audit_log,
-- llamado exclusivamente desde RPCs SECURITY DEFINER (admin_archive_user, admin_restore_user,
-- admin_cancel_hours_package, admin_refund_hours_package). El frontend nunca inserta acá
-- directamente.
create table public.audit_logs (
  id bigint generated always as identity primary key,
  -- ON DELETE SET NULL (no RESTRICT): el log debe sobrevivir aunque el admin autor deje de
  -- existir algún día (fuera de alcance de este slice, pero el schema no debe bloquearlo).
  admin_user_id uuid null references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  previous_data jsonb null,
  new_data jsonb null,
  reason text null,
  created_at timestamptz not null default now()
);

create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);
create index audit_logs_created_at_idx on public.audit_logs (created_at desc);

alter table public.audit_logs enable row level security;

-- Solo lectura, solo admin. Sin policy de insert/update/delete para 'authenticated' -- las
-- escrituras ocurren dentro de funciones SECURITY DEFINER (dueño postgres), que no están sujetas
-- a RLS.
create policy audit_logs_admin_select on public.audit_logs
  for select to authenticated
  using ((select private.is_admin()));

-- ============================================================================================
-- private.write_audit_log -- único punto de escritura, reutilizado por toda RPC administrativa
-- sensible. No expuesta a PostgREST (no hay grant a authenticated): solo la llaman otras
-- funciones SECURITY DEFINER, que se ejecutan con los privilegios del dueño de la función.
-- ============================================================================================
create or replace function private.write_audit_log(
  p_admin_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id text,
  p_previous_data jsonb,
  p_new_data jsonb,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
begin
  insert into public.audit_logs (admin_user_id, action, entity_type, entity_id, previous_data, new_data, reason)
  values (p_admin_id, p_action, p_entity_type, p_entity_id, p_previous_data, p_new_data, p_reason);
end;
$function$;

revoke all on function private.write_audit_log(uuid, text, text, text, jsonb, jsonb, text) from public, anon, authenticated;
