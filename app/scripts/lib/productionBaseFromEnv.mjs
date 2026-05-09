/**
 * Production / preview `base` for static hosting (Vite base / router `BASE_URL` shape).
 * Default matches GitHub Pages project-site layout (`/yoochog/`).
 * @param {Record<string, string | undefined>} env
 * @returns {string}
 */
export function productionBaseFromEnv(env) {
  const raw = env.VITE_BASE_PATH
  if (raw === undefined || raw === '') {
    return '/yoochog/'
  }
  const t = String(raw).trim()
  if (t === '' || t === '/') {
    return '/'
  }
  return t.endsWith('/') ? t : `${t}/`
}
