-- Agrega 'vimeo' al enum resource_type (0005). Único cambio de este bloque de "recursos externos":
-- el resto (detección de proveedor, tipo derivado server-side, vista LMS del estudiante) es
-- lógica de aplicación, no requiere más cambios de schema/RLS.
alter type public.resource_type add value if not exists 'vimeo';
