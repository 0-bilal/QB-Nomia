import { colorFor } from '../components/Avatar'
import type { Category, Transaction } from '../types'

/** لون الفئة — ثابت لكل اسم (نفس اللون بكل الشاشات). */
export function categoryColor(category: Pick<Category, 'name'>): string {
  return colorFor(category.name)
}

/** عدد مرات استخدام كل فئة في المصاريف — يرتّب "الأكثر استخدامًا" باختيار الفئة. */
export function categoryUsageCounts(transactions: Transaction[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const t of transactions) {
    if (t.type === 'expense' && t.categoryId) counts.set(t.categoryId, (counts.get(t.categoryId) ?? 0) + 1)
  }
  return counts
}

/** الفئات مرتّبة بالأكثر استخدامًا (والتعادل يحافظ على ترتيب المستخدم). */
export function mostUsedCategories(categories: Category[], transactions: Transaction[]): Category[] {
  const counts = categoryUsageCounts(transactions)
  return categories
    .map((c, i) => ({ c, i, n: counts.get(c.id) ?? 0 }))
    .sort((a, b) => b.n - a.n || a.i - b.i)
    .map((x) => x.c)
}

export type BudgetState = 'none' | 'ok' | 'near' | 'reached' | 'over'

export function budgetState(spent: number, limit?: number): BudgetState {
  if (!limit) return 'none'
  if (spent > limit) return 'over'
  if (spent === limit) return 'reached'
  return spent / limit >= 0.8 ? 'near' : 'ok'
}

export const BUDGET_STATE_COLOR: Record<BudgetState, string> = {
  none: 'var(--color-text-3)',
  ok: 'var(--color-income)',
  near: 'var(--color-subscription)',
  reached: 'var(--color-expense)',
  over: 'var(--color-expense)',
}

/** نص قصير للمتبقي/التجاوز تحت الفئة. */
export function budgetLeftLabel(spent: number, limit: number | undefined, format: (n: number) => string): string {
  const state = budgetState(spent, limit)
  if (state === 'none' || !limit) return 'بدون ميزانية'
  if (state === 'over') return `تجاوز ${format(spent - limit)}`
  if (state === 'reached') return 'وصلت للحد'
  return `متبقي ${format(limit - spent)}`
}

/** أيام الشهر الحالي واليوم الحالي — لحساب "المتوقع حتى اليوم" و"المسموح يوميًا". */
export function monthProgress(now = new Date()): { day: number; days: number; daysLeft: number } {
  const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const day = now.getDate()
  return { day, days, daysLeft: days - day + 1 }
}
