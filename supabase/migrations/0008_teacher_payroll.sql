-- Dominio: pagos y honorarios de docentes
-- Depende de: 0003 (teacher_profiles, private.is_admin), 0006 (sessions)

create type public.teacher_payment_period_status as enum (
  'pending', 'pending_receipt', 'receipt_uploaded', 'approved', 'paid'
);

create table public.teacher_payment_periods (
  id bigint generated always as identity primary key,
  teacher_id uuid not null references public.teacher_profiles (profile_id) on delete restrict,
  period_start date not null,
  period_end date not null check (period_end >= period_start),
  total_minutes integer not null default 0 check (total_minutes >= 0), -- minutos enteros, no horas
  total_amount numeric(10, 2) not null default 0,
  status public.teacher_payment_period_status not null default 'pending',
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  -- Identidad natural del período: un mismo docente + rango de fechas identifica un unico
  -- período. Soporta la idempotencia de create_teacher_payment_period (0009): un retry con el
  -- mismo docente/rango debe encontrar y devolver este período, no crear uno nuevo ni uno vacio.
  unique (teacher_id, period_start, period_end)
);

create index teacher_payment_periods_teacher_id_idx on public.teacher_payment_periods (teacher_id);
create index teacher_payment_periods_status_idx on public.teacher_payment_periods (status);

-- teacher_hours_log: generado automáticamente al completar una sesión, siempre con
-- teacher_id = sessions.actual_teacher_id (nunca el titular del salón si difiere).
create table public.teacher_hours_log (
  id bigint generated always as identity primary key,
  session_id bigint not null references public.sessions (id) on delete restrict,
  teacher_id uuid not null references public.teacher_profiles (profile_id) on delete restrict,
  billable_minutes integer not null check (billable_minutes > 0),
  hourly_rate_snapshot numeric(10, 2) not null check (hourly_rate_snapshot >= 0),
  amount numeric(10, 2) not null check (amount >= 0),
  teacher_payment_period_id bigint references public.teacher_payment_periods (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (session_id, teacher_id)
);

create index teacher_hours_log_teacher_id_idx on public.teacher_hours_log (teacher_id);
create index teacher_hours_log_session_id_idx on public.teacher_hours_log (session_id);
create index teacher_hours_log_period_id_idx on public.teacher_hours_log (teacher_payment_period_id);

-- teacher_receipts: vínculo a período de pago OBLIGATORIO (no nullable). Un solo recibo VIGENTE
-- por período (UNIQUE) — el docente puede reemplazarlo mientras el período no esté approved/paid
-- (upload_teacher_receipt hace upsert); una vez paid, el trigger de abajo lo vuelve inmutable.
create table public.teacher_receipts (
  id bigint generated always as identity primary key,
  teacher_id uuid not null references public.teacher_profiles (profile_id) on delete restrict,
  teacher_payment_period_id bigint not null references public.teacher_payment_periods (id) on delete restrict,
  file_path text not null, -- ruta en Supabase Storage, bucket `receipts`
  uploaded_at timestamptz not null default now(),
  unique (teacher_payment_period_id)
);

create index teacher_receipts_teacher_id_idx on public.teacher_receipts (teacher_id);
-- Nota: no se crea un índice adicional para teacher_payment_period_id porque el UNIQUE de arriba
-- ya genera su propio índice único, que cubre la misma columna.

-- ── RLS ──────────────────────────────────────────────────────────────────
-- Igual que en dominios anteriores: escritura admin-only a nivel de tabla. Las operaciones
-- "agrupar horas en un período", "subir recibo" (con transición de estado) y "aprobar/pagar"
-- (DATABASE_PLAN.md §14, #7-#9) se implementan como funciones SECURITY DEFINER que validan
-- al llamante (docente dueño del período para subir recibo; admin para agrupar/aprobar/pagar).

alter table public.teacher_payment_periods enable row level security;
alter table public.teacher_hours_log enable row level security;
alter table public.teacher_receipts enable row level security;

create policy teacher_payment_periods_select_own on public.teacher_payment_periods
  for select to authenticated
  using (teacher_id = (select auth.uid()) or (select private.is_admin()));

create policy teacher_payment_periods_admin_write on public.teacher_payment_periods
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy teacher_hours_log_select_own on public.teacher_hours_log
  for select to authenticated
  using (teacher_id = (select auth.uid()) or (select private.is_admin()));

create policy teacher_hours_log_admin_write on public.teacher_hours_log
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy teacher_receipts_select_own on public.teacher_receipts
  for select to authenticated
  using (teacher_id = (select auth.uid()) or (select private.is_admin()));

create policy teacher_receipts_admin_write on public.teacher_receipts
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- ── Protección de períodos pagados (a nivel de motor, no solo de convención) ────────────────
-- "Una vez paid, bloquear modificaciones normales" (DATABASE_PLAN.md §14, #9) no puede depender
-- solo de que todo el mundo use las funciones de 0009 — la policy admin_write de esta migración
-- es `for all` y no distingue status, así que un UPDATE/DELETE directo (fuera de las funciones)
-- podría alterar un período ya pagado, o sus horas/recibos asociados. Estos triggers lo impiden
-- incondicionalmente, sin excepción ni bandera de bypass (ninguna de las funciones de 0009 nunca
-- necesita tocar un período ya `paid`).

create or replace function private.prevent_paid_period_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if TG_OP = 'DELETE' then
    if old.status = 'paid' then
      raise exception 'PERIOD_LOCKED: no se puede eliminar un período de pago ya pagado (id=%)', old.id;
    end if;
    return old;
  else
    if old.status = 'paid' then
      raise exception 'PERIOD_LOCKED: no se puede modificar un período de pago ya pagado (id=%)', old.id;
    end if;
    return new;
  end if;
end;
$$;

revoke execute on function private.prevent_paid_period_mutation() from public, anon, authenticated;

create trigger teacher_payment_periods_lock_paid
  before update or delete on public.teacher_payment_periods
  for each row execute function private.prevent_paid_period_mutation();

-- Cubre INSERT además de UPDATE/DELETE: también se bloquea enganchar una hora dictada nueva
-- (o reasignada) a un período que ya está pagado.
create or replace function private.prevent_paid_period_hours_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_period_status public.teacher_payment_period_status;
  v_period_id bigint;
  v_row_id bigint;
begin
  if TG_OP = 'DELETE' then
    v_period_id := old.teacher_payment_period_id;
    v_row_id := old.id;
  else
    v_period_id := new.teacher_payment_period_id;
    v_row_id := new.id;
  end if;

  if v_period_id is not null then
    select status into v_period_status
    from public.teacher_payment_periods
    where id = v_period_id;

    if v_period_status = 'paid' then
      raise exception 'PERIOD_LOCKED: no se puede modificar una hora dictada que pertenece a un período ya pagado (teacher_hours_log id=%)', v_row_id;
    end if;
  end if;

  if TG_OP = 'DELETE' then
    return old;
  else
    return new;
  end if;
end;
$$;

revoke execute on function private.prevent_paid_period_hours_mutation() from public, anon, authenticated;

create trigger teacher_hours_log_lock_paid_period
  before insert or update or delete on public.teacher_hours_log
  for each row execute function private.prevent_paid_period_hours_mutation();

-- Cubre INSERT además de UPDATE/DELETE: también se bloquea agregar un recibo nuevo a un
-- período que ya está pagado.
create or replace function private.prevent_paid_period_receipt_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_period_status public.teacher_payment_period_status;
  v_period_id bigint;
  v_row_id bigint;
begin
  if TG_OP = 'DELETE' then
    v_period_id := old.teacher_payment_period_id;
    v_row_id := old.id;
  else
    v_period_id := new.teacher_payment_period_id;
    v_row_id := new.id;
  end if;

  select status into v_period_status
  from public.teacher_payment_periods
  where id = v_period_id;

  if v_period_status = 'paid' then
    raise exception 'PERIOD_LOCKED: no se puede modificar un recibo de un período ya pagado (teacher_receipts id=%)', v_row_id;
  end if;

  if TG_OP = 'DELETE' then
    return old;
  else
    return new;
  end if;
end;
$$;

revoke execute on function private.prevent_paid_period_receipt_mutation() from public, anon, authenticated;

create trigger teacher_receipts_lock_paid_period
  before insert or update or delete on public.teacher_receipts
  for each row execute function private.prevent_paid_period_receipt_mutation();
