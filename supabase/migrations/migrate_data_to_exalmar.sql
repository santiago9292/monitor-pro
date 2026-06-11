-- ================================================================
--  MIGRAR TODA LA DATA EXISTENTE A LA EMPRESA "EXALMAR" (v1.0)
--  Ejecutar en Supabase SQL Editor para asociar los registros actuales
--  con PESQUERA EXALMAR S.A.A. (ID: '480ab8b9-88b8-4e7a-9fe2-affc02be8ce5')
-- ================================================================

-- 1. Actualizar perfiles de usuario (profiles)
-- (Solo para usuarios que no sean super_admin)
UPDATE public.profiles 
SET empresa_id = '480ab8b9-88b8-4e7a-9fe2-affc02be8ce5'
WHERE role != 'super_admin';

-- 2. Actualizar trabajadores
UPDATE public.trabajadores
SET empresa_id = '480ab8b9-88b8-4e7a-9fe2-affc02be8ce5';

-- 3. Actualizar registros médicos
UPDATE public.registros_medicos
SET empresa_id = '480ab8b9-88b8-4e7a-9fe2-affc02be8ce5';

-- 4. Actualizar evaluaciones médicas (emos)
UPDATE public.emos
SET empresa_id = '480ab8b9-88b8-4e7a-9fe2-affc02be8ce5';

-- 5. Actualizar descansos médicos
UPDATE public.descansos_medicos
SET empresa_id = '480ab8b9-88b8-4e7a-9fe2-affc02be8ce5';

-- 6. Actualizar consentimientos firmados
UPDATE public.consentimientos
SET empresa_id = '480ab8b9-88b8-4e7a-9fe2-affc02be8ce5';

-- 7. Actualizar logs de auditoría
UPDATE public.audit_logs
SET empresa_id = '480ab8b9-88b8-4e7a-9fe2-affc02be8ce5';

-- 8. Actualizar enlaces de consentimiento remoto
UPDATE public.consent_links
SET empresa_id = '480ab8b9-88b8-4e7a-9fe2-affc02be8ce5';

-- 9. Actualizar asignaciones de médicos (medico_empresas)
UPDATE public.medico_empresas
SET empresa_id = '480ab8b9-88b8-4e7a-9fe2-affc02be8ce5';

-- 10. Actualizar tabla antigua perfiles (si existiera en la BD)
-- UPDATE public.perfiles SET empresa_id = '480ab8b9-88b8-4e7a-9fe2-affc02be8ce5' WHERE role != 'super_admin';
