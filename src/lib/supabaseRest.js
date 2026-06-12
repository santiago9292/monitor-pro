const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

function getAccessToken() {
  try {
    const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0]
    const raw = localStorage.getItem(`sb-${projectRef}-auth-token`)
    const parsed = raw ? JSON.parse(raw) : null
    return parsed?.access_token || null
  } catch {
    return null
  }
}

/**
 * Reemplazo de supabase.from(table).select(...).eq(...).maybeSingle() etc,
 * usando fetch directo a PostgREST con el token de localStorage.
 * @param {string} path - ej: 'descansos_medicos?dni=eq.123&select=*&order=fecha_inicio.desc'
 * @param {object} options - { method, body } para POST/PATCH
 */
export async function restQuery(path, options = {}) {
  const access_token = getAccessToken()
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: options.method || 'GET',
    headers: {
      apikey: SUPABASE_KEY,
      ...(access_token ? { Authorization: `Bearer ${access_token}` } : {}),
      'Content-Type': 'application/json',
      ...(options.method && options.method !== 'GET' ? { Prefer: 'return=representation' } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || `HTTP ${res.status}`)
  }
  return res.json()
}
