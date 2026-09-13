-- Dominio: compartido (enums usados por más de un dominio + esquema privado para helpers de RLS)
-- Depende de: nada (primera migración)

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.user_role as enum ('admin', 'teacher', 'student');
create type public.academic_level as enum ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');
