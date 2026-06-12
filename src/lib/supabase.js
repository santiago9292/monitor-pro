import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      lock: async (name, acquireTimeout, fn) => {
        // Bypass del navigator.locks.LockManager de GoTrue.
        // Ese lock se queda "zombie" (held, sin pending) cuando la pestaña
        // pasa a background durante un refresh de token (p.ej. al abrir
        // un PDF en nueva pestaña), dejando toda la app sin poder
        // hacer queries a Supabase nunca más (esperan el lock para siempre).
        return await fn()
      }
    }
  }
)
