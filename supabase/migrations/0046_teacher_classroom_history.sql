-- Dominio: historial de salones dictados por un docente (incluye salones archivados / finalizados).
-- Depende de: 0015 (archivar oculta el salón a sus miembros vía is_classroom_teacher),
-- 0026 (class_records, teacher_payments), 0044 (register_class bloquea salones archivados).
--
-- Por qué RPCs y no relajar RLS: is_classroom_teacher() también habilita ESCRITURA (contenido del
-- salón, registrar clases). Abrirla a salones archivados daría permisos de edición sobre salones
-- finalizados. Estas funciones son SECURITY DEFINER pero solo devuelven filas de class_records con
-- teacher_id = auth.uid(): lectura pura, acotada al propio docente, sin tocar ninguna policy.

create or replace function public.get_my_classroom_history()
returns table (
  classroom_id bigint,
  classroom_name text,
  program_name text,
  level public.academic_level,
  classroom_status text,
  is_active_member boolean,
  student_name text,
  classes_count integer,
  rescheduled_count integer,
  total_minutes integer,
  total_amount numeric,
  paid_amount numeric,
  pending_amount numeric,
  first_class_at timestamptz,
  last_class_at timestamptz
)
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_caller_id uuid := (select auth.uid());
begin
  if v_caller_id is null then
    raise exception 'UNAUTHENTICATED: no autenticado' using errcode = '28000';
  end if;

  return query
  select
    c.id,
    c.name,
    pr.name,
    c.level,
    c.status,
    exists (
      select 1 from public.classroom_teachers ct
      where ct.classroom_id = c.id and ct.teacher_id = v_caller_id and ct.status = 'active'
    ),
    nullif(trim(coalesce(sp.first_name, '') || ' ' || coalesce(sp.last_name, '')), ''),
    (count(*) filter (where cr.status <> 'rescheduled'))::integer,
    (count(*) filter (where cr.status = 'rescheduled'))::integer,
    coalesce(sum(cr.minutes), 0)::integer,
    coalesce(sum(cr.amount), 0),
    coalesce(sum(cr.amount) filter (where cr.teacher_payment_id is not null), 0),
    coalesce(sum(cr.amount) filter (where cr.teacher_payment_id is null), 0),
    min(cr.occurred_at),
    max(cr.occurred_at)
  from public.class_records cr
  join public.classrooms c on c.id = cr.classroom_id
  left join public.programs pr on pr.id = c.program_id
  left join public.profiles sp on sp.id = c.student_id
  where cr.teacher_id = v_caller_id
  group by c.id, c.name, pr.name, c.level, c.status, sp.first_name, sp.last_name
  order by max(cr.occurred_at) desc;
end;
$function$;

create or replace function public.get_my_classroom_history_records(p_classroom_id bigint)
returns table (
  id bigint,
  occurred_at timestamptz,
  status public.class_record_status,
  minutes integer,
  hourly_rate_snapshot numeric,
  amount numeric,
  teacher_payment_id bigint,
  paid_at timestamptz,
  notes text
)
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_caller_id uuid := (select auth.uid());
begin
  if v_caller_id is null then
    raise exception 'UNAUTHENTICATED: no autenticado' using errcode = '28000';
  end if;

  return query
  select
    cr.id, cr.occurred_at, cr.status, cr.minutes, cr.hourly_rate_snapshot, cr.amount,
    cr.teacher_payment_id, tp.paid_at, cr.notes
  from public.class_records cr
  left join public.teacher_payments tp on tp.id = cr.teacher_payment_id
  where cr.classroom_id = p_classroom_id
    and cr.teacher_id = v_caller_id
  order by cr.occurred_at desc;
end;
$function$;

revoke all on function public.get_my_classroom_history() from public, anon;
revoke all on function public.get_my_classroom_history_records(bigint) from public, anon;
grant execute on function public.get_my_classroom_history() to authenticated;
grant execute on function public.get_my_classroom_history_records(bigint) to authenticated;
