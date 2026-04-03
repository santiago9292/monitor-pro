import { supabase } from '../lib/supabase';

export const userService = {
  /**
   * Obtiene todos los perfiles de usuario.
   */
  async getProfiles() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');
      
      if (error) throw error;
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
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching profile:', error.message);
      return null;
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
