import type { Transaction } from '../types'
import { localIso } from './homeFeed'
import { monthKey, shiftMonth } from './txFilters'

/** فترة شاشة الفئات. */
export type CategoryPeriod = 'cur' | 'last' | 'all'

export const CATEGORY_PERIOD_LABEL: Record<CategoryPeriod, string> = {
  cur: 'الشهر الحالي',
  last: 'الشهر الماضي',
  all: 'الكل',
}

/** «10/2026» — رقم الشهر بجانب اسم الفترة (بدون أسماء الأشهر). فارغ لـ«الكل». */
export function periodMonthNumber(period: CategoryPeriod, now: Date): string {
  if (period === 'all') return ''
  const k = period === 'cur' ? monthKey(localIso(now)) : shiftMonth(monthKey(localIso(now)), -1)
  return `${Number(k.slice(5, 7))}/${k.slice(0, 4)}`
}

/** هل التاريخ ضمن الفترة؟ */
export function inPeriod(date: string, period: CategoryPeriod, now: Date): boolean {
  if (period === 'all') return true
  const cur = monthKey(localIso(now))
  return date.startsWith(period === 'cur' ? cur : shiftMonth(cur, -1))
}

/**
 * فترة المقارنة: للشهر الحالي = نفس الأيام من الشهر الماضي (1 → اليوم) حتى تكون المقارنة عادلة،
 * وللشهر الماضي = الشهر الذي قبله كاملًا. «الكل» بدون مقارنة.
 */
export function inComparison(date: string, period: CategoryPeriod, now: Date): boolean {
  const cur = monthKey(localIso(now))
  if (period === 'cur') {
    const prev = shiftMonth(cur, -1)
    return date.startsWith(prev) && Number(date.slice(8, 10)) <= now.getDate()
  }
  if (period === 'last') return date.startsWith(shiftMonth(cur, -2))
  return false
}

/** مجموع المصروف لكل فئة ضمن شرط تاريخ (المفتاح '' = بدون فئة). */
export function spentByCategory(transactions: Transaction[], match: (date: string) => boolean): Map<string, number> {
  const m = new Map<string, number>()
  for (const t of transactions) {
    if (t.type !== 'expense' || !match(t.date)) continue
    const k = t.categoryId ?? ''
    m.set(k, (m.get(k) ?? 0) + t.amount)
  }
  return m
}

/** نسبة التغيّر (مقربة) أو null لو ما فيه أساس للمقارنة. */
export function changePct(current: number, previous: number): number | null {
  if (previous <= 0) return null
  return Math.round(((current - previous) / previous) * 100)
}

export interface AllTimeStats {
  /** عدد الأشهر من أول مصروف حتى الشهر الحالي. */
  months: number
  monthlyAverage: number
  /** أعلى شهر صرفًا (YYYY-MM) ومجموعه. */
  topMonth: { key: string; total: number } | null
  /** تاريخ أول مصروف. */
  since: string | null
}

/** ملخص «الكل»: المتوسط الشهري وأعلى شهر. */
export function allTimeStats(transactions: Transaction[], now: Date): AllTimeStats {
  const byMonth = new Map<string, number>()
  let since: string | null = null
  for (const t of transactions) {
    if (t.type !== 'expense') continue
    const k = monthKey(t.date)
    byMonth.set(k, (byMonth.get(k) ?? 0) + t.amount)
    if (!since || t.date < since) since = t.date
  }
  if (!since) return { months: 0, monthlyAverage: 0, topMonth: null, since: null }
  const cur = monthKey(localIso(now))
  const first = monthKey(since)
  const months = Math.max(1, (Number(cur.slice(0, 4)) - Number(first.slice(0, 4))) * 12 + Number(cur.slice(5, 7)) - Number(first.slice(5, 7)) + 1)
  const total = [...byMonth.values()].reduce((s, v) => s + v, 0)
  let topMonth: AllTimeStats['topMonth'] = null
  for (const [key, v] of byMonth) if (!topMonth || v > topMonth.total) topMonth = { key, total: v }
  return { months, monthlyAverage: total / months, topMonth, since }
}
