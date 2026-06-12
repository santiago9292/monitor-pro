-- ================================================================
--  DIAGNÓSTICO PROFUNDO: Por qué trabajadores sigue colgando
--  Ejecuta cada BLOQUE por separado en el SQL Editor
-- ================================================================

-- ==================================================
-- BLOQUE 1: ¿Funcionan las funciones auxiliares?
-- (Ejecutar con Role: authenticated - tu usuario)
-- ==================================================
SELECT 
  get_user_role()        AS mi_rol,
  get_user_empresa_id()  AS mi_empresa_id,
  has_empresa_access(get_user_empresa_id()) AS tengo_acceso_empresa;

-- ==================================================
-- BLOQUE 2: ¿La profiles_view devuelve datos?
-- ==================================================
SELECT id, role, empresa_id 
FROM public.profiles_view 
WHERE id = auth.uid();

-- ==================================================
-- BLOQUE 3: ¿La query a trabajadores funciona?
-- (Ejecutar con Role: authenticated)
-- ==================================================
SELECT id, dni, nombres, empresa_id 
FROM trabajadores 
WHERE empresa_id = get_user_empresa_id()
LIMIT 3;

-- ==================================================
-- BLOQUE 4: ¿Qué políticas están actualmente en trabajadores?
-- ==================================================
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE tablename = 'trabajadores'
ORDER BY cmd;

-- ==================================================
-- BLOQUE 5 (SI LOS BLOQUES ANTERIORES FALLAN/CUELGAN):
-- SOLUCIÓN TEMPORAL - Deshabilitar RLS temporalmente para diagnóstico
-- SOLO para confirmar si RLS es el problema.
-- Después volver a activar.
-- ==================================================
-- ALTER TABLE public.trabajadores DISABLE ROW LEVEL SECURITY;
-- SELECT * FROM trabajadores LIMIT 3;  -- ¿Funciona ahora?
-- ALTER TABLE public.trabajadores ENABLE ROW LEVEL SECURITY;  -- Volver a activar

-- ==================================================
-- BLOQUE 6: FIX ALTERNATIVO - Reemplazar has_empresa_access en las políticas
-- con una verificación directa (más simple, sin la función)
-- Ejecutar SOLO si los Bloques 1-4 confirman que has_empresa_access es el problema
-- ==================================================
/*
DROP POLICY IF EXISTS "MT: super_admin full access to trabajadores"          ON public.trabajadores;
DROP POLICY IF EXISTS "MT: staff view trabajadores by empresa"               ON public.trabajadores;
DROP POLICY IF EXISTS "MT: staff insert trabajadores"                        ON public.trabajadores;
DROP POLICY IF EXISTS "MT: staff update trabajadores"                        ON public.trabajadores;

-- Política simplificada SIN has_empresa_access:
-- Usa get_user_empresa_id() directamente para comparar empresa
CREATE POLICY "MT: view trabajadores direct"
  ON public.trabajadores FOR SELECT TO authenticated
  USING (
    -- Super admin ve todo
    get_user_role() = 'super_admin'
    OR
    -- Rol de personal: solo su empresa
    (
      get_user_role() IN ('admin', 'medico', 'enfermeria', 'tecnico', 'rrhh')
      AND empresa_id = get_user_empresa_id()
    )
  );

CREATE POLICY "MT: insert trabajadores direct"
  ON public.trabajadores FOR INSERT TO authenticated
  WITH CHECK (
    get_user_role() = 'super_admin'
    OR (
      get_user_role() IN ('admin', 'medico', 'enfermeria', 'tecnico', 'rrhh')
      AND empresa_id = get_user_empresa_id()
    )
  );

CREATE POLICY "MT: update trabajadores direct"
  ON public.trabajadores FOR UPDATE TO authenticated
  USING (
    get_user_role() = 'super_admin'
    OR (
      get_user_role() IN ('admin', 'medico', 'enfermeria', 'tecnico', 'rrhh')
      AND empresa_id = get_user_empresa_id()
    )
  );
*/
