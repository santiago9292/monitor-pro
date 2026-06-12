-- ================================================================
--  PASO 2: MODIFICAR get_user_empresa_id() CON FALLBACK Y PREVENCIÓN DE RECURSIÓN (v1.0)
--  Ejecutar en Supabase SQL Editor
-- ================================================================

-- 1. Actualizar la vista auxiliar profiles_view para evitar la recursión e incluir active_empresa_id
CREATE OR REPLACE VIEW public.profiles_view AS
  SELECT id, role, empresa_id, active_empresa_id FROM public.profiles;

-- 2. Modificar get_user_empresa_id con fallback a empresa_id usando profiles_view
CREATE OR REPLACE FUNCTION public.get_user_empresa_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $function$
DECLARE
  r_empresa_id UUID;
BEGIN
  SELECT COALESCE(active_empresa_id, empresa_id) INTO r_empresa_id
  FROM public.profiles_view WHERE id = auth.uid();
  RETURN r_empresa_id;
END;
$function$;

-- 3. Asegurar permisos de ejecución
GRANT EXECUTE ON FUNCTION public.get_user_empresa_id() TO authenticated, anon;
