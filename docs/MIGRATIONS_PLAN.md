# MIGRATIONS_PLAN.md — Plan de migraciones (a partir del modelo congelado v1.3)

> Estado: **0001-0009 generadas, NADA ejecutado.** `0009_domain_transactions.sql` (12 funciones de
> negocio) generada según el contrato aprobado en `DOMAIN_FUNCTIONS_API.md`. `0006`-`0008` se
> ajustaron a minutos enteros (ver §"Cambios v1.3") y `0008` recibió 3 triggers de bloqueo de
> períodos `paid`. `0010_storage.sql` sigue como **placeholder** (sin buckets/policies reales
> todavía). Nada se ha corrido contra un proyecto Supabase.

## Cómo leer esto

Cada migración se numera y agrupa por dominio, en el mismo orden de dependencias de FK. Dentro de cada
archivo: enums → tablas (con PK/FK/constraints inline) → índices → helpers de RLS (si aplica) → RLS.

## Orden exacto

| # | Archivo | Dominio | Crea | Estado |
|---|---|---|---|---|
| 1 | `0001_shared_enums_and_schema.sql` | Compartido | schema `private`; enums `user_role`, `academic_level` | Generada |
| 2 | `0002_catalogs.sql` | Catálogos | `programs`, `skills` | Generada |
| 3 | `0003_identity.sql` | Identidad | `profiles`, `role_changes`, `teacher_profiles`, `teacher_availability`, `teacher_skills`; función `private.is_admin()` | Generada |
| 4 | `0004_placement_tests.sql` | Placement test | enums `placement_test_status` (`draft`/`active`/`inactive`), `placement_attempt_status` (`not_started`/`in_progress`/`completed`/`cancelled`); tabla `placement_tests` (catálogo/definición, sin `student_id`) + `placement_test_attempts` (ejecución por estudiante, sin unicidad, múltiples intentos permitidos) | Generada (corregida conceptualmente en v1.2) |
| 5 | `0005_classrooms_and_content.sql` | Salones y contenido | enums `classroom_teacher_role`, `membership_status`, `resource_type`; tablas `classrooms`, `classroom_teachers` (+ índice único parcial PRIMARY, `teacher_id` ahora `ON DELETE RESTRICT`), `classroom_students`, `modules`, `lessons`, `resources`; helpers de RLS de salón | Generada (corregida) |
| 6 | `0006_scheduling.sql` | Programación de clases | enums `session_status`, `attendance_status`, `session_teacher_change_type`; tablas `class_schedules`, `sessions`, `session_teacher_changes`, `session_attendance` (`minutes_charged integer`, antes `hours_charged numeric`) | Generada (ajustada a minutos, v1.3) |
| 7 | `0007_student_payments_and_hours.sql` | Horas y pagos del estudiante | enums `payment_status`, `package_status`, `hours_movement_type`; tablas `student_payments` (+ `UNIQUE(reference)` parcial, nuevo), `hours_packages` (`total_minutes integer`), `hours_movements` (`minutes_delta integer`) | Generada (ajustada a minutos + constraint, v1.3) |
| 8 | `0008_teacher_payroll.sql` | Pagos y honorarios del docente | enum `teacher_payment_period_status`; tablas `teacher_payment_periods` (`total_minutes integer`), `teacher_hours_log`, `teacher_receipts`; **3 triggers nuevos** de bloqueo de períodos `paid` | Generada (ajustada a minutos + triggers, v1.3) |
| 9 | `0009_domain_transactions.sql` | Operaciones transaccionales | **12 funciones**: `start_session`, `initialize_session_attendance`, `complete_session`, `change_session_teacher`, `reschedule_session`, `set_student_session_billing`, `create_hour_package`, `promote_user_to_teacher`, `create_teacher_payment_period`, `upload_teacher_receipt`, `approve_teacher_payment_period`, `mark_teacher_payment_period_paid` | **Generada**, según contrato en `DOMAIN_FUNCTIONS_API.md` |
| 10 | `0010_storage.sql` | Storage | Buckets `materials`, `receipts`, `student_payment_proofs` + policies sobre `storage.objects` | **Placeholder** — sin implementar, pendiente de validar estrategia |

## Cambios de esta iteración respecto al plan anterior (v1.2)

1. **Corrección conceptual de `placement_tests`** (0004): en la versión anterior, `placement_tests`
   seguía siendo (por error) el proceso de un estudiante. Ahora `placement_tests` es la
   **definición/catálogo del examen** (`name`, `description`, `status` `draft`/`active`/`inactive`,
   `version`, `created_at`, `updated_at` — sin `student_id` ni resultado), y
   `placement_test_attempts` es cada ejecución de un estudiante (`placement_test_id`, `student_id`,
   `status` `not_started`/`in_progress`/`completed`/`cancelled`, `score`, `resulting_level`,
   `started_at`, `completed_at`), **sin `attempt_number` ni unicidad** — un estudiante puede repetir
   el mismo test cuantas veces se permita. Se **eliminó** el trigger
   `private.enforce_attempt_student_matches_test`: ya no aplica, porque `placement_tests` no tiene
   `student_id` con el cual comparar.
2. **`payments` → `student_payments`** (0007): evita ambigüedad con `teacher_payment_periods`. Se
   verificó que no genera inconsistencia porque nada se había ejecutado aún — solo se actualizó el
   archivo de migración (tabla, índices, nombres de policies) y la referencia desde `hours_packages`.
3. **`0009_domain_transactions.sql` formalizada en el plan, no generada todavía**: deja de ser
   "posterior/opcional" — es parte explícita del orden de migraciones — pero su SQL se escribe recién
   después de revisar la API de funciones de dominio (firmas, parámetros, forma de reportar errores).
4. **`0010_storage.sql` agregada como placeholder**: reserva el lugar en el plan para los buckets de
   Storage (incluye uno nuevo, `student_payment_proofs`, para comprobantes de pago de estudiantes,
   identificado en esta iteración). Sin contenido ejecutable todavía.
5. **`profiles.dni` verificado**: ya cumplía "obligatorio, único, texto" desde 0003 (`dni text not
   null` + `create unique index profiles_dni_uidx`). No requirió cambios.
6. **Confirmado**: `teacher_availability` y `teacher_skills` se gestionan por el propio docente vía RLS
   normal (`for all ... using (teacher_id = auth.uid())`), sin `SECURITY DEFINER` — ya estaban así
   desde la primera versión de 0003, y se mantiene como el patrón correcto para CRUD simple de
   propiedad directa.
7. **Inconsistencia encontrada en la re-revisión de 0001-0008** (no pedida, calificaba como real):
   `classroom_teachers.teacher_id` tenía `ON DELETE CASCADE` mientras que la relación equivalente
   `classroom_students.student_id` tenía `ON DELETE RESTRICT`, rompiendo la convención del resto del
   esquema (toda referencia a `profiles`/`teacher_profiles` con historial usa `RESTRICT`). Corregido a
   `RESTRICT` en `0005_classrooms_and_content.sql`.

## `0009_domain_transactions.sql` — alcance formal (pendiente de generar)

Contendrá una función por cada operación de `DATABASE_PLAN.md` §14:

1. Completar sesión (End Class)
2. Registrar decisión de consumo de horas
3. Comprar paquete de horas
4. Convertir student → teacher
5. Reprogramar sesión
6. Asignar/cambiar `actual_teacher_id` de una sesión
7. Agrupar horas dictadas en un período de pago
8. Subir recibo de honorarios (con transición de estado del período)
9. Aprobar / marcar pagado un período

**Regla obligatoria para cada función** (acordada antes de escribir cualquier SQL de esta migración):

- Validar `auth.uid()` (el llamante debe estar autenticado).
- Validar rol (admin/teacher/student según corresponda a la operación).
- Validar relación/ownership (ej.: el docente que sube un recibo debe ser dueño del período; el
  docente que hace Start/End Class debe ser `scheduled_teacher_id` o quien se asigna como
  `actual_teacher_id`).
- Validar estado previo (ej.: no completar una sesión ya `completed`; no aprobar un período sin
  `receipt_uploaded`).
- Garantizar idempotencia (reintentos de red no deben duplicar efectos — clave natural como
  `session_id` o `attempt` explícito).
- `set search_path` seguro (`''`, con todos los objetos calificados por schema).
- `revoke execute ... from public, anon, authenticated` por defecto, y `grant execute ... to
  <rol apropiado>` explícito.

**Regla de exclusión**: no se usa `SECURITY DEFINER` donde una policy RLS directa alcance. Antes de
generar 0009, se revisará explícitamente la API (nombre, parámetros, tipo de retorno/errores) de cada
una de las 9 funciones con el usuario.

## `0010_storage.sql` — alcance formal (placeholder, sin implementar)

Buckets identificados:

- `materials` (recursos PDF de lecciones), `receipts` (recibos por honorarios), y
  **`student_payment_proofs`** (comprobantes de pago del estudiante — nuevo, sin columna todavía en
  `student_payments` que apunte a un archivo; se definirá junto con la estrategia de Storage).

No se implementa hasta validar naming de buckets, estructura de paths y políticas finas.

## `0009_domain_transactions.sql` — generada (v1.3)

Contrato completo (roles, parámetros, idempotencia, errores) en `DOMAIN_FUNCTIONS_API.md`. Resumen:

- **12 funciones**, 6 `SECURITY DEFINER` (`start_session`, `initialize_session_attendance`,
  `complete_session`, `reschedule_session`, `create_hour_package`, `upload_teacher_receipt`) y 6
  `SECURITY INVOKER` (`change_session_teacher`, `set_student_session_billing`,
  `promote_user_to_teacher`, `create_teacher_payment_period`, `approve_teacher_payment_period`,
  `mark_teacher_payment_period_paid`).
- Todas: `set search_path = ''`, `revoke all ... from public, anon` + `grant execute ... to
  authenticated`.
- 3 bugs reales encontrados y corregidos durante la escritura (detalle en `DATABASE_PLAN.md` §21):
  autorización después del camino idempotente en `complete_session`; reversión de movimientos
  individuales en vez de neto por paquete en `set_student_session_billing`; `FOR UPDATE` combinado
  con `array_agg` (inválido en Postgres) en `create_teacher_payment_period`.

## Qué NO incluye este plan todavía

- El SQL real de `0010_storage.sql` (pendiente de validar estrategia de Storage).
- Semillas de datos (catálogos iniciales de `programs`/`skills`, niveles, etc.).
- Ejecución real contra un proyecto Supabase (`supabase db push` / `supabase migration up`).

## Re-revisión de integridad referencial y RLS (0001-0008)

Se releyeron los 8 archivos completos verificando: (a) cada FK apunta a una tabla ya creada en una
migración anterior o antes en el mismo archivo, (b) toda columna FK tiene índice, (c) RLS habilitado
en todas las tablas con al menos una policy de lectura y una de escritura coherente con quién debe
poder escribir cada tabla. Único hallazgo: la inconsistencia de `ON DELETE` en `classroom_teachers`
descrita en el punto 7 arriba, ya corregida. Sin otros hallazgos.

## Siguiente paso

Con 0001-0009 generadas (nada ejecutado), el siguiente paso es tu revisión de `0009` (funciones de
negocio) y, en paralelo o después, definir la estrategia de Storage para poder generar
`0010_storage.sql`. La ejecución real contra un proyecto Supabase de desarrollo se decide aparte,
después de esas revisiones.
