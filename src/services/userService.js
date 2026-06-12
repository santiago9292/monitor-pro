import { supabase } from '../lib/supabase';
import { restQuery } from '../lib/supabaseRest';

export const userService = {
  /**
   * Obtiene todos los perfiles de usuario.
   */
  async getProfiles() {
    try {
      const data = await restQuery('profiles?select=*&order=full_name.asc');
      return data || [];
    } catch (error) {
      console.error('Error fetching profiles:', error.message);
      return [];
    }
  },

  /**
   * Obtiene el perfil de un usuario específico.
   */
  async getProfile(userId) {
    try {
      const arr = await restQuery(`profiles?select=*&id=eq.${userId}`);
      const data = arr[0] || null;
      return data;
    } catch (error) {
      console.error('Error fetching profile:', error.message);
      return null;
    }
  },

  /**
   * Actualiza el perfil completo de un usuario.
   */
  async updateProfile(userId, data) {
    try {
      const nombresUpper = data.nombres ? data.nombres.trim().toUpperCase() : '';
      const apellidosUpper = data.apellidos ? data.apellidos.trim().toUpperCase() : '';
      const { error } = await supabase
        .from('profiles')
        .update({
          nombres: nombresUpper,
          apellidos: apellidosUpper,
          full_name: `${nombresUpper} ${apellidosUpper}`.trim(),
          email: data.email,
          dni: data.dni,
          is_medico: data.is_medico,
          cmp: data.is_medico ? data.cmp : null,
          genero: data.genero ? data.genero.trim().toUpperCase() : null,
          fecha_nacimiento: data.fecha_nacimiento,
          role: data.role,
          empresa_id: data.empresa_id || null,   // ← multi-tenant
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error in updateProfile:', error.message);
      return false;
    }
  },

  /**
   * Actualiza el rol de un usuario.
   */
  async updateRole(userId, newRole) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating role:', error.message);
      return false;
    }
  },

  /**
   * Actualiza el estado de un usuario (activo/inactivo).
   */
  async updateStatus(userId, newStatus) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', userId);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating status:', error.message);
      return false;
    }
  }
};
