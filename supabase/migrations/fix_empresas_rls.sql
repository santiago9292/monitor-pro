-- ================================================================
--  POLÍTICAS DE RLS PARA LAS TABLAS empresas Y medico_empresas (v1.0)
--  Ejecutar en Supabase SQL Editor para corregir permisos de inserción y edición.
-- ================================================================

-- Asegurar que RLS esté activo en ambas tablas
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medico_empresas ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas existentes para evitar conflictos
DROP POLICY IF EXISTS "empresas: read access for all" ON public.empresas;
DROP POLICY IF EXISTS "empresas: super_admin full access" ON public.empresas;
DROP POLICY IF EXISTS "medico_empresas: super_admin full access" ON public.medico_empresas;
DROP POLICY IF EXISTS "medico_empresas: medico read own" ON public.medico_empresas;
DROP POLICY IF EXISTS "medico_empresas: authenticated read all" ON public.medico_empresas;

-- 1. POLÍTICAS PARA LA TABLA empresas

-- 1.1 Permitir a todos los usuarios autenticados y anónimos leer empresas (necesario para el código en el login y listados)
CREATE POLICY "empresas: read access for all"
  ON public.empresas FOR SELECT
  USING (true);

-- 1.2 Permitir a super_admin control total (INSERT, UPDATE, DELETE)
CREATE POLICY "empresas: super_admin full access"
  ON public.empresas FOR ALL TO authenticated
  USING (get_user_role() = 'super_admin')
  WITH CHECK (get_user_role() = 'super_admin');


-- 2. POLÍTICAS PARA LA TABLA medico_empresas

-- 2.1 Permitir a super_admin control total (INSERT, UPDATE, DELETE, SELECT)
CREATE POLICY "medico_empresas: super_admin full access"
  ON public.medico_empresas FOR ALL TO authenticated
  USING (get_user_role() = 'super_admin')
  WITH CHECK (get_user_role() = 'super_admin');

-- 2.2 Permitir a médicos leer sus propias asignaciones
CREATE POLICY "medico_empresas: medico read own"
  ON public.medico_empresas FOR SELECT TO authenticated
  USING (medico_id = auth.uid());

-- 2.3 Permitir a otros roles de la empresa leer las relaciones (por ejemplo, para listados y asignaciones)
CREATE POLICY "medico_empresas: authenticated read all"
  ON public.medico_empresas FOR SELECT TO authenticated
  USING (true);
