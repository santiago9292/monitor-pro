-- ================================================================
--  APLICAR PARCHES DE SEGURIDAD CRÍTICOS (v1.0)
--  Ejecutar en Supabase SQL Editor o Supabase CLI
-- ================================================================

-- 1. REESCRIBIR FUNCIÓN admin_update_profile CON VALIDACIONES ESTRICTAS
-- (Evita escalación de privilegios y fuga multi-tenant)
CREATE OR REPLACE FUNCTION public.admin_update_profile(
  target_user_id UUID,
  update_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role TEXT;
  caller_empresa_id UUID;
  target_current_role TEXT;
  target_current_empresa_id UUID;
  new_role TEXT;
  new_empresa_id UUID;
BEGIN
  -- Obtener datos del llamador
  SELECT role, empresa_id INTO caller_role, caller_empresa_id 
  FROM profiles_view 
  WHERE id = auth.uid();

  -- Solo admin y super_admin pueden modificar perfiles
  IF caller_role NOT IN ('super_admin', 'admin') THEN
    RAISE EXCEPTION 'Permiso denegado: solo admin o super_admin pueden modificar perfiles.';
  END IF;

  -- Obtener datos actuales del usuario objetivo
  SELECT role, empresa_id INTO target_current_role, target_current_empresa_id 
  FROM profiles_view 
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuario no encontrado.';
  END IF;

  -- Restricciones para administradores locales (admin)
  IF caller_role = 'admin' THEN
    -- No puede modificar a un super_admin
    IF target_current_role = 'super_admin' THEN
      RAISE EXCEPTION 'Permiso denegado: un administrador local no puede modificar a un super_admin.';
    END IF;

    -- Debe pertenecer a la misma empresa (o el objetivo no tiene empresa asignada aún)
    IF target_current_empresa_id IS DISTINCT FROM caller_empresa_id AND target_current_empresa_id IS NOT NULL THEN
      RAISE EXCEPTION 'Permiso denegado: no puede modificar usuarios de otras empresas.';
    END IF;

    -- Validar nuevo rol
    IF update_data ? 'role' THEN
      new_role := (update_data->>'role')::text;
      IF new_role = 'super_admin' THEN
        RAISE EXCEPTION 'Permiso denegado: no se puede asignar el rol de super_admin.';
      END IF;
    END IF;

    -- Validar nueva empresa
    IF update_data ? 'empresa_id' THEN
      IF (update_data->>'empresa_id') IS NOT NULL THEN
        new_empresa_id := (update_data->>'empresa_id')::uuid;
        IF new_empresa_id IS DISTINCT FROM caller_empresa_id THEN
          RAISE EXCEPTION 'Permiso denegado: solo puede asignar usuarios a su propia empresa.';
        END IF;
      END IF;
    END IF;
  END IF;

  -- Ejecutar actualización segura
  UPDATE profiles SET
    role = CASE WHEN update_data ? 'role' THEN (update_data->>'role')::text ELSE role END,
    empresa_id = CASE WHEN update_data ? 'empresa_id' THEN (update_data->>'empresa_id')::uuid ELSE empresa_id END
  WHERE id = target_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 2. CREAR RPCs DE ACCESO SEGURO A ENLACES Y DATOS DE TRABAJADOR
-- (Previene la descarga masiva de la tabla consent_links y lectura no autorizada de trabajadores)
CREATE OR REPLACE FUNCTION public.get_public_consent_link(link_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  link_data RECORD;
BEGIN
  SELECT * INTO link_data FROM consent_links WHERE id = link_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  RETURN jsonb_build_object(
    'id', link_data.id,
    'dni', link_data.dni,
    'worker_name', link_data.worker_name,
    'testigo_email', link_data.testigo_email,
    'signed', link_data.signed,
    'pdf_url', link_data.pdf_url,
    'phone', link_data.phone,
    'created_at', link_data.created_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_worker_details_for_signing(link_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  link_dni TEXT;
  worker_data RECORD;
BEGIN
  -- Validar el enlace
  SELECT dni INTO link_dni 
  FROM consent_links 
  WHERE id = link_id 
    AND signed = false 
    AND created_at > now() - interval '15 minutes';

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Obtener datos del trabajador
  SELECT nombres, apellidos, puesto, empresa 
  INTO worker_data 
  FROM trabajadores 
  WHERE dni = link_dni;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('dni', link_dni);
  END IF;

  RETURN jsonb_build_object(
    'dni', link_dni,
    'nombres', worker_data.nombres,
    'apellidos', worker_data.apellidos,
    'puesto', worker_data.puesto,
    'empresa', worker_data.empresa
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_public_consent_link_signed(
  link_id UUID,
  pdf_url_param TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dni TEXT;
  v_worker_name TEXT;
  v_empresa_id UUID;
BEGIN
  SELECT dni, worker_name, empresa_id INTO v_dni, v_worker_name, v_empresa_id
  FROM consent_links 
  WHERE id = link_id AND signed = false;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Enlace no válido, expirado o ya firmado.';
  END IF;

  -- Actualizar enlace
  UPDATE consent_links
  SET signed = true, pdf_url = pdf_url_param
  WHERE id = link_id;

  -- Registrar log de auditoría automáticamente en el servidor
  INSERT INTO audit_logs (
    user_email,
    action,
    module,
    description,
    details,
    empresa_id,
    created_at
  )
  VALUES (
    'Paciente (' || v_dni || ')',
    'CREATE',
    'Consentimientos',
    'El trabajador ' || v_worker_name || ' (DNI: ' || v_dni || ') firmó su consentimiento de forma remota.',
    jsonb_build_object('dni', v_dni, 'pdf_url', pdf_url_param),
    v_empresa_id,
    now()
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Otorgar permisos de ejecución de los RPCs a anon y authenticated
GRANT EXECUTE ON FUNCTION public.get_public_consent_link(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_worker_details_for_signing(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_public_consent_link_signed(UUID, TEXT) TO anon, authenticated;

-- 3. AJUSTAR POLÍTICAS RLS DE LA TABLA consent_links
-- Revocar accesos directos por PostgREST para anon, protegiendo contra consultas directas
REVOKE SELECT, UPDATE ON public.consent_links FROM anon;

DROP POLICY IF EXISTS "Allow public read of consent_links by ID" ON public.consent_links;
DROP POLICY IF EXISTS "Allow public update of consent_links" ON public.consent_links;

-- 4. PERMITIR INSERCIÓN SEGURA A PACIENTES ANÓNIMOS EN consentimientos
DROP POLICY IF EXISTS "Allow public insert of consentimientos" ON public.consentimientos;
DROP POLICY IF EXISTS "Allow public insert of consentimientos with valid link" ON public.consentimientos;

CREATE POLICY "Allow public insert of consentimientos with valid link"
  ON public.consentimientos FOR INSERT TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.consent_links
      WHERE consent_links.dni = consentimientos.dni
        AND consent_links.signed = false
        AND consent_links.created_at > now() - interval '15 minutes'
    )
  );

-- Otorgar permisos de insert sobre consentimientos al rol public/anon
GRANT INSERT ON public.consentimientos TO anon;
