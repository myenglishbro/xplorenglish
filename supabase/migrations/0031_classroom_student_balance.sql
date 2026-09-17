-- Dominio: Slice F -- detalle de salón necesita mostrar el saldo del alumno a cualquier profesor
-- habilitado del salón (no solo al propio alumno/admin, que ya podían leer hours_movements por
-- RLS). Sin esta función un profesor no tiene forma de ver el saldo: hours_movements_select_own
-- (0003) solo permite student_id = auth.uid() OR is_admin().
--
-- Alcance mínimo justificado por este slice (mostrar "X min disponibles" en el salón) -- el
-- sistema completo de alertas de saldo es Slice G, esto no lo adelanta.

create or replace function public.get_classroom_student_balance(p_classroom_id bigint)
returns integer
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_caller uuid;
  v_student_id uuid;
  v_balance integer;
begin
  v_caller := (select auth.uid());
  if v_caller is null then
    raise exception 'UNAUTHENTICATED: no autenticado' using errcode = '28000';
  end if;

  select c.student_id into v_student_id from public.classrooms c where c.id = p_classroom_id;
  if v_student_id is null then
    return null;
  end if;

  if not (
    private.is_admin()
    or private.is_classroom_teacher(p_classroom_id)
    or v_student_id = v_caller
  ) then
    raise exception 'NOT_AUTHORIZED: no tienes acceso a este salón' using errcode = '42501';
  end if;

  select coalesce(sum(hm.minutes_delta), 0) into v_balance
  from public.hours_movements hm
  where hm.student_id = v_student_id;

  return v_balance;
end;
$$;

revoke all on function public.get_classroom_student_balance(bigint) from public, anon;
grant execute on function public.get_classroom_student_balance(bigint) to authenticated;
