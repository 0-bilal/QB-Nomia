import type { Reconciliation } from '../types'

/** فئات الريال الورقية والمعدنية لعدّ الكاش — الأكبر أولًا. */
export const DENOMINATIONS = [500, 200, 100, 50, 10, 5, 1] as const

export type DenominationCounts = Partial<Record<number, number>>

/** مجموع عدّ الفئات — null لو ما عُدّ شيء بعد (يختلف عن «عندي صفر»). */
export function countTotal(counts: DenominationCounts): number | null {
  let total = 0
  let any = false
  for (const d of DENOMINATIONS) {
    const n = counts[d] ?? 0
    if (n > 0) any = true
    total += d * n
  }
  return any ? total : null
}

/** مبلغ لوحة الأرقام — null لو الحقل فاضي. */
export function parsePadAmount(value: string): number | null {
  if (value === '' || value === '.') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

/** الفرق بين الفعلي ورصيد التطبيق مقرّبًا للهللة — سالب = نقص، موجب = زيادة. */
export function reconcileDiff(appBalance: number, actual: number): number {
  return Math.round((actual - appBalance) * 100) / 100
}

export type DiffStatus = 'matched' | 'short' | 'over'

export function diffStatus(diff: number): DiffStatus {
  if (diff === 0) return 'matched'
  return diff < 0 ? 'short' : 'over'
}

/** تاريخ آخر مطابقة للحساب (YYYY-MM-DD) — undefined لو ما طوبق أبدًا. */
export function lastReconciledDate(recs: Reconciliation[], accountId: string): string | undefined {
  let last: string | undefined
  for (const r of recs) if (r.accountId === accountId && (!last || r.date > last)) last = r.date
  return last
}

function daysBetween(fromIso: string, today: Date): number {
  const [y, m, d] = fromIso.split('-').map(Number)
  const from = Date.UTC(y, m - 1, d)
  const to = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((to - from) / 86400000)
}

/** عمر آخر مطابقة بالأيام — null لو ما طوبق أبدًا. */
export function daysSinceReconciled(dateIso: string | undefined, today: Date): number | null {
  return dateIso ? Math.max(0, daysBetween(dateIso, today)) : null
}

/** وصف آخر مطابقة تحت اسم الحساب. */
export function reconciledLabel(days: number | null): string {
  if (days === null) return 'لم يُطابق بعد'
  if (days === 0) return 'طابقته اليوم'
  if (days === 1) return 'طابقته أمس'
  if (days === 2) return 'آخر مطابقة قبل يومين'
  return `آخر مطابقة قبل ${days} ${days <= 10 ? 'أيام' : 'يوم'}`
}
