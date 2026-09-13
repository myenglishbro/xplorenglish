-- Dominio: Supabase Storage (buckets privados y policies sobre storage.objects)
-- Depende de: 0001 (private schema), 0003 (private.is_admin), 0005 (classroom_teachers,
--             classroom_students, private.is_classroom_teacher/is_classroom_student/
--             can_access_classroom/classroom_id_for_lesson), 0007 (student_payments),
--             0008 (teacher_payment_periods), 0009 (upload_teacher_receipt: fija el prefijo
--             'receipts/<teacher_id>/<period_id>/' que este archivo reproduce en el path del
--             objeto de Storage, por compatibilidad — no se modifica 0009).
--
-- Convención de paths (ningún nombre de archivo se usa para autorizar, solo carpetas):
--   materials/<classroom_id>/<lesson_id>/<filename>
--   teacher-receipts/receipts/<teacher_id>/<teacher_payment_period_id>/<filename>
--   student-payment-proofs/<student_id>/<payment_id>/<filename>

-- ── Buckets (privados, con límites de tamaño/MIME) ──────────────────────────────────────────
-- on conflict do nothing: hace el insert seguro de re-ejecutar sin duplicar filas.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('materials', 'materials', false, 52428800, array['application/pdf']),
  ('teacher-receipts', 'teacher-receipts', false, 10485760,
    array['application/pdf', 'image/jpeg', 'image/png']),
  ('student-payment-proofs', 'student-payment-proofs', false, 10485760,
    array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

-- ── Helpers de parsing de path (sin acceso a tablas, no requieren SECURITY DEFINER) ─────────
-- pg_input_is_valid (PG16+) evita que un segmento de path malformado lance excepción: si no es
-- un bigint/uuid válido, la función devuelve NULL en vez de abortar la evaluación de la policy.

create or replace function private.safe_bigint(p_text text)
returns bigint
language sql
immutable
set search_path = ''
as $$
  select case when pg_input_is_valid(p_text, 'bigint') then p_text::bigint else null end;
$$;

revoke all on function private.safe_bigint(text) from public, anon, authenticated;
grant execute on function private.safe_bigint(text) to authenticated;

create or replace function private.safe_uuid(p_text text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case when pg_input_is_valid(p_text, 'uuid') then p_text::uuid else null end;
$$;

revoke all on function private.safe_uuid(text) from public, anon, authenticated;
grant execute on function private.safe_uuid(text) to authenticated;

-- ── Helpers de autorización (SECURITY DEFINER: cruzan tablas cuyo RLS bloquearía la
--    comprobación si se evaluaran como el usuario invocante) ────────────────────────────────

-- materials: exige que lesson_id (del path) pertenezca realmente a classroom_id (del path),
-- vía la relación real lessons -> modules -> classrooms (private.classroom_id_for_lesson, 0005).
-- Sin esto, un docente del salón A podría usar un lesson_id del salón B en el path y aparentar
-- pertenencia. Lectura: admin, docente activo o estudiante activo del salón (can_access_classroom).
create or replace function private.can_read_material(p_classroom_id bigint, p_lesson_id bigint)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select private.is_admin()
    or (
      p_classroom_id is not null
      and p_lesson_id is not null
      and private.classroom_id_for_lesson(p_lesson_id) = p_classroom_id
      and private.can_access_classroom(p_classroom_id)
    );
$$;

revoke all on function private.can_read_material(bigint, bigint) from public, anon, authenticated;
grant execute on function private.can_read_material(bigint, bigint) to authenticated;

-- Escritura: igual que la lectura pero solo docente activo del salón (nunca estudiante).
create or replace function private.can_write_material(p_classroom_id bigint, p_lesson_id bigint)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select private.is_admin()
    or (
      p_classroom_id is not null
      and p_lesson_id is not null
      and private.classroom_id_for_lesson(p_lesson_id) = p_classroom_id
      and private.is_classroom_teacher(p_classroom_id)
    );
$$;

revoke all on function private.can_write_material(bigint, bigint) from public, anon, authenticated;
grant execute on function private.can_write_material(bigint, bigint) to authenticated;

-- teacher-receipts: escritura solo si el período (teacher_payment_periods) sigue en un estado
-- editable. Reproduce a nivel de Storage la misma regla que ya aplica upload_teacher_receipt()
-- y los triggers *_lock_paid_period de 0008 (PERIOD_LOCKED una vez approved/paid).
create or replace function private.can_manage_receipt(p_teacher_id uuid, p_period_id bigint)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select private.is_admin()
    or (
      p_teacher_id is not null
      and p_period_id is not null
      and p_teacher_id = (select auth.uid())
      and exists (
        select 1 from public.teacher_payment_periods tpp
        where tpp.id = p_period_id
          and tpp.teacher_id = p_teacher_id
          and tpp.status in ('pending', 'pending_receipt', 'receipt_uploaded')
      )
    );
$$;

revoke all on function private.can_manage_receipt(uuid, bigint) from public, anon, authenticated;
grant execute on function private.can_manage_receipt(uuid, bigint) to authenticated;

-- student-payment-proofs: lectura sin restricción de estado (el dueño siempre puede ver su
-- comprobante); exige además que payment_id (del path) pertenezca realmente a student_id.
create or replace function private.can_read_payment_proof(p_student_id uuid, p_payment_id bigint)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select private.is_admin()
    or (
      p_student_id is not null
      and p_payment_id is not null
      and p_student_id = (select auth.uid())
      and exists (
        select 1 from public.student_payments sp
        where sp.id = p_payment_id and sp.student_id = p_student_id
      )
    );
$$;

revoke all on function private.can_read_payment_proof(uuid, bigint) from public, anon, authenticated;
grant execute on function private.can_read_payment_proof(uuid, bigint) to authenticated;

-- Escritura (insert/update): solo mientras el pago esté en un estado editable. Valores exactos
-- del enum public.payment_status (0007): pending, completed, failed, refunded. 'pending' y
-- 'failed' son editables; 'completed' y 'refunded' quedan protegidos (pago ya confirmado, o
-- confirmado-y-reembolsado: en ambos casos es un registro financiero cerrado).
create or replace function private.can_write_payment_proof(p_student_id uuid, p_payment_id bigint)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select private.is_admin()
    or (
      p_student_id is not null
      and p_payment_id is not null
      and p_student_id = (select auth.uid())
      and exists (
        select 1 from public.student_payments sp
        where sp.id = p_payment_id
          and sp.student_id = p_student_id
          and sp.status in ('pending', 'failed')
      )
    );
$$;

revoke all on function private.can_write_payment_proof(uuid, bigint) from public, anon, authenticated;
grant execute on function private.can_write_payment_proof(uuid, bigint) to authenticated;

-- ── Policies: materials ──────────────────────────────────────────────────────────────────────
-- drop if exists antes de cada create: hace la creación de policies determinista y segura de
-- re-ejecutar (CREATE POLICY no soporta IF NOT EXISTS).

drop policy if exists materials_select on storage.objects;
create policy materials_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'materials'
    and (select private.can_read_material(
      private.safe_bigint((storage.foldername(name))[1]),
      private.safe_bigint((storage.foldername(name))[2])
    ))
  );

drop policy if exists materials_teacher_admin_write on storage.objects;
create policy materials_teacher_admin_write on storage.objects
  for all to authenticated
  using (
    bucket_id = 'materials'
    and (select private.can_write_material(
      private.safe_bigint((storage.foldername(name))[1]),
      private.safe_bigint((storage.foldername(name))[2])
    ))
  )
  with check (
    bucket_id = 'materials'
    and (select private.can_write_material(
      private.safe_bigint((storage.foldername(name))[1]),
      private.safe_bigint((storage.foldername(name))[2])
    ))
  );

-- ── Policies: teacher-receipts ───────────────────────────────────────────────────────────────
-- Path: receipts/<teacher_id>/<teacher_payment_period_id>/<filename> -> [1]='receipts',
-- [2]=teacher_id, [3]=period_id. El literal [1]='receipts' se valida explícitamente (no solo se
-- asume): un objeto que no siga la convención no matchea ninguna policy, ni siquiera para admin.

drop policy if exists teacher_receipts_select_own on storage.objects;
create policy teacher_receipts_select_own on storage.objects
  for select to authenticated
  using (
    bucket_id = 'teacher-receipts'
    and (storage.foldername(name))[1] = 'receipts'
    and (
      (select private.is_admin())
      or private.safe_uuid((storage.foldername(name))[2]) = (select auth.uid())
    )
  );

drop policy if exists teacher_receipts_write_own on storage.objects;
create policy teacher_receipts_write_own on storage.objects
  for all to authenticated
  using (
    bucket_id = 'teacher-receipts'
    and (storage.foldername(name))[1] = 'receipts'
    and (select private.can_manage_receipt(
      private.safe_uuid((storage.foldername(name))[2]),
      private.safe_bigint((storage.foldername(name))[3])
    ))
  )
  with check (
    bucket_id = 'teacher-receipts'
    and (storage.foldername(name))[1] = 'receipts'
    and (select private.can_manage_receipt(
      private.safe_uuid((storage.foldername(name))[2]),
      private.safe_bigint((storage.foldername(name))[3])
    ))
  );

-- ── Policies: student-payment-proofs ─────────────────────────────────────────────────────────
-- Comandos separados (no `for all`): DELETE queda reservado a admin, distinto de select/insert/
-- update. Path: <student_id>/<payment_id>/<filename> -> [1]=student_id, [2]=payment_id.

drop policy if exists student_payment_proofs_select_own on storage.objects;
create policy student_payment_proofs_select_own on storage.objects
  for select to authenticated
  using (
    bucket_id = 'student-payment-proofs'
    and (select private.can_read_payment_proof(
      private.safe_uuid((storage.foldername(name))[1]),
      private.safe_bigint((storage.foldername(name))[2])
    ))
  );

drop policy if exists student_payment_proofs_insert_own on storage.objects;
create policy student_payment_proofs_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'student-payment-proofs'
    and (select private.can_write_payment_proof(
      private.safe_uuid((storage.foldername(name))[1]),
      private.safe_bigint((storage.foldername(name))[2])
    ))
  );

-- USING valida el objeto EXISTENTE (bucket/path actuales); WITH CHECK valida el objeto
-- resultante (nuevo bucket_id/name) — evita mover/renombrar un archivo hacia un path que el
-- usuario no podría haber creado directamente.
drop policy if exists student_payment_proofs_update_own on storage.objects;
create policy student_payment_proofs_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id = 'student-payment-proofs'
    and (select private.can_write_payment_proof(
      private.safe_uuid((storage.foldername(name))[1]),
      private.safe_bigint((storage.foldername(name))[2])
    ))
  )
  with check (
    bucket_id = 'student-payment-proofs'
    and (select private.can_write_payment_proof(
      private.safe_uuid((storage.foldername(name))[1]),
      private.safe_bigint((storage.foldername(name))[2])
    ))
  );

-- DELETE solo admin (ver docs/decisión en el diseño aprobado): el estudiante ya puede corregir
-- un comprobante equivocado vía UPDATE mientras el pago esté pending/failed; permitir además
-- DELETE no agrega funcionalidad legítima y sí abre la puerta a borrar evidencia financiera
-- antes de revisión.
drop policy if exists student_payment_proofs_admin_delete on storage.objects;
create policy student_payment_proofs_admin_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'student-payment-proofs'
    and (select private.is_admin())
  );
