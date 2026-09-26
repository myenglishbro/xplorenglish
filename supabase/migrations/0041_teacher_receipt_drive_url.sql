-- FIX 2 (segunda etapa) -- Recibos por honorarios vía Google Drive. Xplore NUNCA almacena ni
-- gestiona los PDFs: solo el enlace a la carpeta de Drive del docente donde el propio profesor
-- sube sus recibos y donde Admin los revisa manualmente. Ningún flujo de aprobación, ningún vínculo
-- a un teacher_payment concreto -- 1 docente -> 1 carpeta (histórica, contiene todos sus recibos).
-- Columna aditiva y nullable sobre teacher_profiles (misma tabla que ya guarda hourly_rate/bio/status,
-- 1 fila por docente vía profile_id) -- no requiere backfill ni cambia filas existentes.
-- Depende de: 0003 (teacher_profiles + su RLS, sin cambios -- ver nota abajo).

alter table public.teacher_profiles
  add column receipt_drive_url text;

comment on column public.teacher_profiles.receipt_drive_url is
  'Enlace a la carpeta de Google Drive del docente para recibos por honorarios (FIX 2, segunda etapa). Xplore solo almacena y abre esta URL -- nunca sube, lista ni verifica archivos.';

-- RLS: sin cambios. Las policies de 0003 ya cubren exactamente lo que este FIX necesita:
--   teacher_profiles_select_self -- el propio docente lee su fila completa (incluida esta columna
--     nueva, igual que ya lee hourly_rate) o admin lee cualquiera.
--   teacher_profiles_admin_write -- solo admin puede hacer UPDATE (incluida esta columna nueva).
-- Ningún docente tiene (ni tenía) policy de UPDATE sobre teacher_profiles, así que Teacher sigue
-- sin poder modificar su propio receipt_drive_url -- solo leerlo, tal como pide el FIX.
