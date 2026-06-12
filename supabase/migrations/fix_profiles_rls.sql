-- ================================================================
--  DIAGNÓSTICO Y FIX DEFINITIVO: RLS de tabla PROFILES
--  (Elimina recursión infinita en las políticas SELECT/UPDATE/INSERT)
-- ================================================================

-- PASO 1: Eliminar TODAS las políticas existentes de profiles
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
  END LOOP;
END $$;

-- Asegurar que RLS esté activo
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ================================================================
--  CREAR POLÍTICAS 100% RECURSION-FREE
--  (No deben hacer queries directos a profiles/profiles_view en el USING.
--   En su lugar usan funciones SECURITY DEFINER o auth.uid() directo)
-- ================================================================

-- 1. Cada usuario puede leer su propio perfil (directo, sin subqueries)
CREATE POLICY "profiles: user reads own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

-- 2. Super Admin puede leer todos los perfiles
-- (Usa get_user_role() que es SECURITY DEFINER y no causa recursión)
CREATE POLICY "profiles: super_admin reads all"
  ON public.profiles FOR SELECT TO authenticated
  USING (get_user_role() = 'super_admin');

-- 3. Admin puede leer perfiles de su misma empresa
-- (Usa get_user_role() y get_user_empresa_id() que son SECURITY DEFINER)
CREATE POLICY "profiles: admin reads empresa profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    get_user_role() = 'admin'
    AND get_user_empresa_id() = empresa_id
  );

-- 4. Cada usuario puede actualizar su propio perfil
CREATE POLICY "profiles: user updates own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 5. Super Admin puede actualizar cualquier perfil
CREATE POLICY "profiles: super_admin updates all"
  ON public.profiles FOR UPDATE TO authenticated
  USING (get_user_role() = 'super_admin');

-- 6. Inserción permitida para el propio usuario (registro inicial)
CREATE POLICY "profiles: insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- ================================================================
--  VERIFICACIÓN FINAL
-- ================================================================
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;
