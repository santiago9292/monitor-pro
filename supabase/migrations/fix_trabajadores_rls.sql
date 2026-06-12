-- ================================================================
--  FIX DEFINITIVO: RLS DE TABLA trabajadores
--  PROBLEMA DETECTADO: La política "ver trabajadores" hace un subquery
--  directo a "perfiles" causando recursión infinita → query se cuelga.
--
--  SOLUCIÓN: Eliminar TODAS las políticas antiguas y reemplazarlas
--  con políticas que usan get_user_role() + has_empresa_access()
--  (estas funciones usan profiles_view internamente, sin recursión).
-- ================================================================

-- PASO 1: Eliminar TODAS las políticas existentes en trabajadores
DROP POLICY IF EXISTS "ver trabajadores"                  ON public.trabajadores;
DROP POLICY IF EXISTS "insertar trabajadores"             ON public.trabajadores;
DROP POLICY IF EXISTS "permitir lectura"                  ON public.trabajadores;
DROP POLICY IF EXISTS "permitir insertar trabajadores"    ON public.trabajadores;

-- También limpiar posibles políticas MT: anteriores
DROP POLICY IF EXISTS "MT: super_admin full access to trabajadores"           ON public.trabajadores;
DROP POLICY IF EXISTS "MT: authenticated users view trabajadores by empresa"  ON public.trabajadores;
DROP POLICY IF EXISTS "MT: authenticated users insert trabajadores"           ON public.trabajadores;
DROP POLICY IF EXISTS "MT: authenticated users update trabajadores"           ON public.trabajadores;

-- PASO 2: Asegurarse de que la vista anti-recursión existe
CREATE OR REPLACE VIEW public.profiles_view AS
  SELECT id, role, empresa_id FROM public.profiles;
GRANT SELECT ON public.profiles_view TO authenticated, anon;

-- PASO 3: Activar RLS (por si acaso)
ALTER TABLE public.trabajadores ENABLE ROW LEVEL SECURITY;

-- PASO 4: Crear políticas correctas (SIN referencias directas a profiles/perfiles)

-- 4.1 Super Admin: acceso total a todos los trabajadores
CREATE POLICY "MT: super_admin full access to trabajadores"
  ON public.trabajadores FOR ALL TO authenticated
  USING (get_user_role() = 'super_admin')
  WITH CHECK (get_user_role() = 'super_admin');

-- 4.2 Personal médico y admin: VER trabajadores de su empresa
CREATE POLICY "MT: staff view trabajadores by empresa"
  ON public.trabajadores FOR SELECT TO authenticated
  USING (
    get_user_role() IN ('admin', 'medico', 'enfermeria', 'tecnico', 'rrhh')
    AND has_empresa_access(empresa_id)
  );

-- 4.3 Personal médico y admin: INSERTAR trabajadores en su empresa
CREATE POLICY "MT: staff insert trabajadores"
  ON public.trabajadores FOR INSERT TO authenticated
  WITH CHECK (
    get_user_role() IN ('admin', 'medico', 'enfermeria', 'tecnico', 'rrhh')
    AND has_empresa_access(empresa_id)
  );

-- 4.4 Personal médico y admin: ACTUALIZAR trabajadores de su empresa
CREATE POLICY "MT: staff update trabajadores"
  ON public.trabajadores FOR UPDATE TO authenticated
  USING (
    get_user_role() IN ('admin', 'medico', 'enfermeria', 'tecnico', 'rrhh')
    AND has_empresa_access(empresa_id)
  );

-- ================================================================
--  VERIFICACIÓN: Ejecuta esto al final para confirmar las nuevas políticas
-- ================================================================
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'trabajadores'
ORDER BY cmd;

-- ================================================================
--  BONUS: Arreglar consentimientos (tiene políticas "public" que deben
--  ser "authenticated" para usuarios logueados)
-- ================================================================
DROP POLICY IF EXISTS "Lectura consentimientos"    ON public.consentimientos;
DROP POLICY IF EXISTS "Inserción consentimientos"  ON public.consentimientos;

-- SELECT: solo personal autenticado puede leer consentimientos
CREATE POLICY "MT: authenticated read consentimientos"
  ON public.consentimientos FOR SELECT TO authenticated
  USING (get_user_role() IN ('super_admin', 'admin', 'medico', 'enfermeria', 'tecnico', 'rrhh'));

-- INSERT: solo personal autenticado puede insertar consentimientos
CREATE POLICY "MT: authenticated insert consentimientos"
  ON public.consentimientos FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('super_admin', 'admin', 'medico', 'enfermeria', 'tecnico', 'rrhh'));

