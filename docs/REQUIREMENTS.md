# REQUIREMENTS.md — Plataforma Educativa (Academia de Inglés)

> **Estado del modelo**: el modelo conceptual de datos fue aprobado y congelado (v1.0) tras esta
> revisión. Cambios adicionales de esquema requieren una nueva revisión de `DATABASE_PLAN.md` antes de
> tocar migraciones. El plan de migraciones ordenado está en `MIGRATIONS_PLAN.md`.

## 1. Contexto y objetivo

Plataforma web para una academia de inglés con tres roles (admin, teacher, student), que administra
matrícula, salones, contenido educativo, programación de clases, consumo de horas por paquetes y
pagos/honorarios de docentes.

Este documento cubre **únicamente el alcance funcional**. No define tablas, ni componentes, ni código.

> **Estado**: las decisiones de negocio del MVP fueron cerradas (sección 7). Este documento ya no
> tiene preguntas abiertas bloqueantes para diseñar el esquema.

## 2. Alcance de esta fase

**Dentro de alcance (fase de análisis actual):**
- Requerimientos funcionales y no funcionales.
- Arquitectura de la aplicación (`ARCHITECTURE.md`).
- Modelo conceptual de datos (`DATABASE_PLAN.md`).

**Fuera de alcance por ahora:**
- Migraciones SQL / esquema real en Supabase.
- Implementación de UI o lógica de negocio.
- Contenido/lógica de scoring del placement test (solo se define su estructura mínima de datos).
- Integración de pasarela de pago específica (Stripe, Culqi, etc. — no mencionada por el usuario).

## 3. Roles y permisos (resumen)

| Capacidad | Admin | Teacher | Student |
|---|---|---|---|
| Ver todos los usuarios | ✅ | ❌ | ❌ |
| Convertir usuario en docente | ✅ | ❌ | ❌ |
| Crear salones, asignar docente/estudiantes | ✅ | ❌ | ❌ |
| Crear horarios / sesiones | ✅ | Parcial (reprogramar propias clases) | ❌ |
| Gestionar paquetes de horas y pagos | ✅ | ❌ | Comprar (self-service) |
| Decidir si una sesión consume horas del estudiante | ✅ (decisión manual) | ❌ | ❌ |
| Ver horas dictadas por docentes | ✅ | Ver solo las propias | ❌ |
| Gestionar recibos por honorarios | ✅ (revisar/aprobar) | Subir los propios | ❌ |
| Definir disponibilidad, skills | Ver | Editar (propias) | ❌ |
| Definir tarifa por hora | ✅ (única fuente) | Solo lectura (tarifa vigente) | ❌ |
| Start Class / End Class | ❌ | ✅ (en sus sesiones) | ❌ |
| Ver salón, módulos, lecciones, materiales | Todos | Los de sus salones | Los de sus salones (enrolado) |
| Placement test | ❌ | ❌ | ✅ (tomar) |
| Ver saldo/historial de horas | Todos | ❌ (no aplica) | ✅ (propio) |

## 4. Requerimientos funcionales por módulo

### 4.1 Registro y perfil de usuario
- Registro con: nombres, apellidos, DNI, teléfono, email, contraseña, tipo de programa.
- Todo estudiante nuevo inicia en nivel **A1**.
- El nivel puede actualizarse más adelante mediante un **placement test**.
- El admin puede convertir un usuario `student` en `teacher` (cambio de rol), y esta conversión queda
  registrada con fecha y autor (auditoría).

### 4.2 Administración (Admin)
- Ver listado y detalle de usuarios (todos los roles).
- Convertir estudiantes en docentes.
- Crear salones (classrooms) y asignar su docente titular (`PRIMARY`).
- Asignar uno o más docentes suplentes (`SUBSTITUTE`) a un salón.
- Asignar estudiantes a salones.
- Reasignar el docente que dicta una sesión concreta (`actual_teacher_id`), incluso a un suplente
  distinto del titular del salón, dejando registro de quién hizo el cambio y cuándo.
- Crear horarios / sesiones de clase.
- Gestionar paquetes de horas (catálogo: 5, 10, 20 horas) y su venta/asignación a estudiantes.
- Gestionar pagos (de estudiantes por paquetes).
- **Decidir manualmente, sesión por sesión (o por estudiante dentro de una sesión), si esa sesión
  consume horas del saldo del estudiante.** No hay descuento automático por defecto.
- Ver horas dictadas por cada docente (histórico y por período).
- Crear y gestionar períodos de pago de honorarios por docente.
- Revisar y aprobar recibos por honorarios subidos por docentes.

### 4.3 Docente (Teacher)
- Dashboard con resumen de su actividad.
- Ver salones asignados, sea como titular (`PRIMARY`) o como suplente (`SUBSTITUTE`).
- Ver/confirmar si dictará una sesión en la que fue asignado como `actual_teacher_id` (incluyendo
  sesiones donde reemplaza al titular).
- Definir disponibilidad semanal (horarios expresados en hora local de Lima).
- Definir/ver skills o especialidades.
- Ver tarifa por hora vigente (fijada por admin).
- Calendario de clases (sesiones programadas).
- Acciones **Start Class** / **End Class** sobre una sesión programada.
- Historial de horas dictadas (con la tarifa aplicada en cada una, nunca recalculada).
- Ver períodos de pago de honorarios y su estado.
- Subir recibos por honorarios, **vinculados obligatoriamente a un período de pago específico**.

### 4.4 Estudiante (Student)
- Dashboard con resumen (nivel, salones, saldo de horas).
- Ver "Mis salones".
- Ver "Mis clases" (sesiones programadas/pasadas) y el estado de asistencia registrado en cada una.
- Ver saldo de horas y su historial completo de movimientos.
- Tomar placement test (registra intento, puntaje, nivel resultante y fecha de finalización).
- Ver/editar perfil.
- Comprar paquetes de horas (5 / 10 / 20).

### 4.5 Contenido educativo (por salón, no biblioteca global)
Jerarquía obligatoria: **Salón → Módulos → Lecciones → Recursos/Materiales**.

Cada salón tiene:
- nombre, programa, nivel, estudiantes, docente principal, horario flexible, descripción.
- calendario de sesiones.
- módulos → lecciones → materiales.

Tipos de material soportados: PDF, Google Drive, Google Docs, Google Slides, YouTube, URL genérica,
contenido HTML/embed.

**Decisión confirmada**: el acceso a materiales depende **únicamente de la matrícula en el salón**, no
del nivel del estudiante. Un salón de nivel B1 puede tener matriculado (por decisión del admin) a un
estudiante cuyo nivel actual sea A2, y este verá los materiales igualmente. No existe restricción
automática por nivel, ni biblioteca general de materiales.

### 4.6 Paquetes y horas
- Paquetes disponibles: 5, 10, 20 horas (catálogo, ampliable).
- El sistema mantiene:
  - **Historial de paquetes comprados** (no solo el paquete activo).
  - **Historial de movimientos de horas** (ledger: compras, consumos, ajustes), no un contador simple.
- El saldo de horas de un estudiante se **deriva** de ese historial, no se edita directamente.
- Los paquetes **no expiran obligatoriamente en el MVP**, pero el sistema soporta una fecha de
  expiración opcional por paquete (nullable), para poder activarla más adelante sin rediseño.

### 4.7 Ciclo de vida de una clase (sesión)

Estados de la **sesión**: `scheduled`, `completed`, `cancelled`, `rescheduled`.

Estados de **asistencia por estudiante** (uno por cada estudiante matriculado en la sesión):
`present`, `absent`, `cancelled`, `rescheduled`.

**Decisión confirmada — separación de dos flujos independientes:**

1. **Lado docente (automático, basado en quién dictó realmente la sesión)**: al marcar una sesión como
   `completed` (vía End Class), el sistema registra automáticamente las horas dictadas y calcula el
   importe usando la **tarifa vigente del docente que realmente dictó la sesión** (snapshot). Este
   cálculo **nunca se recalcula** aunque la tarifa del docente cambie después.
2. **Lado estudiante (manual, independiente del docente)**: el descuento de horas del saldo del
   estudiante **no es automático** y **no depende de si el docente fue titular o suplente**. El
   administrador decide manualmente, sesión por sesión (o por registro de asistencia), si esa sesión
   consume horas del estudiante y cuántas. Las cancelaciones (`cancelled`/`rescheduled`) **no tienen
   penalidad automática** en el MVP — es siempre una decisión manual del admin.

### 4.7.1 Docente titular vs. docente que realmente dicta la sesión (nuevo requerimiento)

Un salón puede tener **un docente titular (`PRIMARY`)** y **uno o más docentes suplentes
(`SUBSTITUTE`)**. Sin embargo, la asignación a nivel de salón **no determina automáticamente** quién
cobra una sesión concreta: cada sesión distingue explícitamente:

- **`scheduled_teacher_id`**: el docente originalmente programado para esa sesión (normalmente el
  titular del salón, aunque también puede programarse de antemano con un suplente).
- **`actual_teacher_id`**: el docente que realmente dictó la sesión. **Debe quedar definido antes de
  poder completar la sesión** (no se puede pasar a `completed` sin un `actual_teacher_id`).

Reglas de negocio confirmadas cuando el docente real difiere del programado (sustitución):
- El estudiante consume horas **normalmente** — el consumo de horas es independiente de qué docente
  dictó la clase.
- Las horas dictadas y el pago se acreditan **exclusivamente** al `actual_teacher_id`.
- El pago usa la **tarifa snapshot del docente que realmente dictó** la sesión, no la del titular.
- El docente titular **no recibe horas ni pago** por una sesión que no dictó él mismo.
- Todo cambio de docente en una sesión queda registrado con: docente originalmente programado, docente
  que finalmente dictó, quién hizo el cambio y cuándo, distinguiendo si el cambio fue al docente
  **programado** o al docente **real** (`change_type`: `SCHEDULED_TEACHER_CHANGED` |
  `ACTUAL_TEACHER_CHANGED`) — ver `DATABASE_PLAN.md`, tabla `session_teacher_changes`.
- **`actual_teacher_id` puede ser cualquier docente activo del sistema**, sin necesidad de estar
  registrado previamente como suplente (`SUBSTITUTE`) de ese salón en `classroom_teachers`. Esa tabla
  representa relaciones **habituales** con el salón (planificación); si un docente cubre una sesión de
  forma puntual, no es obligatorio darlo de alta permanentemente como suplente del salón.
- La regla "un solo docente titular activo por salón" se protege **a nivel de base de datos** (no solo
  en la aplicación), para que no pueda violarse ni siquiera por un error de código o una escritura
  directa.

La selección de un suplente para una sesión podrá apoyarse, en una fase posterior, en: disponibilidad
semanal, skills/especialidades, nivel/programa del salón y conflictos de horario del docente — esto es
un algoritmo/consulta futura, no requiere nuevas tablas además de las ya modeladas.

### 4.8 Pagos y honorarios
- Pagos de estudiantes por paquetes de horas (gestionados por admin). Estados: `pending`,
  `completed`, `failed`, `refunded`.
- Registro automático de horas dictadas y monto calculado por sesión completada (ver 4.7).
- **Período de pago de honorarios (teacher payment period)**: agrupa las horas dictadas de un docente
  en un rango, con estados: `pending` → `pending_receipt` → `receipt_uploaded` → `approved` → `paid`.
- El docente sube un recibo por honorarios **vinculado obligatoriamente** a un período de pago
  específico (no puede subir un recibo "suelto").

## 5. Requerimientos no funcionales

- **Consistencia del sistema de horas**: las operaciones de descuento de horas y registro de horas
  dictadas deben ser atómicas y auditables (no debe existir forma de "perder" o "duplicar" horas),
  aunque el descuento del estudiante sea una acción manual del admin (no automática).
- **Seguridad y aislamiento de datos**: un estudiante nunca debe poder ver salones, materiales o datos
  de otro estudiante; un docente solo ve lo de sus salones asignados. Esto se refuerza a nivel de base
  de datos (RLS), no solo en la UI.
- **Trazabilidad/auditoría**: cambios de rol, movimientos de horas, decisiones de consumo de horas,
  pagos y recibos deben quedar con fecha, autor y estado — nunca sobrescritos silenciosamente.
- **Escalabilidad de contenido**: la jerarquía Salón→Módulo→Lección→Recurso debe soportar crecimiento
  sin rediseño (múltiples salones por programa/nivel, múltiples cohortes).
- **Consistencia visual**: la UI debe respetar estrictamente el Design System ya definido (Claude
  Design) — no se introducen estilos, componentes o tokens fuera de ese sistema.
- **Despliegue**: Next.js (App Router) + Supabase + Vercel; sin infraestructura adicional no solicitada.
- **Zona horaria**: la academia opera en **America/Lima**. Todos los timestamps se persisten en UTC y
  se convierten a hora local de Lima únicamente en la interfaz.
- **Evolución sin rediseño**: la relación salón↔docente debe permitir pasar de "un docente" a
  "varios docentes" (co-enseñanza) sin una migración disruptiva, aunque el MVP solo use un docente
  principal por salón.

## 6. Supuestos confirmados (MVP)

- Un salón tiene **un solo docente titular (`PRIMARY`) activo**, pero puede tener **múltiples
  docentes suplentes (`SUBSTITUTE`)** simultáneamente.
- Cualquier sesión puede ser dictada por un docente distinto al titular (un suplente), sin que esto
  afecte el consumo de horas del estudiante.
- Un estudiante puede pertenecer a **varios salones** simultáneamente.
- El "tipo de programa" es un catálogo administrado (no texto libre).
- Los niveles siguen la escala CEFR: A1, A2, B1, B2, C1, C2. No restringen automáticamente el acceso
  a materiales.
- La compra de un paquete de horas requiere un pago asociado.
- Los paquetes de horas no expiran por defecto (campo `expires_at` nullable, sin lógica de expiración
  activa en el MVP).
- El consumo de horas del estudiante por una sesión es siempre una decisión manual del admin.
- La tarifa aplicada a una sesión dictada queda fija (snapshot) al completarse; nunca se recalcula.
- El placement test, en el MVP, solo registra: número de intento, puntaje, nivel resultante, fecha de
  finalización y estado — sin lógica de examen todavía.
- Un recibo por honorarios siempre pertenece a un período de pago específico (relación obligatoria).

## 7. Decisiones de negocio cerradas (MVP)

Estas decisiones fueron confirmadas por el negocio y ya están reflejadas en las secciones anteriores y
en `DATABASE_PLAN.md`:

1. **Asistencia**: se implementa `session_attendance` por estudiante, con estados `present`, `absent`,
   `cancelled`, `rescheduled`.
2. **Cancelaciones**: sin penalidad automática; el admin decide manualmente si una sesión consume
   horas.
3. **Vigencia de paquetes**: sin expiración obligatoria; campo `expires_at` nullable soportado desde
   el inicio.
4. **Co-enseñanza**: no se implementa en el MVP (un docente principal por salón), pero el modelo evita
   decisiones que bloqueen evolucionar a N:M.
5. **Tarifa del docente**: cada sesión completada guarda un snapshot de la tarifa aplicada; los pagos
   históricos nunca se recalculan con la tarifa actual.
6. **Placement test**: estructura mínima = intentos, puntaje, nivel resultante, fecha de finalización,
   estado. La lógica del examen se implementa después.
7. **Materiales y nivel**: no hay restricción automática por nivel; el acceso depende solo de la
   matrícula en el salón.
8. **Zona horaria**: America/Lima como zona de negocio; persistencia en UTC, conversión en la UI.
9. **Recibos y pagos de honorarios**: el recibo se vincula obligatoriamente a un período de pago
   específico. Estados del período de pago: `pending`, `pending_receipt`, `receipt_uploaded`,
   `approved`, `paid`.
10. **Docentes titulares y suplentes**: un salón admite un titular (`PRIMARY`) y múltiples suplentes
    (`SUBSTITUTE`). La sesión distingue `scheduled_teacher_id` de `actual_teacher_id`; horas y pago se
    acreditan siempre al `actual_teacher_id`. El consumo de horas del estudiante es independiente del
    docente que dictó la sesión. Todo cambio de docente en una sesión queda auditado.

## 8. Glosario

- **Salón (Classroom)**: agrupación de estudiantes + un docente titular y (opcionalmente) uno o más
  docentes suplentes, bajo un programa/nivel, con su propio contenido y calendario.
- **Docente titular (`PRIMARY`)**: docente principal de un salón; único activo por salón en el MVP.
- **Docente suplente (`SUBSTITUTE`)**: docente adicional habilitado para dictar sesiones de un salón
  en lugar del titular; un salón puede tener varios.
- **Sesión/Clase (Session)**: instancia concreta de una clase dentro de un salón, con fecha/hora,
  estado, un docente programado (`scheduled_teacher_id`) y un docente que realmente la dictó
  (`actual_teacher_id`).
- **Asistencia (Session Attendance)**: registro por estudiante del resultado de su participación en
  una sesión específica.
- **Paquete de horas**: compra de un bloque de horas (5/10/20) por parte de un estudiante.
- **Movimiento de horas**: entrada del historial (compra, consumo, ajuste) que afecta el saldo.
- **Horas dictadas**: registro automático de horas y tarifa aplicada, generado al completar una sesión.
- **Período de pago de honorarios (Teacher Payment Period)**: agrupación de horas dictadas de un
  docente en un rango de fechas, con su propio ciclo de aprobación y pago.
- **Recibo por honorarios**: comprobante que el docente sube, vinculado a un período de pago.
