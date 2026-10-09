import type { Transaction } from '../types'

export interface MonthFlow {
  /** الدخل التراكمي في نهاية كل يوم من أول الشهر حتى اليوم (الفهرس 0 = يوم 1). */
  income: number[]
  /** المصروف التراكمي بنفس الترتيب. */
  expense: number[]
}

/**
 * تدفّق الشهر الحالي يومًا بيوم — لسبارك «تدفّق هذا الشهر».
 * الحركات بتاريخ لاحق داخل نفس الشهر تُحسب في اليوم الحالي، فآخر نقطة = مجموع الشهر (مثل `monthTotals`).
 * التحويلات لا تدخل.
 */
export function monthFlowSeries(transactions: Transaction[], now: Date): MonthFlow {
  const days = now.getDate()
  const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-`
  const inc = new Array<number>(days).fill(0)
  const exp = new Array<number>(days).fill(0)
  for (const t of transactions) {
    if ((t.type !== 'income' && t.type !== 'expense') || !t.date.startsWith(prefix)) continue
    const i = Math.min(days, Number(t.date.slice(8, 10))) - 1
    if (i < 0) continue
    ;(t.type === 'income' ? inc : exp)[i] += t.amount
  }
  for (let i = 1; i < days; i++) {
    inc[i] += inc[i - 1]
    exp[i] += exp[i - 1]
  }
  return { income: inc, expense: exp }
}

export interface CategoryShare<T> {
  /** الفئة، أو null لبند «أخرى». */
  item: T | null
  spent: number
  /** النسبة من مجموع المصروف (0–1). */
  share: number
}

/**
 * أعلى `limit` فئات بالصرف + بند «أخرى» للباقي من مجموع المصروف (المصروف بدون فئة أو الفئات الأصغر).
 * «أخرى» يظهر فقط لو له قيمة.
 */
export function categoryShares<T extends { spent: number }>(items: T[], totalExpense: number, limit = 5): CategoryShare<T>[] {
  const sorted = items.filter((c) => c.spent > 0).sort((a, b) => b.spent - a.spent)
  const total = Math.max(totalExpense, sorted.reduce((s, c) => s + c.spent, 0))
  if (total <= 0) return []
  const top = sorted.slice(0, limit)
  const rows: CategoryShare<T>[] = top.map((c) => ({ item: c, spent: c.spent, share: c.spent / total }))
  const rest = total - top.reduce((s, c) => s + c.spent, 0)
  if (rest > 0.005) rows.push({ item: null, spent: rest, share: rest / total })
  return rows
}
