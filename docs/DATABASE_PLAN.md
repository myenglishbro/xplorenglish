# DATABASE_PLAN.md — Modelo conceptual de datos

> Este documento define **tablas, responsabilidades y relaciones conceptuales**. No incluye SQL,
> tipos de columna estrictos, índices ni políticas RLS con sintaxis real — eso corresponde a la fase
> de migraciones, posterior a validar este plan.
>
> **Estado: MODELO CONCEPTUAL CONGELADO — v1.3.** v1.0 incorporó las decisiones de negocio del MVP y
> el requerimiento de docentes titulares/suplentes con docente real por sesión. v1.1 ajustó el
> esquema durante la generación de migraciones (`payments`→`student_payments`, primera versión de
> `placement_tests`/`placement_test_attempts`). v1.2 corrigió conceptualmente el placement test
> (`placement_tests` = definición/catálogo del examen, no el proceso de un estudiante — ver §17-§18).
> **v1.3** (esta revisión) acompaña la capa de funciones de negocio (`0009_domain_transactions.sql`,
> contrato en `DOMAIN_FUNCTIONS_API.md`): todo el sistema de horas pasa a **minutos enteros de
> extremo a extremo** (se eliminan las columnas `numeric` de horas en `hours_packages`,
> `hours_movements`, `session_attendance`, `teacher_payment_periods` — `numeric` queda reservado
> exclusivamente para dinero), se agrega `UNIQUE(student_payments.reference)` parcial, y se agregan
> triggers que bloquean a nivel de motor cualquier modificación de un período de pago `paid` y de sus
> `teacher_hours_log`/`teacher_receipts` asociados. A partir de aquí, todo cambio de esquema debe
> pasar primero por una revisión de este documento antes de tocar migraciones. El plan de migraciones
> ordenado está en `MIGRATIONS_PLAN.md` y en `supabase/migrations/`; el contrato de las 12 funciones
> de negocio está en `DOMAIN_FUNCTIONS_API.md`.

## 1. Principios de modelado

1. **El historial de horas es un ledger, no un contador.** `hours_movements` es append-only; el saldo
   de un estudiante se calcula sumando sus movimientos, nunca se sobrescribe un campo "balance" como
   única fuente de verdad.
2. **Dos flujos separados para "completar una sesión":**
   - **Automático (docente que realmente dictó)**: al completar una sesión se genera
     `teacher_hours_log` para `sessions.actual_teacher_id`, con snapshot de tarifa e importe. Siempre
     ocurre, y siempre respecto al docente **real**, no al programado ni al titular del salón.
   - **Manual (estudiante)**: el descuento de horas del estudiante (`hours_movements` tipo
     `consumption`) nace de una **decisión explícita del admin** sobre cada `session_attendance`, y es
     **independiente de qué docente dictó la sesión**.
3. **Snapshot de tarifa**: `teacher_hours_log.hourly_rate_snapshot` se copia de
   `teacher_profiles.hourly_rate` **del docente que realmente dictó** (`actual_teacher_id`) en el
   momento de completar la sesión. Cambios posteriores a esa tarifa no afectan registros ya creados.
4. **La asignación a nivel de salón no determina facturación**: `classroom_teachers` (titular +
   suplentes) define quién *puede* dictar sesiones de un salón. Quién efectivamente cobra una sesión
   concreta es siempre `sessions.actual_teacher_id`, resuelto sesión por sesión.
5. **Preparado para N:M desde el inicio**: la relación salón↔docente ya es N:M
   (`classroom_teachers`), distinguiendo `teacher_role` (`PRIMARY`/`SUBSTITUTE`). El MVP restringe a
   un solo `PRIMARY` activo por salón, pero permite múltiples `SUBSTITUTE` sin cambios de esquema.
6. **Toda reasignación de docente en una sesión queda auditada**, con el mismo criterio que otros
   eventos sensibles del sistema (ver `role_changes`): nunca se sobrescribe silenciosamente quién iba
   a dictar una clase.
7. **Todo dato de acceso restringido cuelga de una relación explícita** (matrícula en salón, docente
   asignado), nunca de una lista implícita ni del nivel del estudiante.
8. **Catálogos separados de datos transaccionales**: programas y skills son catálogos administrables;
   niveles (CEFR) se modelan como valor controlado, no como restricción de acceso.
9. **Timestamps siempre en UTC**; la interpretación en zona horaria de negocio (`America/Lima`) ocurre
   solo en la capa de aplicación.

## 2. Dominio: Identidad y usuarios

### `profiles`
Extiende `auth.users` de Supabase (uno a uno).
- Datos: nombres, apellidos, DNI, teléfono, rol (`admin`|`teacher`|`student`), programa asociado (si
  aplica), nivel actual (si aplica, inicia en `A1`), estado (activo/inactivo).

### `role_changes`
- Datos: usuario afectado, rol anterior, rol nuevo, quién hizo el cambio, cuándo.
- Responsabilidad: auditoría de conversiones student → teacher.

### `teacher_profiles`
Extensión de `profiles` solo para usuarios con rol `teacher`.
- Datos: tarifa por hora **vigente**, biografía, estado.
- Responsabilidad: la tarifa aquí es siempre la "actual"; las tarifas históricas viven en
  `teacher_hours_log.hourly_rate_snapshot`, no aquí.

### `teacher_availability`
- Datos: docente, día de la semana, hora inicio, hora fin (hora local America/Lima).
- Uso futuro: señal de entrada para sugerir suplentes disponibles (§14).

### `skills` (catálogo) y `teacher_skills` (junction)
- `skills`: nombre de la especialidad.
- `teacher_skills`: docente ↔ skill (N:M).
- Uso futuro: señal de entrada para sugerir suplentes con la especialidad requerida (§14).

## 3. Dominio: Catálogos académicos

### `programs`
- Datos: nombre, descripción, estado.

### Niveles (CEFR)
- Enumeración controlada (A1, A2, B1, B2, C1, C2).

### `placement_tests` (catálogo/definición) + `placement_test_attempts` (ejecución) *(corregido en v1.2)*
- **`placement_tests`** es la **definición/configuración del examen** — un catálogo administrado por
  admin, no el proceso de un estudiante. Datos: `name`, `description`, `status`
  (`draft`|`active`|`inactive`), `version`, `created_at`, `updated_at`. **No tiene** `student_id`,
  `score`, `resulting_level`, `started_at` ni `completed_at` — esos pertenecen al intento, no a la
  definición.
- **`placement_test_attempts`** representa cada ejecución individual de un test por un estudiante.
  Datos: FK al test (`placement_test_id`), FK al estudiante (`student_id`), estado
  (`not_started`|`in_progress`|`completed`|`cancelled`), `score`, `resulting_level` (usa
  `academic_level`), `started_at`, `completed_at`, `created_at`.
- **Un estudiante puede tener múltiples intentos del mismo test** — no hay unicidad por `student_id`
  ni por (`student_id`, `placement_test_id`); cada intento es simplemente una fila más.
- Ya no existe redundancia de `student_id` entre ambas tablas (la definición no tiene estudiante), por
  lo que **no hace falta ningún trigger de consistencia** — se elimina el que se había agregado en la
  versión anterior por error de diseño.
- Alcance MVP: sin lógica de examen; `placement_tests` es solo el catálogo, `placement_test_attempts`
  solo registra resultado y trazabilidad de cada intento.

## 4. Dominio: Salones y contenido

### `classrooms`
- Datos: nombre, programa, nivel, descripción, notas de horario flexible, estado.

### `classroom_teachers` *(actualizada por el nuevo requerimiento)*
- Datos: salón, docente, **`teacher_role`** (`PRIMARY`|`SUBSTITUTE`, reemplaza al antiguo booleano
  `is_primary`), estado (`active`|`inactive`, para poder retirar un suplente sin borrar el historial),
  fecha de asignación.
- Responsabilidad: define el pool de docentes habilitados para un salón. **No determina quién cobra
  una sesión** — eso lo decide `sessions.actual_teacher_id`.
- Regla (MVP): exactamente un registro con `teacher_role = 'PRIMARY'` y `status = 'active'` por salón.
  Cualquier número de registros con `teacher_role = 'SUBSTITUTE'` y `status = 'active'`.
  **Precisión de esta iteración**: esta regla queda protegida a **nivel de base de datos** mediante un
  índice único parcial — `UNIQUE (classroom_id) WHERE teacher_role = 'PRIMARY' AND status = 'active'`
  — y no depende solo de lógica de aplicación.
- Este diseño N:M ya existía en la iteración anterior por previsión; el nuevo requerimiento lo
  confirma como necesario tal cual estaba planteado, solo se formaliza `teacher_role` como enum en
  lugar de booleano y se agrega `status`.

### `classroom_students` (junction)
- Datos: salón, estudiante, fecha de matrícula, estado.

### `modules` → `lessons` → `resources`
- `modules`: salón, título, descripción, orden.
- `lessons`: módulo, título, descripción, orden.
- `resources`: lección, tipo (`pdf`|`drive`|`docs`|`slides`|`youtube`|`url`|`embed`), título,
  referencia, orden.
- El acceso a estos tres se resuelve **solo** vía `classroom_students`/`classroom_teachers`. Nunca por
  nivel del estudiante ni por si el docente es titular o suplente.

## 5. Dominio: Programación de clases *(sección con más cambios)*

### `class_schedules` (plantilla recurrente, opcional)
- Datos: salón, día de semana, hora inicio, hora fin (hora local Lima), activo.

### `sessions` *(actualizada por el nuevo requerimiento)*
- Datos: salón, horario programado (inicio/fin, UTC), horario real (`actual_start`/`actual_end`,
  UTC), estado (`scheduled`|`completed`|`cancelled`|`rescheduled`), referencia a sesión original si es
  reprogramación, notas, y **dos referencias a docente en vez de una**:
  - **`scheduled_teacher_id`** (obligatorio): docente originalmente programado para la sesión —
    normalmente el `PRIMARY` del salón, aunque también puede programarse de antemano con un
    `SUBSTITUTE`.
  - **`actual_teacher_id`** (nullable hasta confirmarse; **obligatorio antes de poder completar la
    sesión**): docente que realmente dictó la sesión. Es el único campo que determina a quién se le
    generan horas dictadas y pago.
- Ambos campos referencian `teacher_profiles` de cualquier docente activo del sistema — **no** se
  exige pertenencia previa a `classroom_teachers` del salón (ver precisión de esta iteración más
  abajo: un suplente puntual no necesita estar registrado como `SUBSTITUTE`).
- **Regla de precondición**: no se puede transicionar `sessions.status` a `completed` si
  `actual_teacher_id IS NULL`.
- **Inmutabilidad post-completado**: una vez `completed`, `actual_teacher_id` no se modifica más por
  flujo normal (ver `session_teacher_changes` para el mecanismo correcto de corrección).

### `session_teacher_changes` *(tabla nueva — auditoría de reasignación de docente)* — **actualizada**
- Datos: sesión (`session_id`), **`change_type`** (`SCHEDULED_TEACHER_CHANGED` |
  `ACTUAL_TEACHER_CHANGED`), docente anterior (`previous_teacher_id`, nullable — nulo en el primer
  registro de un campo que antes no tenía valor), docente nuevo (`new_teacher_id`), quién hizo el
  cambio (`changed_by`, FK a `profiles`), cuándo (`changed_at`), motivo opcional (`reason`).
- **Precisión de esta iteración**: la tabla audita **ambos** campos de `sessions`, no solo
  `actual_teacher_id`. Un cambio de `scheduled_teacher_id` (ej. admin reprograma con antelación qué
  docente debería dictar la sesión) genera una fila con `change_type = 'SCHEDULED_TEACHER_CHANGED'`;
  un cambio de `actual_teacher_id` (quién dictó realmente, incluida su primera definición) genera una
  fila con `change_type = 'ACTUAL_TEACHER_CHANGED'`. Ambos tipos comparten la misma estructura de
  columnas (`session_id`, `previous_teacher_id`, `new_teacher_id`, `changed_by`, `changed_at`,
  `reason`), diferenciados únicamente por `change_type`.
- Responsabilidad: reconstruir en todo momento: quién estaba programado originalmente
  (`sessions.scheduled_teacher_id` y su propio historial de cambios), quién dictó finalmente
  (`sessions.actual_teacher_id` y su historial), quién hizo cada cambio y cuándo.
- **Por qué es necesaria una tabla nueva y no basta con campos en `sessions`**: si solo se guardaran
  `changed_by`/`changed_at` como columnas en `sessions`, una segunda reasignación (de cualquiera de
  los dos campos) sobrescribiría la evidencia de la anterior. El sistema ya tiene un precedente para
  esto (`role_changes`), y el mismo principio de "nunca sobrescribir silenciosamente" aplica aquí. Se
  confirma que **sí hace falta una tabla adicional**; la auditoría existente (`role_changes`) cubre
  cambios de rol de usuario, no reasignación de docente por sesión — son conceptos distintos.

### Relación entre `classroom_teachers` y `sessions.actual_teacher_id` — **precisión de esta iteración**
- `classroom_teachers` representa las **relaciones habituales** de un docente con un salón (quién es
  su titular, quiénes son sus suplentes recurrentes). Es información de planificación/organización.
- `sessions.actual_teacher_id` representa **quién dictó realmente una sesión concreta**, y **puede ser
  cualquier docente activo del sistema** (`teacher_profiles` con estado activo), **sin necesidad de
  estar previamente registrado como `SUBSTITUTE` en `classroom_teachers` de ese salón**.
- En consecuencia, se **descarta** la recomendación anterior de validar que `actual_teacher_id`
  pertenezca a `classroom_teachers` del salón. Si un suplente cubrió una sesión de forma puntual (una
  sola vez), **no es obligatorio** darlo de alta permanentemente en `classroom_teachers` — el registro
  de esa sustitución puntual queda en `sessions.actual_teacher_id` + `session_teacher_changes`, que es
  suficiente.
- Esto simplifica la validación de la operación "asignar/cambiar `actual_teacher_id`": solo se exige
  que el docente destino exista y esté activo, no que tenga relación previa con el salón.

### `session_attendance`
- Datos: sesión, estudiante, estado (`present`|`absent`|`cancelled`|`rescheduled`), horas cobradas
  (`hours_charged`, nullable), quién decidió (`decided_by`, nullable), cuándo (`decided_at`, nullable).
- **Sin cambios por este requerimiento**: se basa en la participación/facturación del estudiante, no
  en si la sesión fue dictada por el titular o un suplente.

## 6. Dominio: Horas y paquetes (estudiante)

### `hours_packages`
- Sin cambios: estudiante, tipo de paquete, horas compradas, precio pagado, fecha de compra, pago
  asociado, `expires_at` (nullable), estado.

### `hours_movements` (ledger)
- Sin cambios estructurales. Se reafirma: el tipo de movimiento y las horas dependen de la decisión
  del admin sobre `session_attendance`, **nunca** de qué docente dictó la sesión.

## 7. Dominio: Pagos y honorarios

### `student_payments` (pagos de estudiantes) *(renombrada en v1.1, antes `payments`)*
- Renombrada para no generar ambigüedad con los pagos de honorarios a docentes
  (`teacher_payment_periods`). Sin cambios de campos: estudiante, monto, moneda, método, estado,
  fecha, referencia.

### `teacher_hours_log` (horas dictadas — automático) *(campos renombrados/ajustados)*
Campos definitivos:
- `teacher_id`: **siempre `sessions.actual_teacher_id`**, nunca el titular del salón ni el
  `scheduled_teacher_id` si difieren.
- `session_id`: sesión origen.
- `billable_minutes`: minutos facturables de la sesión (mayor granularidad que "horas", permite
  sesiones de duración no exacta en horas).
- `hourly_rate_snapshot`: tarifa del `actual_teacher_id` en el momento de completar la sesión.
- `amount`: importe calculado (`billable_minutes` × `hourly_rate_snapshot` / 60).
- `teacher_payment_period_id`: nullable hasta que el admin agrupa el registro en un período de pago.
- **Constraint a mantener**: `UNIQUE(session_id, teacher_id)` — un mismo docente no puede tener dos
  registros de horas dictadas para la misma sesión. En el MVP esto en la práctica limita a **un solo
  registro por sesión** (el de `actual_teacher_id`), porque el titular no facturable no genera fila;
  se mantiene como clave compuesta (no `UNIQUE(session_id)` a secas) para no cerrar la puerta a un
  eventual escenario futuro de facturación dividida entre docentes para una misma sesión, sin que eso
  esté implementado ni habilitado en el MVP.
- Responsabilidad: generado automáticamente al completar una sesión, usando siempre
  `actual_teacher_id`. No editable manualmente.

### `teacher_payment_periods`
- Sin cambios: docente, rango de fechas, total de horas, monto total, estado (`pending`|
  `pending_receipt`|`receipt_uploaded`|`approved`|`paid`), fecha de pago.

### `teacher_receipts`
- Sin cambios: docente, período de pago asociado (obligatorio), archivo, fecha de subida.

## 8. Relaciones — vista consolidada (actualizada)

```
auth.users ──1:1── profiles ──1:1── teacher_profiles ──N:M── skills
                     │                    │
                     │                    ├──1:N── teacher_availability
                     │                    ├──N:M── classrooms (vía classroom_teachers, teacher_role)
                     │                    ├──1:N── teacher_hours_log ──1:1(*)── sessions
                     │                    │              (*conceptual: 1 sesión → hasta 1 fila por
                     │                    │               teacher_id bajo UNIQUE(session_id,teacher_id);
                     │                    │               en MVP, 1 sesión → 1 fila, la de actual_teacher_id)
                     │                    ├──1:N── teacher_payment_periods ──1:N── teacher_receipts
                     │                    └──1:N── session_teacher_changes (como previous/new teacher)
                     │
                     ├──1:N── placement_test_attempts ──N:1── placement_tests
                     ├──1:N── role_changes
                     ├──N:M── classrooms (vía classroom_students)
                     ├──1:N── hours_packages ──N:1── student_payments
                     └──1:N── hours_movements

placement_tests (catálogo independiente, sin FK a profiles — ver §17-§18)

classrooms ──N:1── programs
classrooms ──1:N── modules ──1:N── lessons ──1:N── resources
classrooms ──1:N── class_schedules (plantilla, opcional)
classrooms ──1:N── sessions
sessions ──N:1── teacher_profiles (scheduled_teacher_id)
sessions ──N:1── teacher_profiles (actual_teacher_id, nullable hasta confirmarse)
sessions ──1:N── session_teacher_changes
sessions ──1:N── session_attendance ──N:1── profiles (estudiante)
session_attendance ──0:N── hours_movements (al decidir consumo)
```

## 9. Reglas de integridad conceptual (actualizado)

- Una sesión solo puede pasar a `completed` si `actual_teacher_id IS NOT NULL`; ese evento crea
  `teacher_hours_log` automáticamente para ese docente.
- El consumo de horas del estudiante (`hours_movements` tipo `consumption`) solo se crea cuando el
  admin registra una decisión sobre un `session_attendance` — nunca automáticamente, y nunca en
  función de qué docente dictó la sesión.
- `hours_movements` es append-only: correcciones se hacen con nuevos movimientos, no editando filas.
- `teacher_hours_log` no se crea ni edita manualmente; siempre nace de una sesión completada y siempre
  usa `actual_teacher_id`.
- Si `actual_teacher_id ≠ scheduled_teacher_id`, el titular u otro docente distinto al
  `actual_teacher_id` **no** recibe fila en `teacher_hours_log` por esa sesión.
- Toda escritura (inicial o posterior) de `sessions.actual_teacher_id` genera una fila en
  `session_teacher_changes` con `change_type = 'ACTUAL_TEACHER_CHANGED'`; toda escritura de
  `sessions.scheduled_teacher_id` genera una fila con `change_type = 'SCHEDULED_TEACHER_CHANGED'`.
- `sessions.actual_teacher_id` no requiere que el docente esté registrado en `classroom_teachers` del
  salón: puede ser cualquier docente activo del sistema (sustitución puntual sin alta permanente).
- Una vez que una sesión está `completed`, `actual_teacher_id` es inmutable por flujo normal; corregir
  un error después de completada requiere un proceso explícito de ajuste (fuera del alcance mecánico
  del MVP, pero debe evitarse el update silencioso de `teacher_hours_log`).
- `classroom_students` y `classroom_teachers` son la única base para RLS de contenido — nunca se
  filtra por nivel del estudiante ni por titularidad/suplencia del docente.
- `teacher_receipts.teacher_payment_period_id` es obligatorio.
- El nivel del estudiante en `profiles.level` solo cambia por valor inicial `A1` o resultado de un
  `placement_test` con estado final.
- En `classroom_teachers`: a lo sumo un registro activo con `teacher_role = 'PRIMARY'` por salón; sin
  límite de registros activos con `teacher_role = 'SUBSTITUTE'`.

## 10. Esquema final de entidades (MVP) — tablas definitivas

| # | Tabla | Propósito |
|---|---|---|
| 1 | `profiles` | Identidad + rol + datos personales |
| 2 | `role_changes` | Auditoría de cambios de rol |
| 3 | `teacher_profiles` | Datos específicos de docente (tarifa vigente) |
| 4 | `teacher_availability` | Disponibilidad semanal del docente |
| 5 | `skills` | Catálogo de especialidades |
| 6 | `teacher_skills` | Docente ↔ skill (N:M) |
| 7 | `programs` | Catálogo de tipos de programa |
| 8 | `placement_tests` | **Catálogo/definición** del examen de nivelación (`draft`/`active`/`inactive`) — corregido en v1.2, ya no tiene `student_id` |
| 9 | `placement_test_attempts` | Ejecuciones individuales del test por estudiante (N por estudiante, sin unicidad) |
| 10 | `classrooms` | Salones |
| 11 | `classroom_teachers` | Salón ↔ docente (N:M, `teacher_role` PRIMARY/SUBSTITUTE) |
| 12 | `classroom_students` | Salón ↔ estudiante (N:M) |
| 13 | `modules` | Módulos de un salón |
| 14 | `lessons` | Lecciones de un módulo |
| 15 | `resources` | Materiales de una lección |
| 16 | `class_schedules` | Plantilla recurrente de horario (opcional) |
| 17 | `sessions` | Clases/sesiones concretas (`scheduled_teacher_id`, `actual_teacher_id`) |
| 18 | `session_teacher_changes` | Auditoría de reasignación de docente por sesión (`change_type`) |
| 19 | `session_attendance` | Asistencia + decisión de consumo por estudiante |
| 20 | `hours_packages` | Paquetes de horas comprados |
| 21 | `hours_movements` | Ledger de horas (fuente de verdad del saldo) |
| 22 | **`student_payments`** | **Renombrada (v1.1, antes `payments`)** — pagos de estudiantes |
| 23 | `teacher_hours_log` | Horas dictadas (automático, por `actual_teacher_id`, con snapshot) |
| 24 | `teacher_payment_periods` | Períodos de pago de honorarios |
| 25 | `teacher_receipts` | Recibos por honorarios (vinculados a un período) |

**Total: 25 tablas** (23 en v1.0 + `placement_test_attempts` nueva; `payments` renombrada, no suma).

## 11. PK, FK y relaciones principales (actualizado)

| Tabla | PK | FK principales | Relación |
|---|---|---|---|
| `profiles` | `id` (= `auth.users.id`) | — | base de identidad |
| `role_changes` | `id` | `profile_id`→profiles.id, `changed_by`→profiles.id | N:1 |
| `teacher_profiles` | `profile_id` (FK→profiles.id) | `profile_id`→profiles.id | 1:1 |
| `teacher_availability` | `id` | `teacher_id`→teacher_profiles.profile_id | N:1 |
| `skills` | `id` | — | catálogo |
| `teacher_skills` | (`teacher_id`,`skill_id`) | →teacher_profiles, →skills | N:M |
| `programs` | `id` | — | catálogo |
| `placement_tests` | `id` | — (catálogo, sin FK a profiles) | catálogo |
| `placement_test_attempts` | `id` | `placement_test_id`→placement_tests.id, `student_id`→profiles.id | N:1 (sin unicidad — múltiples intentos por estudiante) |
| `classrooms` | `id` | `program_id`→programs.id | N:1 |
| `classroom_teachers` | `id` | `classroom_id`→classrooms.id, `teacher_id`→teacher_profiles.profile_id | N:M |
| `classroom_students` | (`classroom_id`,`student_id`) | →classrooms, →profiles | N:M |
| `modules` | `id` | `classroom_id`→classrooms.id | N:1 |
| `lessons` | `id` | `module_id`→modules.id | N:1 |
| `resources` | `id` | `lesson_id`→lessons.id | N:1 |
| `class_schedules` | `id` | `classroom_id`→classrooms.id | N:1 |
| `sessions` | `id` | `classroom_id`→classrooms.id, `scheduled_teacher_id`→teacher_profiles.profile_id, `actual_teacher_id`→teacher_profiles.profile_id (nullable), `rescheduled_from_session_id`→sessions.id (nullable, auto-FK) | N:1 / self-ref |
| `session_teacher_changes` | `id` | `session_id`→sessions.id, `previous_teacher_id`→teacher_profiles.profile_id (nullable), `new_teacher_id`→teacher_profiles.profile_id, `changed_by`→profiles.id | N:1 |
| `session_attendance` | `id` (o (`session_id`,`student_id`)) | `session_id`→sessions.id, `student_id`→profiles.id, `decided_by`→profiles.id (nullable) | N:1 |
| `hours_packages` | `id` | `student_id`→profiles.id, `payment_id`→student_payments.id | N:1 |
| `hours_movements` | `id` | `student_id`→profiles.id, `package_id`→hours_packages.id (nullable), `session_attendance_id`→session_attendance.id (nullable), `created_by`→profiles.id | N:1 |
| `student_payments` | `id` | `student_id`→profiles.id | N:1 |
| `teacher_hours_log` | `id` | `session_id`→sessions.id, `teacher_id`→teacher_profiles.profile_id, `teacher_payment_period_id`→teacher_payment_periods.id (nullable) | N:1, con `UNIQUE(session_id, teacher_id)` |
| `teacher_payment_periods` | `id` | `teacher_id`→teacher_profiles.profile_id | N:1 |
| `teacher_receipts` | `id` | `teacher_id`→teacher_profiles.profile_id, `teacher_payment_period_id`→teacher_payment_periods.id (obligatorio) | N:1 |

## 12. Constraints propuestos (conceptuales, no SQL)

- `classroom_teachers`: **índice único parcial a nivel de base de datos** —
  `UNIQUE (classroom_id) WHERE teacher_role = 'PRIMARY' AND status = 'active'` — para que "un solo
  titular activo por salón" no dependa solo de lógica de aplicación. `SUBSTITUTE` sin límite. Además,
  `UNIQUE(classroom_id, teacher_id)` para no duplicar la misma relación salón-docente.
- `sessions`: `scheduled_teacher_id` NOT NULL; `actual_teacher_id` nullable, pero no puede ser `NULL`
  cuando `status='completed'` (regla de precondición, recomendable como CHECK además de validarse en
  la función/RPC). Ninguno de los dos campos exige que el docente pertenezca a `classroom_teachers`
  del salón — solo que sea un docente activo del sistema.
- `teacher_hours_log`: `UNIQUE(session_id, teacher_id)` (mantenida explícitamente por pedido del
  negocio); `teacher_id` debe coincidir con `sessions.actual_teacher_id` de la sesión referenciada
  (validado en la función que crea el registro, no como FK compuesta).
- `teacher_receipts`: `teacher_payment_period_id` NOT NULL.
- `hours_packages.expires_at`: nullable, sin lógica de expiración activa en el MVP.
- `session_teacher_changes`: `change_type` restringido a los dos valores del enum; `session_id`,
  `new_teacher_id`, `changed_by`, `changed_at` NOT NULL; `previous_teacher_id` nullable.

## 13. Tablas que requieren RLS (actualizado)

- `profiles`, `role_changes`, `teacher_profiles`, `teacher_availability`, `teacher_skills`,
  `placement_tests`, `placement_test_attempts`, `classrooms`, `classroom_teachers`,
  `classroom_students`, `modules`, `lessons`, `resources`, `class_schedules`, `sessions`,
  `session_attendance`, `hours_packages`, `hours_movements`, `student_payments`,
  `teacher_hours_log`, `teacher_payment_periods`, `teacher_receipts`.
- **`session_teacher_changes`** (nueva): admin ve todo; el docente ve las filas donde aparece como
  `previous_teacher_id` o `new_teacher_id` (transparencia sobre sus propias reasignaciones);
  estudiantes sin acceso.
- RLS mínimo (catálogos): `programs`, `skills` — lectura abierta a autenticados, escritura solo admin.

## 14. Operaciones que deben ejecutarse dentro de una transacción (actualizado)

| # | Operación | Qué toca | Por qué debe ser atómica |
|---|---|---|---|
| 1 | Completar sesión (End Class) | Validar `actual_teacher_id IS NOT NULL` → `sessions.status→completed` + `actual_end` + insertar `teacher_hours_log` (`teacher_id = actual_teacher_id`, `hourly_rate_snapshot` copiado de `teacher_profiles` del docente real) | Evitar sesiones completadas sin horas dictadas, con docente indefinido, o duplicadas por doble clic |
| 2 | Registrar decisión de consumo de horas | Update `session_attendance` + insertar `hours_movements` tipo `consumption` | Evitar decisión sin movimiento correspondiente, o descuento duplicado. Independiente de la operación 1 |
| 3 | Comprar paquete de horas | `student_payments→completed` + insertar `hours_packages` + insertar `hours_movements` tipo `purchase` | El estudiante nunca debe quedar con pago confirmado sin horas acreditadas, o viceversa |
| 4 | Convertir student → teacher | Update `profiles.role` + insertar `teacher_profiles` + insertar `role_changes` | Evitar rol `teacher` sin perfil, o cambio sin auditoría |
| 5 | Reprogramar sesión | Update sesión original (`rescheduled`) + insertar nueva `sessions` (`rescheduled_from_session_id`) + actualizar `session_attendance` relacionadas | Evitar sesiones huérfanas o referencias inconsistentes |
| 6 | **Asignar/cambiar `actual_teacher_id` de una sesión** *(nueva)* | Update `sessions.actual_teacher_id` (solo si `status != 'completed'`) + insertar fila en `session_teacher_changes` (`previous_teacher_id`, `new_teacher_id`, `changed_by`, `changed_at`) | El estado de la sesión y el historial de reasignación deben avanzar juntos; nunca se actualiza uno sin el otro |
| 7 | Agrupar horas dictadas en un período de pago | Update `teacher_hours_log.teacher_payment_period_id` + insertar/actualizar `teacher_payment_periods` (totales, estado `pending`) | Evitar hora dictada agrupada sin que el período refleje el total correcto |
| 8 | Subir recibo de honorarios | Insertar `teacher_receipts` + update `teacher_payment_periods.status` (`pending_receipt`→`receipt_uploaded`) | El estado del período y la existencia del recibo deben avanzar juntos |
| 9 | Aprobar / marcar pagado un período | Update `teacher_payment_periods.status` (→`approved`→`paid`) + `paid_at` | Evitar marcar `paid` sin recibo aprobado |

## 15. Qué cambió en esta iteración (resumen técnico)

- `classroom_teachers.is_primary` (boolean) → `classroom_teachers.teacher_role`
  (`PRIMARY`|`SUBSTITUTE`) + `status` (`active`|`inactive`).
- `sessions.teacher_id` (columna única) → `sessions.scheduled_teacher_id` +
  `sessions.actual_teacher_id` (dos columnas, distinto propósito y distinta nulabilidad).
- Nueva tabla `session_teacher_changes` (auditoría de reasignación de docente por sesión).
- `teacher_hours_log`: campos renombrados a `teacher_id`, `session_id`, `billable_minutes`,
  `hourly_rate_snapshot`, `amount`; se mantiene `UNIQUE(session_id, teacher_id)`; `teacher_id` ahora
  se resuelve explícitamente desde `actual_teacher_id`, nunca desde el titular del salón.
- Nueva precondición de negocio: no se puede completar una sesión sin `actual_teacher_id` definido.
- Nueva regla de inmutabilidad: `actual_teacher_id` no cambia después de `completed` por flujo normal.
- Sin cambios en `session_attendance` ni `hours_movements` — se reafirma su independencia respecto al
  docente que dictó la sesión.

## 16. Precisiones finales (esta iteración) — modelo congelado

1. **`session_teacher_changes` audita ambos campos**: se agrega `change_type`
   (`SCHEDULED_TEACHER_CHANGED` | `ACTUAL_TEACHER_CHANGED`), manteniendo `session_id`,
   `previous_teacher_id`, `new_teacher_id`, `changed_by`, `changed_at`, `reason`.
2. **"Un solo `PRIMARY` activo por salón" pasa a ser un constraint de base de datos**: índice único
   parcial `UNIQUE (classroom_id) WHERE teacher_role='PRIMARY' AND status='active'`, no solo
   validación de aplicación.
3. **`sessions.actual_teacher_id` puede ser cualquier docente activo del sistema**, sin exigir
   pertenencia previa a `classroom_teachers` como `SUBSTITUTE`. `classroom_teachers` queda reservado
   para relaciones habituales (planificación), no como lista blanca de quién puede dictar una sesión.

Con esto, el modelo conceptual quedó **congelado (v1.0)**.

## 17. Ajustes de esquema durante la generación de migraciones (v1.1)

Al escribir las migraciones 0001-0008 surgieron tres ajustes, aprobados por el usuario:

1. ~~`placement_tests` se separa en header + detalle, con `placement_tests` como el proceso general
   del estudiante y un trigger de consistencia `student_id`~~ — **superado por la corrección
   conceptual de v1.2, ver §20**: esa primera versión seguía modelando `placement_tests` como el
   proceso de un estudiante, lo cual era incorrecto. Se mantiene esta entrada solo como registro
   histórico de la iteración.
2. **`payments` se renombra a `student_payments`** para eliminar la ambigüedad con
   `teacher_payment_periods`. No genera inconsistencia: nada se había ejecutado todavía, así que el
   renombre solo afectó el archivo de migración 0007 (tabla, índices, policies) y las referencias en
   `hours_packages.payment_id` (la columna conserva su nombre, ya sin ambigüedad en su propio
   contexto).
3. **`profiles.dni`**: se verificó contra el esquema ya escrito — **ya cumplía** lo pedido (`text not
   null` + índice único `profiles_dni_uidx`). No requirió cambios.

## 18. Capa de operaciones transaccionales — formalizada, no generada aún

La capa de funciones `SECURITY DEFINER` deja de considerarse "posterior/opcional" y pasa a ser
**`0009_domain_transactions.sql`**, formalmente parte del plan de migraciones (ver
`MIGRATIONS_PLAN.md`). Contendrá las 9 operaciones de §14. Por acuerdo explícito, **no se genera
todavía** — se diseñará primero la API de funciones de dominio (firma, parámetros, errores) antes de
escribir el SQL.

Regla general para esa capa (aplica a las 9 operaciones): cada función valida `auth.uid()`, valida rol,
valida relación/ownership sobre las filas que toca, valida el estado previo (no completar dos veces,
no reasignar una sesión ya completada, etc.), garantiza idempotencia, usa `set search_path` seguro
(`''`, con objetos siempre calificados por schema), y revoca `EXECUTE` por defecto, concediéndolo solo
al rol apropiado (`authenticated`, nunca `anon`/`public`).

**No se usa `SECURITY DEFINER` para CRUD simple que RLS ya resuelve** — ejemplo confirmado:
`teacher_availability` y `teacher_skills` ya permiten que el propio docente los gestione vía RLS normal
(policies `for all` con `teacher_id = auth.uid()`), sin necesidad de ninguna función.

## 19. Storage — reservado, no implementado

Se reserva `0010_storage.sql` en el plan de migraciones para los buckets `materials`, `receipts` y
(nuevo) `student_payment_proofs`. No se implementa hasta validar la estrategia exacta (naming,
estructura de paths, tamaño/tipo de archivo permitido). Ver `MIGRATIONS_PLAN.md`.

## 20. Corrección conceptual del placement test (v1.2)

La v1.1 seguía modelando `placement_tests` como el proceso individual de un estudiante (tenía
`student_id`, `score`, `resulting_level`, `completed_at`). Esto era conceptualmente incorrecto: el
negocio necesita `placement_tests` como la **definición/catálogo del examen** (algo que admin crea y
versiona, independiente de qué estudiante lo rinde), separado de **cada ejecución** de un estudiante.

Cambios aplicados en `0004_placement_tests.sql`:

- `placement_tests` pasa a tener: `id`, `name`, `description`, `status`
  (`placement_test_status`: `draft`|`active`|`inactive`), `version`, `created_at`, `updated_at`. Se
  quitan `student_id`, `score`, `resulting_level`, `started_at`, `completed_at`.
- `placement_test_attempts` mantiene: `id`, `placement_test_id`, `student_id`, `status`
  (**nuevo enum** `placement_attempt_status`: `not_started`|`in_progress`|`completed`|`cancelled`),
  `score`, `resulting_level` (usa `academic_level`), `started_at`, `completed_at`, `created_at`. Se
  quita `attempt_number` (ya no aplica: sin unicidad de intentos, un estudiante puede repetir el
  mismo test tantas veces como se permita).
- **Sin `UNIQUE(student_id)` ni `UNIQUE(student_id, placement_test_id))`** — un estudiante puede tener
  múltiples intentos del mismo test, sin restricción.
- **Se elimina el trigger `private.enforce_attempt_student_matches_test`**: la redundancia que
  protegía (student_id duplicado entre `placement_tests` y `placement_test_attempts`) deja de existir,
  porque `placement_tests` ya no tiene `student_id`.
- Los dos enums (`placement_test_status`, `placement_attempt_status`) se definieron localmente en
  `0004_placement_tests.sql`, igual que en la versión anterior — no fue necesario tocar
  `0001_shared_enums_and_schema.sql`, porque ningún otro dominio los consume.

**Inconsistencia adicional encontrada y corregida durante la re-revisión de 0001-0008** (no pedida
explícitamente, pero calificaba como "inconsistencia real"): `classroom_teachers.teacher_id` tenía
`ON DELETE CASCADE` mientras que `classroom_students.student_id` (la misma clase de relación
persona↔salón) tenía `ON DELETE RESTRICT`, y el resto del esquema usa `RESTRICT` para toda referencia
a `profiles`/`teacher_profiles` que representa una relación con historial. Se cambió
`classroom_teachers.teacher_id` a `ON DELETE RESTRICT` en `0005_classrooms_and_content.sql` para ser
consistente.

**Resultado de la re-revisión de integridad referencial y RLS (0001-0008)**: sin otros hallazgos. Cada
FK apunta a una tabla ya creada en una migración anterior o en el mismo archivo antes de usarse; toda
columna FK tiene su índice; todas las tablas tienen RLS habilitado con al menos una policy de lectura y
una de escritura (admin-only salvo los CRUD simples de propiedad directa: `profiles` self-update,
`teacher_availability`, `teacher_skills`, `placement_tests`/`placement_test_attempts` de catálogo y
autogestión del estudiante).

## 21. Capa de funciones de negocio generada (v1.3)

`0009_domain_transactions.sql` fue generada con 12 funciones (contrato completo en
`DOMAIN_FUNCTIONS_API.md`): `start_session`, `initialize_session_attendance` (nueva, resuelve el gap
señalado en la iteración anterior), `complete_session`, `change_session_teacher`,
`reschedule_session`, `set_student_session_billing`, `create_hour_package`,
`promote_user_to_teacher`, `create_teacher_payment_period`, `upload_teacher_receipt`,
`approve_teacher_payment_period`, `mark_teacher_payment_period_paid`.

**Cambio de esquema que acompaña esta capa** — minutos enteros de extremo a extremo, sin `numeric`
para horas en ningún punto de persistencia:

| Tabla | Antes (v1.2) | Ahora (v1.3) |
|---|---|---|
| `session_attendance` | `hours_charged numeric(6,2)` | `minutes_charged integer` |
| `hours_packages` | `hours_purchased numeric(6,2)` | `total_minutes integer` |
| `hours_movements` | `hours_delta numeric(6,2)` | `minutes_delta integer` |
| `teacher_payment_periods` | `total_hours numeric(8,2)` | `total_minutes integer` |
| `teacher_hours_log` | `billable_minutes integer` | sin cambio (ya cumplía) |

`numeric` queda reservado exclusivamente para dinero: `hourly_rate_snapshot`, `amount`, `price_paid`,
`total_amount`. La única conversión hacia "horas" en todo el sistema ocurre dentro de
`complete_session`, y exclusivamente para calcular el importe en dinero — nunca para persistir una
cantidad de horas.

**Constraint nuevo**: `student_payments_reference_uidx` — `UNIQUE(reference) WHERE reference IS NOT
NULL` (0007), soporta la idempotencia de `create_hour_package`.

**Triggers nuevos** (0008): `teacher_payment_periods_lock_paid`,
`teacher_hours_log_lock_paid_period`, `teacher_receipts_lock_paid_period` — bloquean
incondicionalmente cualquier INSERT/UPDATE/DELETE que involucre un período `paid`, cerrando a nivel
de motor el gap que existía en la iteración anterior (la policy admin `for all` no distinguía
`status`).

**Bugs encontrados y corregidos durante la escritura de 0009** (no solo diseño — errores concretos de
implementación, ver también la respuesta de esta iteración para el detalle completo):
1. `complete_session` retornaba el resultado idempotente **antes** de validar autorización — permitía
   leer datos de una sesión completada ajena. Corregido: autorización siempre antes de cualquier
   retorno.
2. `set_student_session_billing` reversaba movimientos `consumption` individuales en vez del neto por
   paquete — una segunda corrección sobre la misma asistencia habría duplicado la reversión. Corregido
   para sumar y reversar el neto agrupado por paquete.
3. `create_teacher_payment_period` combinaba `array_agg` (agregación) con `FOR UPDATE` en el mismo
   `SELECT`, sintácticamente inválido en Postgres. Corregido usando el constructor `array(subquery ...
   for update)`.
