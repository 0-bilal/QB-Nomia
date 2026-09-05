import type { Account, Category, Commitment, IncomeSource, LoanTransaction, RecurringTransaction, Subscription, Transaction, ZakatPayment } from '../types'
import { formatDate } from './format'

export function currentMonthValue(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export interface ReportTransactionRow {
  date: string
  typeLabel: string
  label: string
  account: string
  amount: number
}

export interface ReportCategoryRow {
  name: string
  spent: number
  pct: number
}

export interface ReportExtraSubscription {
  name: string
  cost: number
  billingCycleLabel: string
}

export interface ReportExtraCommitment {
  name: string
  cost: number
}

export interface ReportExtraDebts {
  totalIOwe: number
  totalOwedToMe: number
}

/** أقسام اختيارية إضافية للتقرير المُصدَّر (PDF/Excel) — يجمّعها المستخدم بنفسه بشاشة التصدير حسب اختياره، بمعزل عن الحسابات الشهرية الأساسية. */
export interface ReportExtras {
  subscriptions?: ReportExtraSubscription[]
  commitments?: ReportExtraCommitment[]
  debts?: ReportExtraDebts
  vehicleCostPerKm?: number | null
}

export interface ReportData {
  periodLabel: string
  generatedAtLabel: string
  income: number
  expense: number
  net: number
  savingsRate: number | null
  categoryRows: ReportCategoryRow[]
  transactionRows: ReportTransactionRow[]
  extras?: ReportExtras
}

export function monthRange(monthValue: string): { startISO: string; endISO: string; label: string } {
  const [y, m] = monthValue.split('-').map(Number)
  const start = new Date(y, m - 1, 1)
  const end = new Date(y, m, 1)
  const toISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return { startISO: toISO(start), endISO: toISO(end), label: start.toLocaleDateString('ar-SA-u-ca-gregory', { month: 'long', year: 'numeric' }) }
}

export function buildReportData(
  monthValue: string,
  transactions: Transaction[],
  categories: Category[],
  incomeSources: IncomeSource[],
  accounts: Account[],
  extras?: ReportExtras,
): ReportData {
  const { startISO, endISO, label } = monthRange(monthValue)
  const inRange = transactions.filter((t) => t.date >= startISO && t.date < endISO).sort((a, b) => (a.date < b.date ? 1 : -1))

  const income = inRange.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expense = inRange.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const net = income - expense
  const savingsRate = income > 0 ? Math.round((net / income) * 100) : null

  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? '—'
  const categoryName = (id?: string) => categories.find((c) => c.id === id)?.name ?? 'بدون فئة'
  const sourceName = (id?: string) => incomeSources.find((s) => s.id === id)?.name ?? 'دخل'

  const spentByCategory = new Map<string, number>()
  for (const t of inRange) {
    if (t.type !== 'expense') continue
    const key = categoryName(t.categoryId)
    spentByCategory.set(key, (spentByCategory.get(key) ?? 0) + t.amount)
  }
  const categoryRows: ReportCategoryRow[] = [...spentByCategory.entries()]
    .map(([name, spent]) => ({ name, spent, pct: expense > 0 ? Math.round((spent / expense) * 100) : 0 }))
    .sort((a, b) => b.spent - a.spent)

  const transactionRows: ReportTransactionRow[] = inRange.map((t) => {
    if (t.type === 'expense') {
      return { date: formatDate(t.date), typeLabel: 'مصروف', label: categoryName(t.categoryId), account: accountName(t.accountId), amount: -t.amount }
    }
    if (t.type === 'income') {
      return { date: formatDate(t.date), typeLabel: 'دخل', label: sourceName(t.incomeSourceId), account: accountName(t.accountId), amount: t.amount }
    }
    return {
      date: formatDate(t.date),
      typeLabel: 'تحويل',
      label: `${accountName(t.accountId)} ← ${accountName(t.transferToAccountId ?? '')}`,
      account: accountName(t.accountId),
      amount: -t.amount,
    }
  })

  return {
    periodLabel: label,
    generatedAtLabel: formatDate(new Date().toISOString().slice(0, 10)),
    income,
    expense,
    net,
    savingsRate,
    categoryRows,
    transactionRows,
    extras,
  }
}

export interface CategorySpendRow {
  id: string
  name: string
  icon?: string
  spent: number
  budgetLimit?: number
  pctOfTotal: number
  /** نسبة الصرف من حد الميزانية المحدَّد لهذي الفئة — null لو ما عندها حد ميزانية أصلًا. */
  pctOfBudget: number | null
}

/** تفصيل مصاريف الفئات لشهر مُحدَّد (أي شهر، مو بس الحالي) مع نسبة كل فئة من حد ميزانيتها لو محدَّدة. */
export function categoryBreakdownForMonth(monthValue: string, transactions: Transaction[], categories: Category[]): CategorySpendRow[] {
  const { startISO, endISO } = monthRange(monthValue)
  const inRange = transactions.filter((t) => t.type === 'expense' && t.date >= startISO && t.date < endISO)

  const spentByCat = new Map<string, number>()
  for (const t of inRange) {
    const key = t.categoryId ?? '__none__'
    spentByCat.set(key, (spentByCat.get(key) ?? 0) + t.amount)
  }
  const totalExpense = [...spentByCat.values()].reduce((s, v) => s + v, 0)

  return [...spentByCat.entries()]
    .map(([key, spent]) => {
      const cat = key === '__none__' ? undefined : categories.find((c) => c.id === key)
      return {
        id: key,
        name: cat?.name ?? 'بدون فئة',
        icon: cat?.icon,
        spent,
        budgetLimit: cat?.budgetLimit,
        pctOfTotal: totalExpense > 0 ? Math.round((spent / totalExpense) * 100) : 0,
        pctOfBudget: cat?.budgetLimit ? Math.round((spent / cat.budgetLimit) * 100) : null,
      }
    })
    .sort((a, b) => b.spent - a.spent)
}

export interface IncomeSourceRow {
  id: string
  name: string
  amount: number
  pctOfTotal: number
}

/** تفصيل الدخل حسب المصدر لشهر مُحدَّد — نظير categoryBreakdownForMonth لكن للدخل. */
export function incomeBreakdownForMonth(monthValue: string, transactions: Transaction[], incomeSources: IncomeSource[]): IncomeSourceRow[] {
  const { startISO, endISO } = monthRange(monthValue)
  const inRange = transactions.filter((t) => t.type === 'income' && t.date >= startISO && t.date < endISO)

  const bySource = new Map<string, number>()
  for (const t of inRange) {
    const key = t.incomeSourceId ?? '__none__'
    bySource.set(key, (bySource.get(key) ?? 0) + t.amount)
  }
  const total = [...bySource.values()].reduce((s, v) => s + v, 0)

  return [...bySource.entries()]
    .map(([key, amount]) => {
      const src = key === '__none__' ? undefined : incomeSources.find((s) => s.id === key)
      return { id: key, name: src?.name ?? 'دخل', amount, pctOfTotal: total > 0 ? Math.round((amount / total) * 100) : 0 }
    })
    .sort((a, b) => b.amount - a.amount)
}

const WEEKDAY_LABELS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

export interface WeekdaySpendRow {
  label: string
  total: number
}

/** إجمالي المصروف حسب يوم الأسبوع لشهر مُحدَّد — يكشف أنماط إنفاق (مثلاً تصرف أكثر آخر الأسبوع). */
export function weekdaySpendingForMonth(monthValue: string, transactions: Transaction[]): WeekdaySpendRow[] {
  const { startISO, endISO } = monthRange(monthValue)
  const totals = new Array(7).fill(0)
  for (const t of transactions) {
    if (t.type !== 'expense' || t.date < startISO || t.date >= endISO) continue
    totals[new Date(t.date).getDay()] += t.amount
  }
  return WEEKDAY_LABELS.map((label, i) => ({ label, total: totals[i] }))
}

export interface CategoryAvgRow {
  name: string
  count: number
  total: number
  avg: number
}

/** متوسط قيمة الحركة لكل فئة لشهر مُحدَّد — يفرّق بين فئة فيها حركات كثيرة صغيرة وفئة فيها حركة كبيرة نادرة. */
export function avgTransactionByCategoryForMonth(monthValue: string, transactions: Transaction[], categories: Category[]): CategoryAvgRow[] {
  const { startISO, endISO } = monthRange(monthValue)
  const inRange = transactions.filter((t) => t.type === 'expense' && t.date >= startISO && t.date < endISO)
  const categoryName = (id?: string) => categories.find((c) => c.id === id)?.name ?? 'بدون فئة'

  const map = new Map<string, { total: number; count: number }>()
  for (const t of inRange) {
    const key = categoryName(t.categoryId)
    const cur = map.get(key) ?? { total: 0, count: 0 }
    cur.total += t.amount
    cur.count += 1
    map.set(key, cur)
  }

  return [...map.entries()]
    .map(([name, { total, count }]) => ({ name, total, count, avg: total / count }))
    .sort((a, b) => b.avg - a.avg)
}

export interface TrendPoint {
  label: string
  income: number
  expense: number
}

/** نفس فكرة monthlyTrend بالسياق العام، لكن ينتهي بأي شهر تختاره (مو دائمًا الشهر الحالي) — يدعم منتقي الشهر بالتقارير. */
export function monthlyTrendEndingAt(monthValue: string, transactions: Transaction[], months = 6): TrendPoint[] {
  const [y, m] = monthValue.split('-').map(Number)
  const result: TrendPoint[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1)
    const mv = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const { startISO, endISO } = monthRange(mv)
    const inRange = transactions.filter((t) => t.date >= startISO && t.date < endISO)
    result.push({
      label: d.toLocaleDateString('ar-SA-u-ca-gregory', { month: 'short' }),
      income: inRange.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
      expense: inRange.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    })
  }
  return result
}

export interface NetWorthPoint {
  label: string
  total: number
}

/**
 * يعيد بناء إجمالي رصيد كل الحسابات (صافي الثروة) بنهاية كل شهر من آخر
 * `months` شهر (تنتهي بـ monthValue) — بما إن التطبيق ما يخزّن تاريخ الرصيد،
 * نرجع للخلف من الرصيد الحالي بعكس أثر كل حركة/سلفة/زكاة صارت بعد نهاية ذاك
 * الشهر. التحويلات بين حسابات المستخدم نفسه محايدة على الإجمالي فتُتجاهَل.
 */
export function netWorthTrendEndingAt(
  monthValue: string,
  accounts: Account[],
  transactions: Transaction[],
  loanTransactions: LoanTransaction[],
  zakatPayments: ZakatPayment[],
  months = 6,
): NetWorthPoint[] {
  const currentTotal = accounts.reduce((s, a) => s + a.balance, 0)
  const [y, m] = monthValue.split('-').map(Number)

  const points: NetWorthPoint[] = []
  for (let i = 0; i < months; i++) {
    const d = new Date(y, m - 1 - i, 1)
    const mv = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const asOfISO = monthRange(mv).endISO

    let delta = 0
    for (const t of transactions) {
      if (t.date < asOfISO) continue
      if (t.type === 'income') delta -= t.amount
      else if (t.type === 'expense') delta += t.amount
    }
    for (const lt of loanTransactions) {
      if (lt.date < asOfISO) continue
      delta += lt.direction === 'given' ? lt.amount : -lt.amount
    }
    for (const z of zakatPayments) {
      if (z.date < asOfISO) continue
      delta += z.amount
    }

    points.push({ label: d.toLocaleDateString('ar-SA-u-ca-gregory', { month: 'short' }), total: currentTotal + delta })
  }
  return points.reverse()
}

export type UpcomingObligationKind = 'subscription' | 'commitment' | 'recurring'

export interface UpcomingObligationItem {
  name: string
  amount: number
  dueDate: string
  kind: UpcomingObligationKind
}

export interface UpcomingObligationsResult {
  total: number
  items: UpcomingObligationItem[]
}

/** الاشتراكات + الالتزامات + الحركات المتكررة (النوع مصروف فقط) المستحقة خلال `withinDays` يومًا قادمة — نظرة استشرافية "كم راح يطلع مني أكيد؟". */
export function upcomingObligations(
  subscriptions: Subscription[],
  commitments: Commitment[],
  recurringTransactions: RecurringTransaction[],
  withinDays: number,
  todayISO = new Date().toISOString().slice(0, 10),
): UpcomingObligationsResult {
  const cutoff = new Date(todayISO)
  cutoff.setDate(cutoff.getDate() + withinDays)
  const cutoffISO = cutoff.toISOString().slice(0, 10)

  const items: UpcomingObligationItem[] = []
  for (const s of subscriptions) {
    if (s.status !== 'active' || s.nextRenewalDate < todayISO || s.nextRenewalDate > cutoffISO) continue
    items.push({ name: s.name, amount: s.cost, dueDate: s.nextRenewalDate, kind: 'subscription' })
  }
  for (const c of commitments) {
    if (c.status !== 'active' || !c.cost || c.nextDueDate < todayISO || c.nextDueDate > cutoffISO) continue
    items.push({ name: c.name, amount: c.cost, dueDate: c.nextDueDate, kind: 'commitment' })
  }
  for (const r of recurringTransactions) {
    if (r.status !== 'active' || r.type !== 'expense' || r.nextDueDate < todayISO || r.nextDueDate > cutoffISO) continue
    items.push({ name: r.name, amount: r.amount, dueDate: r.nextDueDate, kind: 'recurring' })
  }

  items.sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1))
  return { total: items.reduce((s, i) => s + i.amount, 0), items }
}
