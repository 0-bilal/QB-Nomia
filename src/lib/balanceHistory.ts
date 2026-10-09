import type { ActivityItem } from '../state/DataContext'
import { localIso } from './homeFeed'

/** أثر حركة على مجموع الحسابات المحسوبة بالإجمالي (التحويل بين حسابين محسوبين = صفر). */
export function effectOn(item: ActivityItem, included: Set<string>): number {
  if (item.kind === 'transfer') {
    const [from, to] = item.accountIds
    return (included.has(from) ? item.amount : 0) + (to && included.has(to) ? -item.amount : 0)
  }
  return included.has(item.accountIds[0]) ? item.amount : 0
}

/**
 * رصيد نهاية كل يوم لآخر `days` يوم (الأقدم أولًا، والأخير = الرصيد الحالي) —
 * يُحسب للخلف من الرصيد الحالي بطرح صافي كل يوم.
 */
export function balanceSeries(items: ActivityItem[], included: Set<string>, current: number, days: number, today: Date): { date: string; balance: number }[] {
  const net = new Map<string, number>()
  for (const it of items) {
    const e = effectOn(it, included)
    if (e) net.set(it.date, (net.get(it.date) ?? 0) + e)
  }
  // حركات بتاريخ مستقبلي (مجدولة) لا تدخل في رصيد اليوم ولا قبله — الرصيد الحالي يشملها، فنطرحها أولًا.
  const todayIso = localIso(today)
  let bal = current
  for (const [d, v] of net) if (d > todayIso) bal -= v

  const out: { date: string; balance: number }[] = []
  const cursor = new Date(today)
  for (let i = 0; i < days; i++) {
    const iso = localIso(cursor)
    out.push({ date: iso, balance: Math.round(bal * 100) / 100 })
    bal -= net.get(iso) ?? 0
    cursor.setDate(cursor.getDate() - 1)
  }
  return out.reverse()
}

/** رصيد نهاية كل يوم لمجموعة حسابات (حساب واحد أو كلها) — الأقدم أولًا، والأخير = `current`. */
export function accountsBalanceValues(items: ActivityItem[], accountIds: string[], current: number, days: number, today: Date): number[] {
  return balanceSeries(items, new Set(accountIds), current, days, today).map((p) => p.balance)
}

/** لون الاتجاه: أخضر لو آخر قيمة ≥ أول قيمة، وأحمر لو نازل. */
export function trendColor(values: number[]): string {
  return values.length === 0 || values[values.length - 1] >= values[0] ? 'var(--color-income)' : 'var(--color-expense)'
}
