import { supabase } from '../lib/supabase';

export const auditService = {
  /**
   * Registra una acción en la logs de auditoría.
   * @param {Object} params
   * @param {string} params.action - 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'VIEW', etc.
   * @param {string} params.module - 'Trabajadores', 'Descansos', 'Exámenes', etc.
   * @param {string} params.description - Descripción detallada del evento.
   * @param {Object} [params.details] - Datos adicionales en formato JSON.
   */
  async record({ action, module, description, details = null, overrideUser = null }) {
    try {
      // 1. Obtener usuario actual o usar el override
      let userEmail = overrideUser;
      let userName  = null;

      if (!userEmail) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.warn('Audit: Intent to record without an authenticated user.');
          return;
        }
        userEmail = user.email;

        // Buscar nombre completo en profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, nombres, apellidos')
          .eq('id', user.id)
          .single();
        if (profile) {
          userName = profile.full_name || `${profile.nombres} ${profile.apellidos}`.trim();
        }
      }

      // 2. Obtener IP pública
      let ip = 'Unknown';
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        ip = data.ip;
      } catch (err) {
        console.error('Audit: Error fetching IP address', err);
      }

      // 3. Obtener empresa_id activa desde sessionStorage (multi-tenant)
      let empresaId = null;
      try {
        const saved = sessionStorage.getItem('mp_active_empresa');
        if (saved) {
          const empresa = JSON.parse(saved);
          empresaId = empresa?.id || null;
        }
      } catch { /* ignorar */ }

      // 4. Insertar en audit_logs
      const { error } = await supabase.from('audit_logs').insert({
        user_email: userEmail,
        user_name:  userName,
        action,
        module,
        description,
        ip_address: ip,
        details,
        empresa_id: empresaId,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Audit Log Error:', error.message);
    }
  },

  /**
   * Obtiene los logs de auditoría con filtros.
   */
  async getLogs(filters = {}) {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters.user && filters.user !== 'Todos') {
        query = query.eq('user_email', filters.user);
      }

      if (filters.dni) {
        query = query.ilike('description', `%${filters.dni}%`);
      }

      if (filters.since) {
        query = query.gte('created_at', `${filters.since}T00:00:00`);
      }

      if (filters.until) {
        query = query.lte('created_at', `${filters.until}T23:59:59`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching audit logs:', error.message);
      return [];
    }
  },

  /**
   * Obtiene la IP pública del cliente de forma segura.
   */
  async getIP() {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip || 'Unknown';
    } catch (err) {
      console.error('Audit: Error fetching IP address', err);
      return '127.0.0.1'; // Localhost fallback
    }
  },

  /**
   * Obtiene la lista única de usuarios que han realizado acciones.
   */
  async getUniqueUsers() {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('user_email')
        .order('user_email');
      
      if (error) throw error;
      
      // Eliminar duplicados
      const users = [...new Set(data.map(item => item.user_email))];
      return users;
    } catch (error) {
      console.error('Error fetching unique users from audit logs:', error.message);
      return [];
    }
  }
};
