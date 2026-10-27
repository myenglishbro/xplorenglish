-- Dominio: alertas de saldo del dashboard (0033).
-- Corrige: un estudiante archivado (profiles.archived_at, 0035/0038) conserva status = 'active', así
-- que seguía apareciendo en "Sin saldo" / "Saldo bajo". Archivado = no operativo: no genera alerta.
-- Solo se agrega `p.archived_at is null` en ambas ramas; firma, permisos y orden no cambian.

create or replace function public.get_student_balance_alerts()
returns table(
  student_id uuid,
  first_name text,
  last_name text,
  balance integer,
  classroom_id bigint,
  classroom_name text
)
language plpgsql
security definer
set search_path to ''
as $$
begin
  if private.is_admin() then
    return query
      select
        p.id as student_id,
        p.first_name as first_name,
        p.last_name as last_name,
        coalesce(sum(hm.minutes_delta), 0)::int as balance,
        cl.id as classroom_id,
        cl.name as classroom_name
      from public.profiles p
      left join public.hours_movements hm on hm.student_id = p.id
      left join lateral (
        select c.id, c.name
        from public.classrooms c
        where c.student_id = p.id and c.status = 'active'
        order by c.id
        limit 1
      ) cl on true
      where p.role = 'student' and p.status = 'active' and p.archived_at is null
      group by p.id, p.first_name, p.last_name, cl.id, cl.name
      having coalesce(sum(hm.minutes_delta), 0) <= 120
      order by coalesce(sum(hm.minutes_delta), 0) asc;
    return;
  end if;

  if exists (
    select 1 from public.teacher_profiles tp
    where tp.profile_id = (select auth.uid()) and tp.status = 'active'
  ) then
    return query
      select
        p.id as student_id,
        p.first_name as first_name,
        p.last_name as last_name,
        coalesce(sum(hm.minutes_delta), 0)::int as balance,
        c.id as classroom_id,
        c.name as classroom_name
      from public.classroom_teachers ct
      join public.classrooms c on c.id = ct.classroom_id
      join public.profiles p on p.id = c.student_id
      left join public.hours_movements hm on hm.student_id = p.id
      where ct.teacher_id = (select auth.uid())
        and ct.status = 'active'
        and c.status = 'active'
        and p.status = 'active'
        and p.archived_at is null
      group by p.id, p.first_name, p.last_name, c.id, c.name
      having coalesce(sum(hm.minutes_delta), 0) <= 120
      order by coalesce(sum(hm.minutes_delta), 0) asc;
    return;
  end if;

  raise exception 'NOT_AUTHORIZED: esta operación es exclusiva para administradores o docentes' using errcode = '42501';
end;
$$;

revoke all on function public.get_student_balance_alerts() from public, anon;
grant execute on function public.get_student_balance_alerts() to authenticated;
