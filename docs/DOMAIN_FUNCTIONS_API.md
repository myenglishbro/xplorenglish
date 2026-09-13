# DOMAIN_FUNCTIONS_API.md — Contrato de la API de dominio (0009_domain_transactions.sql)

> Estado: **contrato aprobado, SQL generado en `supabase/migrations/0009_domain_transactions.sql`,
> NO ejecutado.** Este documento es la referencia legible del contrato; el SQL es la fuente de verdad
> ejecutable.
>
> Cambios de la revisión anterior: (1) se agregó `initialize_session_attendance` como 12ª función;
> (2) `set_student_session_billing` ya no crea asistencia implícitamente; (3) minutos enteros de
> extremo a extremo; (4) `UNIQUE(reference)` parcial en `student_payments`; (5) triggers de bloqueo
> de períodos `paid` en `0008`.
>
> **Cambios de esta revisión** (últimas correcciones antes de ejecutar): (6)
> `create_teacher_payment_period` gana identidad natural `UNIQUE(teacher_id, period_start,
> period_end)` en `teacher_payment_periods` — idempotencia real de la creación del período, no solo
> de la asignación de horas; (7) `create_hour_package` reemplaza la idempotencia por `reference`
> (nullable, poco confiable) por `p_idempotency_key uuid` obligatorio + `UNIQUE NOT NULL` en
> `student_payments.idempotency_key`; `reference` vuelve a ser solo informativa; (8) verificado (sin
> cambios) que el trigger de `teacher_payment_periods` permite la transición `approved→paid` — solo
> bloquea cuando `OLD.status = 'paid'`; (9) `teacher_receipts` gana `UNIQUE(teacher_payment_period_id)`
> — un solo recibo vigente por período, `upload_teacher_receipt` pasa de `INSERT` a upsert.

## 0. Convenciones comunes (aplican a las 12 funciones)

### 0.1 Ubicación y exposición
Todas viven en `public` (invocables como RPC vía PostgREST/`supabase.rpc()`), a diferencia de los
helpers de `private.*` (no expuestos). Nomenclatura: `public.<verbo>_<sustantivo>`.

### 0.2 Resolución de identidad y rol
```
v_caller_id  := (select auth.uid());
if v_caller_id is null then raise UNAUTHENTICATED;
v_caller_role := (select role from public.profiles where id = v_caller_id);
```
Ningún parámetro `p_teacher_id`/`p_student_id` determina "quién llama" — eso siempre sale de
`auth.uid()`. Los parámetros que nombran a otra persona solo son válidos si el llamante es `admin`.

### 0.3 Convención de errores
`raise exception 'CODIGO: mensaje'` con `errcode`: `42501` (autorización), `P0002` (no encontrado),
`P0001` (regla de negocio/estado).

### 0.4 `SECURITY DEFINER` vs `SECURITY INVOKER`
Regla: `DEFINER` solo cuando un rol no-admin necesita escribir en una tabla con RLS admin-only.

| # | Función | Modo |
|---|---|---|
| 1 | `start_session` | **DEFINER** |
| 2 | `initialize_session_attendance` | **DEFINER** |
| 3 | `complete_session` | **DEFINER** |
| 4 | `change_session_teacher` | INVOKER |
| 5 | `reschedule_session` | **DEFINER** |
| 6 | `set_student_session_billing` | INVOKER |
| 7 | `create_hour_package` | **DEFINER** |
| 8 | `promote_user_to_teacher` | INVOKER |
| 9 | `create_teacher_payment_period` | INVOKER |
| 10 | `upload_teacher_receipt` | **DEFINER** |
| 11 | `approve_teacher_payment_period` | INVOKER |
| 12 | `mark_teacher_payment_period_paid` | INVOKER |

**6 DEFINER, 6 INVOKER.**

### 0.5 `SET search_path`
Todas: `set search_path = ''`, todo objeto calificado por schema.

### 0.6 REVOKE/GRANT EXECUTE
```
revoke all on function public.<fn>(...) from public, anon;
grant execute on function public.<fn>(...) to authenticated;
```
La distinción admin/teacher/student se enforce **dentro** del cuerpo, no vía GRANT.

### 0.7 Unidades: minutos enteros, dinero en numeric
Ningún campo de horas usa `numeric` — todo es `integer` en minutos: `total_minutes`
(`hours_packages`), `billable_minutes` (`teacher_hours_log`), `minutes_delta`
(`hours_movements`), `minutes_charged` (`session_attendance`), `total_minutes`
(`teacher_payment_periods`). `numeric` queda reservado exclusivamente para dinero:
`hourly_rate_snapshot`, `amount`, `price_paid`, `total_amount`. Sin conversión a horas en ningún
punto de persistencia — la conversión a horas (si se necesita) es puramente de presentación, en la
capa de UI, nunca en la base de datos.

---

## 1. `start_session`

- **Roles**: `admin`, o `teacher` si `v_caller_id = coalesce(actual_teacher_id, scheduled_teacher_id)`.
  **Aprobado**: un suplente no reasignado no puede autoiniciar.
- **Parámetros**: `p_session_id bigint`, `p_actual_teacher_id uuid default null` (solo admin).
- **Retorno**: `public.sessions`.
- **Lee**: `sessions`, `profiles`, `teacher_profiles`.
- **Modifica**: `sessions` (`actual_start`, `actual_teacher_id` si era nulo);
  `session_teacher_changes` (si `actual_teacher_id` pasa de nulo a un valor). **También invoca
  internamente `public.initialize_session_attendance(p_session_id)`** dentro de la misma transacción,
  para garantizar que la asistencia exista desde que la clase arranca.
- **Precondiciones**: sesión existe; `status = 'scheduled'`.
- **Autorización**: ver roles.
- **Idempotencia**: ya iniciada por el mismo docente resuelto → no-op. Ya iniciada por otro
  `actual_teacher_id` → `TEACHER_MISMATCH`.
- **Errores**: `UNAUTHENTICATED`, `SESSION_NOT_FOUND`, `INVALID_SESSION_STATUS`, `NOT_AUTHORIZED`,
  `TEACHER_MISMATCH`, `TEACHER_INACTIVE`.
- **Transacción**: UPDATE `sessions` + (condicional) INSERT `session_teacher_changes` + llamada a
  `initialize_session_attendance`.

## 2. `initialize_session_attendance` *(nueva)*

- **Propósito**: crear las filas de `session_attendance` para todos los `classroom_students` activos
  del salón de la sesión, de forma idempotente.
- **Roles**: `admin`, o `teacher` si `v_caller_id = coalesce(actual_teacher_id, scheduled_teacher_id)`
  (misma regla que `start_session`, porque normalmente se invoca desde ahí, pero también es invocable
  de forma independiente, por ejemplo para que admin revise el roster antes de la clase).
- **Parámetros**: `p_session_id bigint`.
- **Retorno**: `integer` (cantidad de filas nuevas creadas).
- **Lee**: `sessions` (classroom_id, status), `classroom_students` (activos del salón).
- **Modifica**: `session_attendance` (bulk insert).
- **Precondiciones**: sesión existe; `status = 'scheduled'`.
- **Validaciones**: ninguna adicional.
- **Autorización**: igual que `start_session`.
- **Idempotencia**: **tal como pediste** — `UNIQUE(session_id, student_id)` (ya existente desde 0006)
  + `insert ... on conflict (session_id, student_id) do nothing`. Sin necesidad de ningún chequeo
  adicional: llamar N veces produce el mismo conjunto de filas que llamarla una vez.
- **Errores**: `UNAUTHENTICATED`, `NOT_AUTHORIZED`, `SESSION_NOT_FOUND`, `INVALID_SESSION_STATUS`.
- **Transacción**: un solo `INSERT ... SELECT ... ON CONFLICT DO NOTHING`.

## 3. `complete_session`

- **Roles**: `admin`, o `teacher` si `v_caller_id = actual_teacher_id` (no `scheduled_teacher_id`).
- **Parámetros**: `p_session_id bigint`. Sin `hourly_rate_snapshot` ni `amount` — se calculan dentro.
- **Retorno**: composite `(session public.sessions, hours_log_id bigint)`.
- **Lee**: `sessions`, `teacher_profiles.hourly_rate` (del `actual_teacher_id`, ahora), `teacher_hours_log`.
- **Modifica**: `sessions` (`status→completed`, `actual_end`); `teacher_hours_log` (insert único).
- **Precondiciones**: `status='scheduled'`; `actual_teacher_id is not null` (obligatorio); si
  `actual_start` es nulo, se rellena con `now()` como fallback.
- **Validaciones**: `v_minutes := round(extract(epoch from (now()-actual_start))/60)::integer > 0`
  (si no, `INVALID_DURATION`) — **entero desde el cálculo mismo, sin pasar por horas en ningún
  momento**.
- **Autorización**: `admin` o `teacher = actual_teacher_id`.
- **Idempotencia**: `status` ya `completed` → no-op, retorna la fila + `teacher_hours_log` existente
  (por `session_id`), sin recalcular ni reinsertar.
- **Errores**: `UNAUTHENTICATED`, `SESSION_NOT_FOUND`, `INVALID_SESSION_STATUS`,
  `MISSING_ACTUAL_TEACHER`, `NOT_AUTHORIZED`, `INVALID_DURATION`.
- **Transacción**: UPDATE `sessions` + INSERT `teacher_hours_log`
  (`billable_minutes = v_minutes`, `hourly_rate_snapshot` leído de `teacher_profiles` en este
  instante, `amount = round(v_minutes::numeric/60 * hourly_rate_snapshot, 2)` — la única división
  hacia horas de toda la función ocurre aquí, exclusivamente para calcular el **dinero**, nunca para
  persistir una cantidad de horas). No toca `session_attendance` ni `hours_movements`.

## 4. `change_session_teacher`

- **Roles**: `admin` únicamente.
- **Parámetros**: `p_session_id bigint`, `p_change_type public.session_teacher_change_type`,
  `p_new_teacher_id uuid`, `p_reason text default null`.
- **Retorno**: `public.sessions`.
- **Precondiciones**: sesión existe; `status <> 'completed'`; docente destino activo.
- **Autorización**: `admin`.
- **Idempotencia**: mismo `p_new_teacher_id` que el valor vigente → no-op.
- **Errores**: `UNAUTHENTICATED`, `NOT_AUTHORIZED`, `SESSION_NOT_FOUND`,
  `SESSION_ALREADY_COMPLETED`, `TEACHER_NOT_FOUND`, `TEACHER_INACTIVE`.
- **Transacción**: UPDATE `sessions.<campo>` + INSERT `session_teacher_changes`.

## 5. `reschedule_session`

- **Roles**: `admin`, o `teacher` si es `scheduled_teacher_id`/`actual_teacher_id` de la original.
- **Parámetros**: `p_session_id bigint`, `p_new_scheduled_start timestamptz`,
  `p_new_scheduled_end timestamptz`, `p_new_scheduled_teacher_id uuid default null`,
  `p_reason text default null`.
- **Retorno**: `public.sessions` (la nueva).
- **Precondiciones**: original existe; `status='scheduled'`; `end > start`.
- **Autorización**: `admin` o docente dueño.
- **Idempotencia**: original ya `rescheduled` → retorna la hija existente
  (`where rescheduled_from_session_id = p_session_id`) en vez de crear una segunda.
- **Errores**: `UNAUTHENTICATED`, `NOT_AUTHORIZED`, `SESSION_NOT_FOUND`, `INVALID_SESSION_STATUS`,
  `INVALID_TIME_RANGE`, `TEACHER_INACTIVE`.
- **Transacción**: UPDATE original (`rescheduled`) + UPDATE `session_attendance` asociada (→
  `rescheduled`, solo si existen filas) + INSERT nueva `sessions`.

## 6. `set_student_session_billing`

- **Roles**: `admin` únicamente.
- **Parámetros**: `p_session_id bigint`, `p_student_id uuid`,
  `p_attendance_status public.attendance_status`, `p_minutes_charged integer` (entero, >= 0),
  `p_notes text default null`. Sin parámetro de paquete — el FIFO decide.
- **Retorno**: `table(attendance_id bigint, minutes_charged integer, movement_ids bigint[])`.
- **Lee**: `sessions`, `session_attendance` (**debe existir ya** — ver cambio de esta revisión),
  `hours_packages` (`for update`), `hours_movements`.
- **Modifica**: `session_attendance` (**solo UPDATE, nunca INSERT**); `hours_movements` (0..N
  inserts); `hours_packages.status`.
- **Precondiciones**: sesión existe; `status in ('completed','cancelled')`; **la fila de
  `session_attendance` para `(p_session_id, p_student_id)` debe existir** — si no existe,
  `ATTENDANCE_NOT_FOUND` (antes se creaba implícitamente vía upsert; **ya no** — corrección de esta
  revisión, la creación es responsabilidad exclusiva de `initialize_session_attendance`).
- **Validaciones**: `p_minutes_charged >= 0`; si `> 0`, saldo FIFO disponible debe cubrirlo
  íntegramente o abortar (`INSUFFICIENT_BALANCE`).
- **Autorización**: `admin`.
- **Idempotencia**: mismo `p_minutes_charged` que la decisión ya registrada → no-op. Distinto →
  corrección: se generan movimientos `adjustment` que revierten lo ya consumido y se reaplica el
  nuevo valor vía FIFO, sin editar ni borrar movimientos existentes.
- **Errores**: `UNAUTHENTICATED`, `NOT_AUTHORIZED`, `SESSION_NOT_FOUND`, `INVALID_SESSION_STATUS`,
  `ATTENDANCE_NOT_FOUND`, `INVALID_MINUTES`, `INSUFFICIENT_BALANCE`.
- **Transacción**: UPDATE `session_attendance` + (si corrige) reversión + FIFO nuevo + updates de
  `hours_packages.status` — todo o nada.

## 7. `create_hour_package`

- **Roles**: **solo `admin`** (confirmado, mientras no exista pasarela de pago).
- **Parámetros**: `p_student_id uuid`, `p_package_label text`, `p_total_minutes integer`,
  `p_price numeric(10,2)`, `p_payment_method text`, **`p_idempotency_key uuid`** (obligatorio,
  nuevo en esta revisión), `p_currency text default 'PEN'`, `p_payment_reference text default
  null` (referencia real del medio de pago — **ya no** es la clave de idempotencia).
- **Retorno**: composite `(payment_id bigint, package_id bigint, movement_id bigint)`.
- **Precondiciones**: `p_idempotency_key is not null`; `p_total_minutes > 0`; `p_price >= 0`;
  estudiante existe y activo.
- **Autorización**: `admin`.
- **Idempotencia**: por `student_payments.idempotency_key` (`UNIQUE NOT NULL`, agregado en 0007).
  **Corrección de esta revisión**: ya no depende de `reference`, porque puede ser `NULL` en
  registros manuales y por lo tanto no detecta retries de forma confiable. El cliente genera el
  UUID una vez y lo reenvía en cada retry; mismo `idempotency_key` → retorna las filas ya creadas
  sin duplicar horas.
- **Errores**: `UNAUTHENTICATED`, `NOT_AUTHORIZED`, `INVALID_IDEMPOTENCY_KEY`, `STUDENT_NOT_FOUND`,
  `INVALID_AMOUNT`.
- **Transacción**: INSERT `student_payments` (`completed`, `idempotency_key`) + INSERT
  `hours_packages` (`total_minutes`) + INSERT `hours_movements` (`movement_type='purchase'`,
  `minutes_delta=+p_total_minutes`).

## 8. `promote_user_to_teacher`

- **Roles**: `admin` únicamente.
- **Parámetros**: `p_target_profile_id uuid`, `p_initial_hourly_rate numeric(10,2)`.
- **Retorno**: composite `(profile public.profiles, teacher_profile public.teacher_profiles)`.
- **Precondiciones**: perfil existe; `status='active'`; `role <> 'admin'`.
- **Autorización**: `admin`.
- **Idempotencia**: ya `teacher` + `teacher_profiles` existente → no-op. `teacher` sin
  `teacher_profiles` (anomalía) → se crea el perfil faltante, sin insertar `role_changes`.
- **Errores**: `UNAUTHENTICATED`, `NOT_AUTHORIZED`, `PROFILE_NOT_FOUND`, `PROFILE_INACTIVE`,
  `ADMIN_CANNOT_BE_CONVERTED`, `INVALID_RATE`.
- **Transacción**: UPDATE `profiles.role` + INSERT `teacher_profiles` (si aplica) + INSERT
  `role_changes` (si aplica).

## 9. `create_teacher_payment_period`

- **Roles**: `admin` únicamente.
- **Parámetros**: `p_teacher_id uuid`, `p_period_start date`, `p_period_end date`.
- **Retorno**: `public.teacher_payment_periods` (con `total_minutes`/`total_amount` ya calculados).
- **Lee**: `teacher_payment_periods` (identidad natural, ver idempotencia), `teacher_hours_log`
  elegibles (`teacher_payment_period_id is null`, rango de fechas, `for update`).
- **Precondiciones**: `period_end >= period_start` (validado en la función **y** con `CHECK` en
  0008); docente activo; al menos una fila elegible (si no, `NO_ELIGIBLE_HOURS`) — **salvo** que ya
  exista un período con esta identidad (ver idempotencia).
- **Autorización**: `admin`.
- **Idempotencia — corregida en esta revisión**: `teacher_payment_period_id is null` solo protegía
  las horas contra doble asignación, no identificaba idempotentemente la *creación* del período (un
  retry podía crear un período vacío o fallar con `NO_ELIGIBLE_HOURS` en vez de devolver el ya
  creado). Ahora `(teacher_id, period_start, period_end)` es la identidad natural del período
  (`UNIQUE` en 0008): la función primero busca un período existente con esa combinación exacta y,
  si existe, lo retorna directamente **sin** volver a procesar elegibilidad ni tocar
  `teacher_hours_log`.
- **Errores**: `UNAUTHENTICATED`, `NOT_AUTHORIZED`, `TEACHER_NOT_FOUND`, `INVALID_DATE_RANGE`,
  `NO_ELIGIBLE_HOURS`.
- **Transacción**: (si no existe ya) INSERT `teacher_payment_periods`
  (`total_minutes = sum(billable_minutes)`, `total_amount = sum(amount)`, ambos ya desde los
  snapshots existentes, nunca desde la tarifa actual) + UPDATE
  `teacher_hours_log.teacher_payment_period_id`.

## 10. `upload_teacher_receipt`

- **Roles**: `teacher` (dueño del período) o `admin`.
- **Parámetros**: `p_teacher_payment_period_id bigint`, `p_file_path text`.
- **Retorno**: composite `(period public.teacher_payment_periods, receipt_id bigint)`.
- **Precondiciones**: período existe; `status in ('pending','pending_receipt','receipt_uploaded')`
  (bloqueado si `approved`/`paid`, y a nivel de trigger si `paid`, ver `0008`).
- **Autorización**: `admin` o `teacher = period.teacher_id`.
- **Un solo recibo vigente por período — corregido en esta revisión**: `teacher_receipts` ahora
  tiene `UNIQUE(teacher_payment_period_id)` (0008). La función ya no hace `INSERT` condicionado a
  "mismo archivo ya existe"; hace **upsert** (`ON CONFLICT (teacher_payment_period_id) DO UPDATE`)
  sobre esa unicidad. Mientras el período no esté `approved`/`paid`, el docente puede reemplazar el
  recibo tantas veces como quiera — cada upload sobrescribe `file_path`/`uploaded_at` de la misma
  fila. Una vez `paid`, el trigger `teacher_receipts_lock_paid_period` (0008) hace la fila
  inmutable, incluso para esta función.
- **Idempotencia**: garantizada por el upsert mismo — mismo o distinto `p_file_path`, el resultado
  es siempre una única fila consistente con el último envío; `status` del período solo transiciona
  la primera vez (`pending`/`pending_receipt` → `receipt_uploaded`), reemplazos posteriores no lo
  vuelven a tocar.
- **Errores**: `UNAUTHENTICATED`, `NOT_AUTHORIZED`, `PERIOD_NOT_FOUND`, `PERIOD_ALREADY_REVIEWED`,
  `INVALID_FILE_PATH`.
- **Transacción**: INSERT `teacher_receipts` + UPDATE `teacher_payment_periods.status` (condicional).

## 11. `approve_teacher_payment_period`

- **Roles**: `admin` únicamente.
- **Parámetros**: `p_teacher_payment_period_id bigint`.
- **Precondiciones**: `status='receipt_uploaded'`; existe al menos un `teacher_receipts`.
- **Idempotencia**: ya `approved` → no-op. Ya `paid` → `ALREADY_PAID`. Antes de
  `receipt_uploaded` → `MISSING_RECEIPT`.
- **Errores**: `UNAUTHENTICATED`, `NOT_AUTHORIZED`, `PERIOD_NOT_FOUND`, `MISSING_RECEIPT`,
  `ALREADY_PAID`.
- **Transacción**: un UPDATE.

## 12. `mark_teacher_payment_period_paid`

- **Roles**: `admin` únicamente.
- **Parámetros**: `p_teacher_payment_period_id bigint`, `p_paid_at timestamptz default now()`.
- **Precondiciones**: `status='approved'`.
- **Idempotencia**: ya `paid` → no-op, **no** sobrescribe `paid_at`. Antes de `approved` →
  `NOT_APPROVED`.
- **Errores**: `UNAUTHENTICATED`, `NOT_AUTHORIZED`, `PERIOD_NOT_FOUND`, `NOT_APPROVED`.
- **Transacción**: un UPDATE.
- **Protección post-pago**: implementada como **triggers a nivel de motor** en `0008` (no solo
  convención): `teacher_payment_periods_lock_paid`, `teacher_hours_log_lock_paid_period`,
  `teacher_receipts_lock_paid_period` — bloquean cualquier UPDATE/DELETE sobre un período `paid` y
  sobre sus `teacher_hours_log`/`teacher_receipts` asociados, sin excepción ni bandera de bypass.

---

## Algoritmo de consumo de paquetes (FIFO) — íntegramente en minutos

Usado por `set_student_session_billing`. Con la corrección de esta revisión (minutos enteros de
extremo a extremo), **ya no hay ninguna conversión a horas en ningún paso** — se eliminó la
tolerancia de redondeo que existía en la versión anterior del contrato.

1. Candidatos, bloqueados:
   ```
   select id, purchased_at
   from public.hours_packages
   where student_id = p_student_id
     and status = 'active'
     and (expires_at is null or expires_at > now())
   order by purchased_at asc
   for update
   ```
2. Saldo restante por paquete, en minutos, exacto (suma entera de `minutes_delta`):
   `remaining_minutes := coalesce((select sum(minutes_delta) from hours_movements where package_id = pkg.id), 0)`.
3. Ignorar paquetes con `remaining_minutes <= 0`.
4. Asignación greedy en orden FIFO: `alloc := least(minutos_pendientes, remaining_minutes)`; anotar
   `(package_id, alloc)` en memoria; restar de minutos pendientes; parar en 0.
5. Si sobran minutos pendientes tras recorrer todos los candidatos → abortar
   (`INSUFFICIENT_BALANCE`), sin haber escrito nada.
6. Si se cubrió el total: por cada `(package_id, alloc)`, `insert into hours_movements (...,
   movement_type='consumption', minutes_delta = -alloc, ...)`; si el nuevo saldo del paquete llega a
   `0`, `update hours_packages set status='exhausted'`.

Sin redondeos, sin `numeric` de horas en ningún punto — todo entero, exacto.

---

## Constraints y triggers nuevos agregados a 0006-0008 (no a 0009)

Consistente con el precedente de `placement_test_attempts` (trigger de integridad en 0004, no en
0009): las protecciones de **esquema** viven junto a las tablas que protegen, no en la capa de
funciones de negocio.

- **`0006`**: `session_attendance.hours_charged` → `minutes_charged integer`.
- **`0007`**: `hours_packages.hours_purchased` → `total_minutes integer`; `hours_movements.hours_delta`
  → `minutes_delta integer`; nuevo índice único parcial `student_payments_reference_uidx`.
- **`0008`**: `teacher_payment_periods.total_hours` → `total_minutes integer`; nuevos triggers
  `teacher_payment_periods_lock_paid`, `teacher_hours_log_lock_paid_period`,
  `teacher_receipts_lock_paid_period` (funciones `private.prevent_paid_period_*`).

## Inconsistencias encontradas al implementar

1. **Las columnas de horas eran `numeric(6,2)`**, incompatibles con "minutos enteros de extremo a
   extremo, sin convertir a numeric". Se corrigieron en `0006`/`0007`/`0008` (ver arriba) — el único
   `numeric` que sobrevive en el dominio de horas es el dinero (`hourly_rate_snapshot`, `amount`,
   `price_paid`, `total_amount`), que nunca estuvo en cuestión.
2. **`teacher_hours_log.billable_minutes`** ya era `integer` desde su creación original — no requirió
   cambio, es la única columna de horas que ya cumplía el estándar antes de esta revisión.
3. **`student_payments.reference` no tenía índice único** — se agregó `UNIQUE(reference) WHERE
   reference IS NOT NULL` en `0007` (sin columna `provider`, porque no existe ni se prevé todavía en
   el esquema — se usa el fallback simple pedido).
4. **La protección de períodos `paid` no existía a nivel de motor** — ninguna policy RLS distinguía
   `status`. Se agregaron 3 triggers en `0008` que bloquean incondicionalmente cualquier
   modificación/eliminación de un período `paid` y de sus `teacher_hours_log`/`teacher_receipts`
   asociados — sin mecanismo de bypass, porque ninguna de las 12 funciones necesita tocar un período
   ya pagado.
5. **`set_student_session_billing` dejó de crear `session_attendance`**: ahora es un error
   (`ATTENDANCE_NOT_FOUND`) si la fila no existe, delegando la creación exclusivamente a
   `initialize_session_attendance`. Esto cierra el gap señalado en la revisión anterior del contrato.
