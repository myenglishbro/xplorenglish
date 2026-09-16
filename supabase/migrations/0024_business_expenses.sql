-- Dominio: gastos administrativos de la academia (Financial Reporting -- slice 1)
-- Depende de: 0001 (private.is_admin, esquema private), 0003 (public.profiles)
--
-- Contexto: control financiero operativo mensual (Admin -> Reportes). A diferencia de
-- student_payments/teacher_payment_periods (que sí tienen un "dueño" no-admin que puede leer su
-- propia fila), un gasto administrativo no le pertenece a nadie más que a la academia -- por eso
-- la política es admin-only en ambos sentidos (select incluido), sin excepción para
-- teacher/student. Esta tabla es puramente informativa/manual: no la toca ninguna RPC ni trigger
-- de negocio, no participa en ningún cálculo de costo docente ni de horas.

create type public.expense_category as enum (
  'marketing',
  'software',
  'services',
  'rent',
  'equipment',
  'materials',
  'administration',
  'taxes',
  'other'
);

create table public.business_expenses (
  id bigint generated always as identity primary key,
  expense_date date not null,
  category public.expense_category not null,
  description text not null,
  -- numeric(10,2), nunca float -- misma convención que student_payments.amount /
  -- teacher_hours_log.amount. amount > 0 estricto (no 0, no negativo): un gasto de S/0 no es un
  -- gasto real, y uno negativo correspondería a un reembolso/nota de crédito, que no es el
  -- concepto que modela esta tabla en este slice.
  amount numeric(10, 2) not null check (amount > 0),
  payment_method text not null,
  notes text,
  -- created_by referencia a profiles (no a auth.users directamente) -- mismo patrón que
  -- hours_movements.created_by en 0007.
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index business_expenses_expense_date_idx on public.business_expenses (expense_date);
create index business_expenses_category_idx on public.business_expenses (category);

-- ── RLS ──────────────────────────────────────────────────────────────────
-- Admin-only total: sin policy alguna para teacher/student (ni siquiera de solo lectura) --
-- a diferencia de los dominios financieros existentes, acá no hay una fila "propia" que un
-- docente o estudiante deba poder ver.

alter table public.business_expenses enable row level security;

create policy business_expenses_admin_all on public.business_expenses
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));
