const USAGE_KEY = 'qbnomia.moreUsage'
const WINDOW_DAYS = 30
const MAX_VISITS_PER_ROUTE = 50

type UsageMap = Record<string, string[]>

function load(): UsageMap {
  const raw = localStorage.getItem(USAGE_KEY)
  return raw ? JSON.parse(raw) : {}
}

/** يسجّل زيارة لمسار من شاشة "المزيد" — تُستخدم لاحقًا لحساب "الأكثر استخدامًا". */
export function recordMoreVisit(route: string): void {
  const map = load()
  map[route] = [...(map[route] ?? []), new Date().toISOString()].slice(-MAX_VISITS_PER_ROUTE)
  localStorage.setItem(USAGE_KEY, JSON.stringify(map))
}

/** أكثر المسارات زيارة خلال آخر 30 يوم (مو كل الوقت)، حتى تعكس استخدامك الحالي لا القديم. */
export function topUsedRoutes(limit: number): string[] {
  const map = load()
  const cutoff = Date.now() - WINDOW_DAYS * 86400000
  return Object.entries(map)
    .map(([route, visits]) => ({ route, count: visits.filter((v) => new Date(v).getTime() >= cutoff).length }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((r) => r.route)
}
