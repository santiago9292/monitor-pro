-- ================================================================
--  PASO 1: AGREGAR COLUMNA active_empresa_id Y FUNCIÓN set_active_empresa (v1.0)
--  Ejecutar en Supabase SQL Editor
-- ================================================================

-- 1. Agregar la columna active_empresa_id a profiles si no existe
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active_empresa_id uuid REFERENCES public.empresas(id);

-- 2. Crear la función set_active_empresa
CREATE OR REPLACE FUNCTION public.set_active_empresa(p_empresa_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar que el usuario tenga acceso a esa empresa (a través de medico_empresas o si es super_admin)
  IF NOT EXISTS (
    SELECT 1 FROM public.medico_empresas
    WHERE medico_id = auth.uid() AND empresa_id = p_empresa_id AND activo = true
  ) AND NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND get_user_role() = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'No tiene acceso a esta empresa';
  END IF;

  UPDATE public.profiles SET active_empresa_id = p_empresa_id WHERE id = auth.uid();
END;
$$;

-- 3. Otorgar permisos de ejecución para la función
GRANT EXECUTE ON FUNCTION public.set_active_empresa(uuid) TO authenticated, anon;
