-- Dominio: horas y paquetes del estudiante (incluye student_payments, del cual hours_packages depende)
-- Depende de: 0003 (profiles, private.is_admin)
--
-- Nota de esta iteración: la tabla se llama `student_payments` (no `payments`) para no generar
-- ambigüedad con los pagos de honorarios a docentes (`teacher_payment_periods`, dominio 0008).

create type public.payment_status as enum ('pending', 'completed', 'failed', 'refunded');
create type public.package_status as enum ('active', 'exhausted', 'expired');
create type public.hours_movement_type as enum ('purchase', 'consumption', 'refund', 'adjustment', 'expiration');

create table public.student_payments (
  id bigint generated always as identity primary key,
  student_id uuid not null references public.profiles (id) on delete restrict,
  amount numeric(10, 2) not null check (amount >= 0),
  currency text not null default 'PEN',
  payment_method text not null,
  status public.payment_status not null default 'pending',
  paid_at timestamptz,
  reference text, -- referencia real del medio de pago (nullable: puede no existir en registros manuales)
  idempotency_key uuid not null unique, -- clave de idempotencia de create_hour_package; NO es reference
  created_at timestamptz not null default now()
);

create index student_payments_student_id_idx on public.student_payments (student_id);

-- `reference` sigue siendo una referencia informativa/de negocio (ej. número de operación
-- bancaria), no la clave de idempotencia (esa es `idempotency_key`, arriba). Se mantiene su
-- unicidad parcial como regla de negocio independiente: no reutilizar la misma referencia real
-- dos veces, cuando existe.
create unique index student_payments_reference_uidx on public.student_payments (reference)
  where reference is not null;

create table public.hours_packages (
  id bigint generated always as identity primary key,
  student_id uuid not null references public.profiles (id) on delete restrict,
  package_label text not null, -- ej. "5 horas", "10 horas", "20 horas"
  total_minutes integer not null check (total_minutes > 0), -- minutos enteros, no horas
  price_paid numeric(10, 2) not null check (price_paid >= 0),
  payment_id bigint not null references public.student_payments (id) on delete restrict,
  purchased_at timestamptz not null default now(),
  expires_at timestamptz, -- nullable: sin expiración obligatoria en el MVP
  status public.package_status not null default 'active'
);

create index hours_packages_student_id_idx on public.hours_packages (student_id);
create index hours_packages_payment_id_idx on public.hours_packages (payment_id);

-- hours_movements: ledger append-only, fuente de verdad del saldo del estudiante (en minutos).
create table public.hours_movements (
  id bigint generated always as identity primary key,
  student_id uuid not null references public.profiles (id) on delete restrict,
  package_id bigint references public.hours_packages (id) on delete restrict,
  session_attendance_id bigint references public.session_attendance (id) on delete restrict,
  movement_type public.hours_movement_type not null,
  minutes_delta integer not null check (minutes_delta <> 0), -- minutos enteros, no horas
  created_by uuid not null references public.profiles (id) on delete restrict,
  notes text,
  created_at timestamptz not null default now(),
  constraint hours_movements_sign_matches_type check (
    (movement_type in ('purchase', 'refund') and minutes_delta > 0)
    or (movement_type in ('consumption', 'expiration') and minutes_delta < 0)
    or (movement_type = 'adjustment')
  )
);

create index hours_movements_student_id_idx on public.hours_movements (student_id);
create index hours_movements_package_id_idx on public.hours_movements (package_id);
create index hours_movements_session_attendance_id_idx on public.hours_movements (session_attendance_id);

-- ── RLS ──────────────────────────────────────────────────────────────────
-- Nota de diseño: igual que en 0006, las escrituras son admin-only a nivel de tabla.
-- "Comprar paquete" y "registrar decisión de consumo" son operaciones transaccionales,
-- implementadas en 0009_domain_transactions.sql (create_hour_package, set_student_session_billing).

alter table public.student_payments enable row level security;
alter table public.hours_packages enable row level security;
alter table public.hours_movements enable row level security;

create policy student_payments_select_own on public.student_payments
  for select to authenticated
  using (student_id = (select auth.uid()) or (select private.is_admin()));

create policy student_payments_admin_write on public.student_payments
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy hours_packages_select_own on public.hours_packages
  for select to authenticated
  using (student_id = (select auth.uid()) or (select private.is_admin()));

create policy hours_packages_admin_write on public.hours_packages
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy hours_movements_select_own on public.hours_movements
  for select to authenticated
  using (student_id = (select auth.uid()) or (select private.is_admin()));

create policy hours_movements_admin_write on public.hours_movements
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));
