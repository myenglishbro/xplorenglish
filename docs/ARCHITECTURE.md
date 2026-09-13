# ARCHITECTURE.md — Plataforma Educativa (Academia de Inglés)

## 1. Principios de diseño

1. **Stack fijo, sin librerías extra no justificadas**: Next.js (App Router) + TypeScript + Tailwind +
   Supabase + Vercel. No se introduce state-management, ORM ni UI kit adicional salvo necesidad real.
2. **Server-first**: React Server Components por defecto; Client Components solo donde hay
   interactividad real (Start/End Class, calendarios, formularios, uploads).
3. **Server Actions para mutaciones**: evitar una capa extra de API routes salvo para webhooks o
   integraciones externas (ej. callbacks de Storage).
4. **Seguridad en profundidad**: la autorización real vive en **RLS de Supabase** (por rol y por
   pertenencia a salón). El middleware de Next.js y los checks en UI son una capa de UX, no la fuente
   de verdad de seguridad.
5. **Separación por dominio, no solo por rol**: la lógica de acceso a datos se organiza en módulos de
   dominio (usuarios, salones, horas, pagos) reutilizables entre roles.
6. **El Design System manda sobre la UI**: los componentes de `components/ui` son la única fuente de
   estilos primitivos, mapeados 1:1 a los tokens del Design System de Claude Design.
7. **Automático solo donde el negocio lo pidió automático**: el registro de horas dictadas por el
   docente y su tarifa (snapshot) es automático al completar una sesión. El descuento de horas del
   estudiante **no** lo es — es una decisión manual del admin. Estos son dos flujos y dos operaciones
   transaccionales distintas, no una sola.
8. **Diseñar para evolución, no para especular**: donde el negocio confirmó que algo podría cambiar
   (docente único → co-enseñanza), se elige el modelo que evita una migración disruptiva, sin
   implementar la funcionalidad futura en sí.
9. **La asignación de un salón no es la fuente de verdad de quién cobra ni de quién puede dictar una
   sesión concreta**: `classroom_teachers` (titular/suplentes) registra relaciones **habituales** de
   planificación. `sessions.actual_teacher_id` puede ser cualquier docente activo del sistema —no
   requiere alta previa en `classroom_teachers`— y es siempre quien determina horas dictadas y pago.

## 2. Capas de la aplicación

```
┌─────────────────────────────────────────────────────────┐
│  UI (App Router)                                         │
│  route groups por rol: (auth) (admin) (teacher) (student) │
│  Server Components (lectura) + Client Components (acción) │
│  timestamps convertidos a America/Lima solo en esta capa   │
└───────────────┬─────────────────────────────────────────┘
                │ llama a
┌───────────────▼─────────────────────────────────────────┐
│  Server Actions / Mutations                               │
│  (validación de input con zod, autorización de negocio)   │
└───────────────┬─────────────────────────────────────────┘
                │ usa
┌───────────────▼─────────────────────────────────────────┐
│  Capa de dominio (server/<dominio>)                        │
│  queries.ts (lecturas) + actions.ts (escrituras) + types   │
│  única capa que conoce el esquema de Supabase              │
└───────────────┬─────────────────────────────────────────┘
                │ Supabase client (server) / RPC
┌───────────────▼─────────────────────────────────────────┐
│  Supabase                                                  │
│  Postgres (UTC) + RLS, Auth, Storage, RPC transaccionales   │
│  (completar sesión, cargar horas, comprar paquete, etc.)    │
└─────────────────────────────────────────────────────────┘
```

**Por qué una capa de dominio intermedia**: operaciones críticas de negocio (completar sesión, cargar
horas de un estudiante, agrupar horas dictadas en un período de pago) tocan varias tablas de forma
atómica. Esa lógica vive en un solo lugar (`server/<dominio>/actions.ts`, respaldado por
funciones/RPC de Postgres), nunca dispersa en componentes de UI.

## 3. Autenticación y autorización

- **Autenticación**: Supabase Auth (email/password). El registro captura los campos adicionales
  (nombres, apellidos, DNI, teléfono, programa) en `profiles`, vinculada a `auth.users.id`.
- **Rol**: un campo `role` (admin/teacher/student) en `profiles`. Cambiar de student → teacher es
  una operación exclusiva de admin, ejecutada como transacción (actualizar rol + crear
  `teacher_profiles` + registrar en `role_changes`).
- **Middleware** (`middleware.ts`): redirige según sesión + rol. Es una guarda de experiencia, no de
  seguridad de datos.
- **RLS**: cada tabla sensible tiene políticas que filtran por rol y por relación explícita
  (matrícula, asignación docente-salón). Ver lista completa en `DATABASE_PLAN.md` §11.

## 4. Estructura de carpetas propuesta

```
xplorenglish/
├── docs/
│   ├── REQUIREMENTS.md
│   ├── ARCHITECTURE.md
│   └── DATABASE_PLAN.md
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   └── layout.tsx
│   │   ├── (admin)/
│   │   │   ├── layout.tsx                 # guard: role === admin
│   │   │   ├── dashboard/
│   │   │   ├── usuarios/
│   │   │   ├── salones/
│   │   │   ├── horarios/
│   │   │   ├── paquetes/
│   │   │   ├── pagos/
│   │   │   └── docentes/
│   │   │       └── pagos-honorarios/       # períodos de pago + recibos
│   │   ├── (teacher)/
│   │   │   ├── layout.tsx                 # guard: role === teacher
│   │   │   ├── dashboard/
│   │   │   ├── salones/
│   │   │   ├── disponibilidad/
│   │   │   ├── calendario/
│   │   │   ├── pagos/                     # períodos de pago propios
│   │   │   └── recibos/                   # subir recibo vinculado a un período
│   │   ├── (student)/
│   │   │   ├── layout.tsx                 # guard: role === student
│   │   │   ├── dashboard/
│   │   │   ├── salones/[salonId]/
│   │   │   ├── clases/
│   │   │   ├── horas/
│   │   │   ├── placement-test/
│   │   │   └── perfil/
│   │   ├── layout.tsx                     # root layout, providers
│   │   └── page.tsx                       # landing / redirect por rol
│   ├── components/
│   │   ├── ui/                            # primitivos del Design System
│   │   ├── shared/                        # compuestos reutilizables entre roles
│   │   ├── admin/
│   │   ├── teacher/
│   │   └── student/
│   ├── server/                            # capa de dominio (única con acceso a Supabase)
│   │   ├── users/                         # perfiles, cambio de rol
│   │   ├── classrooms/                    # salones, classroom_teachers, classroom_students
│   │   ├── content/                       # módulos, lecciones, recursos
│   │   ├── sessions/                      # sesiones, asistencia, start/end class
│   │   ├── hours/                         # paquetes + ledger de horas
│   │   ├── payments/                      # pagos de estudiantes
│   │   └── payroll/                       # horas dictadas, períodos de pago, recibos
│   │       (cada módulo: queries.ts, actions.ts, types.ts)
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts                  # browser client
│   │   │   ├── server.ts                  # server client (RSC/actions)
│   │   │   └── middleware.ts
│   │   ├── auth/                          # helpers de sesión/rol
│   │   ├── datetime/                      # conversión UTC ↔ America/Lima (única capa que lo hace)
│   │   └── validations/                   # esquemas zod compartidos
│   ├── types/
│   │   └── database.types.ts              # generado con `supabase gen types`
│   ├── styles/globals.css
│   └── middleware.ts
├── supabase/
│   ├── migrations/                        # vacío por ahora
│   └── config.toml
├── public/
├── tailwind.config.ts                     # tokens del Design System
├── next.config.js
├── package.json
└── tsconfig.json
```

**Nota sobre `lib/datetime`**: todo timestamp se guarda y viaja en UTC hasta esta capa. La conversión
a `America/Lima` ocurre **solo** al renderizar en UI o al interpretar input de formularios — nunca en
la capa de dominio ni en la base de datos.

## 5. Contenido y materiales

- Recursos tipo PDF se almacenan en **Supabase Storage** (bucket `materials`), con URL firmada
  generada server-side según pertenencia al salón.
- Recursos tipo Drive/Docs/Slides/YouTube/URL/HTML embed se guardan como referencia (URL + tipo).
- El acceso a materiales depende **solo** de `classroom_students` (matrícula) — no se filtra por nivel
  del estudiante en ningún punto (ni RLS, ni UI, ni query).

## 6. Manejo de archivos (Storage)

| Bucket | Contenido | Quién sube | Quién lee |
|---|---|---|---|
| `materials` | PDFs de lecciones | admin/teacher del salón | estudiantes matriculados + admin/teacher del salón |
| `receipts` | recibos por honorarios | teacher (los propios) | el propio teacher + admin |

## 7. Despliegue (Vercel + Supabase)

- Un proyecto de Supabase por entorno, con variables de entorno propias en Vercel (`Production`,
  `Preview`, `Development`).
- Sin conexiones directas a Postgres desde la app (solo vía cliente Supabase/PostgREST o RPC).
- Tipos generados (`database.types.ts`) se regeneran tras cada cambio de esquema y se commitean.

## 8. Riesgos de arquitectura (actualizado tras cierre de decisiones)

| # | Riesgo | Impacto | Mitigación propuesta |
|---|---|---|---|
| 1 | El Design System (Claude Design) aún no está exportado como tokens utilizables en Tailwind | Se podrían "inventar" estilos por accidente | Exportar/traducir el Design System a `tailwind.config.ts` + `components/ui` antes de construir cualquier pantalla |
| 2 | Dos flujos de "completar sesión" (horas dictadas automático vs. consumo de horas manual) pueden confundirse en la UI y generar la expectativa de que todo es automático | Estudiantes o docentes reportando "no se descontaron mis horas" como si fuera un bug | Diseñar la UI de admin con un paso explícito "¿esta sesión consume horas?" desacoplado del botón End Class del docente |
| 3 | Concurrencia en operaciones críticas (doble clic en End Class, doble carga de horas, compras simultáneas) | Doble registro de horas dictadas o doble movimiento de horas | Cada operación crítica se implementa como función/RPC de Postgres idempotente (ver `DATABASE_PLAN.md` §12) |
| 4 | Tarifa del docente puede cambiar en el tiempo | Ya resuelto por decisión de negocio: se guarda snapshot en `teacher_hours_log` | Ninguna acción adicional; verificar en implementación que ningún cálculo de honorarios históricos lea `teacher_profiles.hourly_rate` en vivo |
| 5 | Relación salón-docente modelada como tabla intermedia (`classroom_teachers`, con `teacher_role` `PRIMARY`/`SUBSTITUTE`) en vez de columna simple | Ya no es una decisión especulativa: el requerimiento de titulares+suplentes la confirma como necesaria | "Un solo `PRIMARY` activo por salón" protegido con **índice único parcial a nivel de base de datos** (no solo regla de aplicación); `SUBSTITUTE` sin límite |
| 11 | `actual_teacher_id` de una sesión puede quedar sin definir y bloquear el End Class, o cambiarse después de completada la sesión | Sesión sin poder completarse, o inconsistencia entre `teacher_hours_log` (ya generado con snapshot) y un `actual_teacher_id` cambiado después | Validar `actual_teacher_id IS NOT NULL` como precondición de la transacción "completar sesión"; una vez `completed`, `actual_teacher_id` se vuelve inmutable — corregirlo requiere un proceso de ajuste explícito, no un update silencioso |
| 12 | Historial de reasignación de docente por sesión no capturado si solo se sobrescriben campos en `sessions` | Se pierde "quién cambió y cuándo" si una sesión se reasigna más de una vez, o si se reasigna el docente programado en vez del real | Tabla de auditoría dedicada `session_teacher_changes` con `change_type` (`SCHEDULED_TEACHER_CHANGED`/`ACTUAL_TEACHER_CHANGED`), en línea con el patrón ya usado en `role_changes` |
| 13 | `actual_teacher_id` puede apuntar a un docente sin ninguna relación previa con el salón (sustitución puntual no registrada en `classroom_teachers`) | RLS y queries que asuman "el docente de una sesión siempre está en `classroom_teachers`" fallarían | Diseñar RLS de `sessions`/`teacher_hours_log` para verificar `actual_teacher_id = auth.uid()` directamente, sin depender de `classroom_teachers` como prerequisito |
| 6 | RLS mal diseñado en la jerarquía Salón→Módulo→Lección→Recurso | Fugas de contenido entre salones, o queries N+1 costosas | Políticas RLS ancladas siempre en `classroom_students`/`classroom_teachers`, con vistas o funciones que resuelvan el árbol en una sola consulta |
| 7 | Recibo obligatoriamente vinculado a un período de pago implica que el período debe existir antes de que el docente pueda subir el recibo | Docente bloqueado si admin no ha creado el período a tiempo | El flujo de UI del docente debe mostrar claramente "no hay período pendiente de recibo" en vez de un formulario roto |
| 8 | Placement test con esquema mínimo (sin lógica de examen) | Riesgo de subdimensionar el modelo cuando se defina el examen real | Se documenta explícitamente como esquema provisional, sujeto a extenderse (no a rediseñarse) cuando se defina el formato del test |
| 9 | Zona horaria de negocio única (America/Lima) pero timestamps en UTC | Errores de conversión si algún punto de la app persiste hora local en vez de UTC | Toda escritura de timestamp pasa por `lib/datetime`; ningún componente arma fechas "a mano" |
| 10 | Server Actions para operaciones críticas de dinero/horas sin capa de reintentos/idempotencia | Doble cobro o doble descuento ante reintentos de red | Diseñar acciones críticas como idempotentes (clave natural: `session_id`, `attendance_id`) desde `server/` |

## 9. Próximos pasos

El modelo conceptual (`DATABASE_PLAN.md`) está **congelado en v1.0**. El plan de migraciones,
ordenado y dividido por dominio, está en `MIGRATIONS_PLAN.md` (resumen) y `supabase/migrations/`
(SQL), pendiente de revisión de orden por el usuario antes de ejecutarse contra un proyecto real.

1. Revisar el orden y contenido de las migraciones en `MIGRATIONS_PLAN.md`.
2. Ejecutarlas contra un proyecto Supabase de desarrollo (`supabase db push` o `supabase migration
   up`, según el flujo elegido) — **no realizado todavía**.
3. Obtener/exportar los tokens del Design System (Claude Design) para `tailwind.config.ts`.
4. Recién ahí, iniciar scaffolding del proyecto Next.js y las primeras pantallas.
