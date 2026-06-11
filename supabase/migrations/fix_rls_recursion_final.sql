-- ================================================================
--  SOLUCIÓN DEFINITIVA A RECURSIÓN RLS EN LA BD (v2.3)
--  Ejecutar en Supabase SQL Editor para corregir el acceso a tablas
-- ================================================================

-- 0. Recrear la vista auxiliar para evitar recursión RLS
DROP VIEW IF EXISTS public.profiles_view CASCADE;
CREATE VIEW public.profiles_view AS
  SELECT id, role, empresa_id FROM public.profiles;
GRANT SELECT ON public.profiles_view TO authenticated, anon;

-- 1. Recrear funciones auxiliares apuntando a la vista profiles_view
-- (profiles_view evita la recursión al no aplicar RLS de la tabla profiles)

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  r_role text;
BEGIN
  SELECT role INTO r_role FROM public.profiles_view WHERE id = auth.uid();
  RETURN r_role;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_empresa_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  r_empresa_id UUID;
BEGIN
  SELECT empresa_id INTO r_empresa_id FROM public.profiles_view WHERE id = auth.uid();
  RETURN r_empresa_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_empresa_access(target_empresa_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  has_access BOOLEAN;
BEGIN
  -- 1. Verificar si es super_admin o si pertenece a la empresa directamente
  SELECT EXISTS (
    SELECT 1 FROM public.profiles_view
    WHERE id = auth.uid()
      AND (
        role = 'super_admin'
        OR empresa_id = target_empresa_id
      )
  ) INTO has_access;

  IF has_access THEN
    RETURN TRUE;
  END IF;

  -- 2. Verificar si es un médico asignado a esta empresa
  SELECT EXISTS (
    SELECT 1 FROM public.medico_empresas
    WHERE medico_id = auth.uid()
      AND empresa_id = target_empresa_id
      AND activo = true
  ) INTO has_access;

  RETURN has_access;
END;
$$;

-- Otorgar permisos de ejecución por seguridad
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_user_empresa_id() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.has_empresa_access(UUID) TO authenticated, anon;

-- ================================================================
-- 2. RECREAR POLÍTICAS DE RLS PARA LA TABLA emos
-- ================================================================

-- Asegurar que RLS esté activado
ALTER TABLE public.emos ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas anteriores por si acaso
DROP POLICY IF EXISTS "MT: super_admin full access to emos" ON public.emos;
DROP POLICY IF EXISTS "MT: medical view emos by empresa" ON public.emos;
DROP POLICY IF EXISTS "MT: medical insert emos for empresa" ON public.emos;
DROP POLICY IF EXISTS "MT: medical update emos for empresa" ON public.emos;
DROP POLICY IF EXISTS "MT: admin delete emos for empresa" ON public.emos;

-- 2.1 Super Admin: Acceso total a todos los registros de EMOs
CREATE POLICY "MT: super_admin full access to emos"
  ON public.emos FOR ALL TO authenticated
  USING (get_user_role() = 'super_admin')
  WITH CHECK (get_user_role() = 'super_admin');

-- 2.2 Personal Médico / Técnico: Ver EMOs de la empresa activa
CREATE POLICY "MT: medical view emos by empresa"
  ON public.emos FOR SELECT TO authenticated
  USING (
    get_user_role() IN ('admin', 'medico', 'enfermeria', 'tecnico')
    AND has_empresa_access(empresa_id)
  );

-- 2.3 Personal Médico / Técnico: Insertar EMOs para la empresa activa
CREATE POLICY "MT: medical insert emos for empresa"
  ON public.emos FOR INSERT TO authenticated
  WITH CHECK (
    get_user_role() IN ('admin', 'medico', 'enfermeria', 'tecnico')
    AND has_empresa_access(empresa_id)
  );

-- 2.4 Personal Médico / Técnico: Actualizar EMOs de la empresa activa
CREATE POLICY "MT: medical update emos for empresa"
  ON public.emos FOR UPDATE TO authenticated
  USING (
    get_user_role() IN ('admin', 'medico', 'enfermeria', 'tecnico')
    AND has_empresa_access(empresa_id)
  );

-- 2.5 Admin local: Eliminar EMOs de su empresa
CREATE POLICY "MT: admin delete emos for empresa"
  ON public.emos FOR DELETE TO authenticated
  USING (
    get_user_role() = 'admin'
    AND has_empresa_access(empresa_id)
  );
