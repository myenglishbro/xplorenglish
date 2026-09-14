-- Dominio: autorregistro público de estudiantes (frontend, ruta /register)
-- Depende de: 0002 (programs), 0011 (complete_registration ya existe y no se toca).
--
-- Contexto: complete_registration() (0011) ya implementa el aprovisionamiento del profile del
-- propio usuario autenticado (role='student'/status='active'/level='A1' por DEFAULT de columna,
-- nunca parámetros) -- esa función es exactamente la pieza que faltaba conectar desde el
-- frontend, y no requiere ningún cambio.
--
-- Lo único que falta en el esquema es que la página pública /register pueda mostrar el listado de
-- programas ANTES de que exista una sesión (el usuario recién va a crear su cuenta). programs solo
-- tenía SELECT para 'authenticated' (0002); se agrega una policy nueva, acotada a anon y a
-- is_active = true, sin tocar ni reemplazar la policy existente -- ambas conviven.
create policy programs_select_anon on public.programs
  for select to anon
  using (is_active = true);
