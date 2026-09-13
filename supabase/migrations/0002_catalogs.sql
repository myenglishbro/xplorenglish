-- Dominio: catálogos académicos (sin dependencia de identidad)
-- Depende de: 0001 (ninguna referencia real, pero se numera después del esquema compartido)

create table public.programs (
  id bigint generated always as identity primary key,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.skills (
  id bigint generated always as identity primary key,
  name text not null unique,
  created_at timestamptz not null default now()
);

alter table public.programs enable row level security;
alter table public.skills enable row level security;

-- Lectura abierta a cualquier usuario autenticado; escritura solo admin.
-- (private.is_admin() se define en 0003_identity.sql; estas policies de escritura
--  se crean recién ahí para no adelantar una dependencia hacia una función que no existe todavía.)

create policy programs_select_authenticated on public.programs
  for select to authenticated
  using (true);

create policy skills_select_authenticated on public.skills
  for select to authenticated
  using (true);
