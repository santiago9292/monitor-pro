-- 1. FUNCIÓN PARA OBTENER EL ROL DEL USUARIO
-- Esta función nos permite consultar rápidamente el rol del usuario autenticado en las políticas de RLS.
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. FUNCIÓN PARA AUDITORÍA AUTOMÁTICA DE BORRADOS
-- Registra en audit_logs quién intentó borrar qué, justo antes de que ocurra.
CREATE OR REPLACE FUNCTION public.audit_delete_trigger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_logs (
    user_email,
    action,
    module,
    description,
    details,
    created_at
  )
  VALUES (
    (SELECT email FROM auth.users WHERE id = auth.uid()),
    'DELETE',
    TG_TABLE_NAME,
    'Eliminación de registro en la tabla: ' || TG_TABLE_NAME,
    jsonb_strip_nulls(to_jsonb(OLD)),
    now()
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. ACTIVAR RLS EN TODAS LAS TABLAS CRÍTICAS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trabajadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros_medicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.descansos_medicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consentimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cie ENABLE ROW LEVEL SECURITY;

-- 4. CONFIGURAR TRIGGERS DE AUDITORÍA PARA BORRADOS
-- Se activan solo en comandos DELETE para asegurar que el admin sea auditado.
DROP TRIGGER IF EXISTS tr_audit_delete_trabajadores ON public.trabajadores;
CREATE TRIGGER tr_audit_delete_trabajadores BEFORE DELETE ON public.trabajadores FOR EACH ROW EXECUTE FUNCTION public.audit_delete_trigger();

DROP TRIGGER IF EXISTS tr_audit_delete_registros ON public.registros_medicos;
CREATE TRIGGER tr_audit_delete_registros BEFORE DELETE ON public.registros_medicos FOR EACH ROW EXECUTE FUNCTION public.audit_delete_trigger();

DROP TRIGGER IF EXISTS tr_audit_delete_emos ON public.emos;
CREATE TRIGGER tr_audit_delete_emos BEFORE DELETE ON public.emos FOR EACH ROW EXECUTE FUNCTION public.audit_delete_trigger();

DROP TRIGGER IF EXISTS tr_audit_delete_descansos ON public.descansos_medicos;
CREATE TRIGGER tr_audit_delete_descansos BEFORE DELETE ON public.descansos_medicos FOR EACH ROW EXECUTE FUNCTION public.audit_delete_trigger();

-- 5. POLÍTICAS DE ACCESO (POLICIES)

-- --- TABLA: profiles ---
CREATE POLICY "Admin: Full access to profiles" ON public.profiles FOR ALL TO authenticated USING (get_user_role() = 'admin');
CREATE POLICY "User: Can view all staff" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "User: Can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- --- TABLA: trabajadores ---
CREATE POLICY "Staff: Can view workers" ON public.trabajadores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff: Can insert/update workers" ON public.trabajadores FOR INSERT TO authenticated WITH CHECK (get_user_role() IN ('admin', 'medico', 'enfermeria', 'rrhh'));
CREATE POLICY "Staff: Can update workers" ON public.trabajadores FOR UPDATE TO authenticated USING (get_user_role() IN ('admin', 'medico', 'enfermeria', 'rrhh'));
CREATE POLICY "Admin: Only admin can delete workers" ON public.trabajadores FOR DELETE TO authenticated USING (get_user_role() = 'admin');

-- --- TABLA: registros_medicos ---
CREATE POLICY "Medical: Access for medical staff and admin" ON public.registros_medicos FOR SELECT TO authenticated USING (get_user_role() IN ('admin', 'medico', 'enfermeria'));
CREATE POLICY "Medical: Insert for medical staff and admin" ON public.registros_medicos FOR INSERT TO authenticated WITH CHECK (get_user_role() IN ('admin', 'medico', 'enfermeria'));
CREATE POLICY "Medical: Update for medical staff and admin" ON public.registros_medicos FOR UPDATE TO authenticated USING (get_user_role() IN ('admin', 'medico', 'enfermeria'));
CREATE POLICY "Admin: Only admin can delete medical records" ON public.registros_medicos FOR DELETE TO authenticated USING (get_user_role() = 'admin');

-- --- TABLA: emos (Resultados Médicos) ---
CREATE POLICY "Medical: Access for emos" ON public.emos FOR SELECT TO authenticated USING (get_user_role() IN ('admin', 'medico', 'enfermeria'));
CREATE POLICY "Medical: Insert for emos" ON public.emos FOR INSERT TO authenticated WITH CHECK (get_user_role() IN ('admin', 'medico', 'enfermeria'));
CREATE POLICY "Medical: Update for emos" ON public.emos FOR UPDATE TO authenticated USING (get_user_role() IN ('admin', 'medico', 'enfermeria'));
CREATE POLICY "Admin: Only admin can delete emos" ON public.emos FOR DELETE TO authenticated USING (get_user_role() = 'admin');

-- --- TABLA: descansos_medicos ---
CREATE POLICY "All Staff: Access to medical leaves" ON public.descansos_medicos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff: Insert leaves" ON public.descansos_medicos FOR INSERT TO authenticated WITH CHECK (get_user_role() IN ('admin', 'medico', 'enfermeria', 'rrhh'));
CREATE POLICY "Staff: Update leaves" ON public.descansos_medicos FOR UPDATE TO authenticated USING (get_user_role() IN ('admin', 'medico', 'enfermeria', 'rrhh'));
CREATE POLICY "Admin: Only admin can delete leaves" ON public.descansos_medicos FOR DELETE TO authenticated USING (get_user_role() = 'admin');

-- --- TABLA: consentimientos ---
CREATE POLICY "Medical: Access for consents" ON public.consentimientos FOR SELECT TO authenticated USING (get_user_role() IN ('admin', 'medico', 'enfermeria'));
CREATE POLICY "Medical: Insert consents" ON public.consentimientos FOR INSERT TO authenticated WITH CHECK (get_user_role() IN ('admin', 'medico', 'enfermeria'));
CREATE POLICY "Admin: Only admin can delete consents" ON public.consentimientos FOR DELETE TO authenticated USING (get_user_role() = 'admin');

-- --- TABLA: audit_logs ---
CREATE POLICY "Admin: View all audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (get_user_role() = 'admin');
CREATE POLICY "Log: Everyone can record logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- --- TABLA: cie (Diccionario Médico) ---
CREATE POLICY "Read Only: Access to CIE" ON public.cie FOR SELECT TO authenticated USING (true);
