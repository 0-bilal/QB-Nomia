import type { Transaction } from '../types'

/** مبلغ آخر شحنة دخلت على بطاقة الوقود (تحويل إليها أو دخل مسجّل عليها) — مرجع "الخزان الممتلئ" لمؤشر التعبئة. */
export function lastFuelTopUp(accountId: string, transactions: Transaction[]): number | undefined {
  let latest: Transaction | undefined
  for (const t of transactions) {
    const isTopUp =
      (t.type === 'transfer' && t.transferToAccountId === accountId) || (t.type === 'income' && t.accountId === accountId)
    if (isTopUp && t.amount > 0 && (!latest || t.date > latest.date)) latest = t
  }
  return latest?.amount
}

/** مجموع المصروفات المسجَّلة على الحساب خلال شهر معيّن (prefix بصيغة YYYY-MM) — "مشتريات الشهر" لبطاقة Steam. */
export function monthSpending(accountId: string, transactions: Transaction[], monthPrefix: string): number {
  return transactions
    .filter((t) => t.type === 'expense' && t.accountId === accountId && t.date.startsWith(monthPrefix))
    .reduce((sum, t) => sum + t.amount, 0)
}

/** نسبة التعبئة (0..1) = الرصيد ÷ آخر شحنة — بدون شحنة سابقة تُعتبر البطاقة ممتلئة لو فيها رصيد. */
export function fuelLevel(balance: number, lastTopUp: number | undefined): number {
  if (balance <= 0) return 0
  if (!lastTopUp) return 1
  return Math.min(1, balance / lastTopUp)
}

/** لون شريط المؤشر حسب المستوى — ذهبي ممتلئ، برتقالي بالنصف، أحمر قارب على النفاد. */
export function fuelLevelColor(level: number): string {
  if (level < 0.2) return 'linear-gradient(90deg, #ff3b3b, #ff6a3d)'
  if (level < 0.5) return 'linear-gradient(90deg, #ffb347, #ff8a1a)'
  return 'linear-gradient(90deg, #ffd27a, #ff9a2e)'
}
