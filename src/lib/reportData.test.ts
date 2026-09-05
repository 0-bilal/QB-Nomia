import { describe, expect, it } from 'vitest'
import {
  avgTransactionByCategoryForMonth,
  buildReportData,
  categoryBreakdownForMonth,
  incomeBreakdownForMonth,
  monthlyTrendEndingAt,
  netWorthTrendEndingAt,
  upcomingObligations,
  weekdaySpendingForMonth,
} from './reportData'
import type { Account, Category, Commitment, IncomeSource, LoanTransaction, RecurringTransaction, Subscription, Transaction, ZakatPayment } from '../types'

const accounts: Account[] = [{ id: 'acc-1', name: 'المحفظة', type: 'cash', balance: 1000 }]
const categories: Category[] = [
  { id: 'cat-food', name: 'مطاعم', kind: 'expense' },
  { id: 'cat-transport', name: 'مواصلات', kind: 'expense' },
]
const incomeSources: IncomeSource[] = [{ id: 'src-salary', name: 'راتب' }]

describe('buildReportData', () => {
  it('sums income and expense only for transactions within the selected month', () => {
    const transactions: Transaction[] = [
      { id: 't1', type: 'expense', amount: 100, date: '2026-08-05', accountId: 'acc-1', categoryId: 'cat-food' },
      { id: 't2', type: 'income', amount: 500, date: '2026-08-10', accountId: 'acc-1', incomeSourceId: 'src-salary' },
      { id: 't3', type: 'expense', amount: 999, date: '2026-07-31', accountId: 'acc-1', categoryId: 'cat-food' }, // خارج الشهر
      { id: 't4', type: 'expense', amount: 999, date: '2026-09-01', accountId: 'acc-1', categoryId: 'cat-food' }, // خارج الشهر
    ]
    const data = buildReportData('2026-08', transactions, categories, incomeSources, accounts)
    expect(data.income).toBe(500)
    expect(data.expense).toBe(100)
    expect(data.net).toBe(400)
    expect(data.transactionRows).toHaveLength(2)
  })

  it('computes the savings rate as a rounded percentage of income, or null with no income', () => {
    const withIncome: Transaction[] = [
      { id: 't1', type: 'income', amount: 1000, date: '2026-08-01', accountId: 'acc-1' },
      { id: 't2', type: 'expense', amount: 250, date: '2026-08-02', accountId: 'acc-1', categoryId: 'cat-food' },
    ]
    expect(buildReportData('2026-08', withIncome, categories, incomeSources, accounts).savingsRate).toBe(75)

    const noIncome: Transaction[] = [{ id: 't1', type: 'expense', amount: 100, date: '2026-08-01', accountId: 'acc-1', categoryId: 'cat-food' }]
    expect(buildReportData('2026-08', noIncome, categories, incomeSources, accounts).savingsRate).toBeNull()
  })

  it('groups expenses by category with a percentage share, sorted by spend descending', () => {
    const transactions: Transaction[] = [
      { id: 't1', type: 'expense', amount: 300, date: '2026-08-01', accountId: 'acc-1', categoryId: 'cat-food' },
      { id: 't2', type: 'expense', amount: 100, date: '2026-08-02', accountId: 'acc-1', categoryId: 'cat-transport' },
    ]
    const data = buildReportData('2026-08', transactions, categories, incomeSources, accounts)
    expect(data.categoryRows).toEqual([
      { name: 'مطاعم', spent: 300, pct: 75 },
      { name: 'مواصلات', spent: 100, pct: 25 },
    ])
  })

  it('falls back to "بدون فئة" for an expense with a missing/unknown category', () => {
    const transactions: Transaction[] = [{ id: 't1', type: 'expense', amount: 50, date: '2026-08-01', accountId: 'acc-1' }]
    const data = buildReportData('2026-08', transactions, categories, incomeSources, accounts)
    expect(data.categoryRows).toEqual([{ name: 'بدون فئة', spent: 50, pct: 100 }])
  })

  it('labels transfers with an arrow between the two account names, and books them as an outflow', () => {
    const other: Account = { id: 'acc-2', name: 'التوفير', type: 'savings', balance: 0 }
    const transactions: Transaction[] = [
      { id: 't1', type: 'transfer', amount: 200, date: '2026-08-01', accountId: 'acc-1', transferToAccountId: 'acc-2' },
    ]
    const data = buildReportData('2026-08', transactions, categories, incomeSources, [...accounts, other])
    expect(data.transactionRows[0]).toMatchObject({ typeLabel: 'تحويل', label: 'المحفظة ← التوفير', amount: -200 })
  })

  it('sorts transaction rows newest first', () => {
    const transactions: Transaction[] = [
      { id: 't1', type: 'expense', amount: 10, date: '2026-08-01', accountId: 'acc-1', categoryId: 'cat-food' },
      { id: 't2', type: 'expense', amount: 20, date: '2026-08-20', accountId: 'acc-1', categoryId: 'cat-food' },
    ]
    const data = buildReportData('2026-08', transactions, categories, incomeSources, accounts)
    expect(data.transactionRows.map((r) => r.date)).toEqual(['2026/08/20', '2026/08/01'])
  })
})

describe('categoryBreakdownForMonth', () => {
  it('includes the budget percentage only for categories that have a budget limit', () => {
    const cats: Category[] = [
      { id: 'cat-food', name: 'مطاعم', kind: 'expense', budgetLimit: 200 },
      { id: 'cat-transport', name: 'مواصلات', kind: 'expense' },
    ]
    const transactions: Transaction[] = [
      { id: 't1', type: 'expense', amount: 150, date: '2026-08-01', accountId: 'acc-1', categoryId: 'cat-food' },
      { id: 't2', type: 'expense', amount: 50, date: '2026-08-02', accountId: 'acc-1', categoryId: 'cat-transport' },
    ]
    const rows = categoryBreakdownForMonth('2026-08', transactions, cats)
    expect(rows.find((r) => r.name === 'مطاعم')).toMatchObject({ spent: 150, budgetLimit: 200, pctOfBudget: 75 })
    expect(rows.find((r) => r.name === 'مواصلات')).toMatchObject({ spent: 50, budgetLimit: undefined, pctOfBudget: null })
  })
})

describe('incomeBreakdownForMonth', () => {
  it('groups income by source with a percentage share', () => {
    const sources: IncomeSource[] = [{ id: 'src-salary', name: 'راتب' }, { id: 'src-side', name: 'عمل حر' }]
    const transactions: Transaction[] = [
      { id: 't1', type: 'income', amount: 3000, date: '2026-08-01', accountId: 'acc-1', incomeSourceId: 'src-salary' },
      { id: 't2', type: 'income', amount: 1000, date: '2026-08-05', accountId: 'acc-1', incomeSourceId: 'src-side' },
    ]
    const rows = incomeBreakdownForMonth('2026-08', transactions, sources)
    expect(rows).toEqual([
      { id: 'src-salary', name: 'راتب', amount: 3000, pctOfTotal: 75 },
      { id: 'src-side', name: 'عمل حر', amount: 1000, pctOfTotal: 25 },
    ])
  })
})

describe('weekdaySpendingForMonth', () => {
  it('buckets expense totals by the JS weekday index of the transaction date', () => {
    // 3 أيام فرق يضمن يومين مختلفين بالأسبوع (فرق 7 أيام يرجّع نفس اليوم)
    const d1 = '2026-08-03'
    const d2 = '2026-08-06'
    const transactions: Transaction[] = [
      { id: 't1', type: 'expense', amount: 100, date: d1, accountId: 'acc-1' },
      { id: 't2', type: 'expense', amount: 50, date: d2, accountId: 'acc-1' },
      { id: 't3', type: 'income', amount: 999, date: d1, accountId: 'acc-1' }, // income excluded
    ]
    const rows = weekdaySpendingForMonth('2026-08', transactions)
    expect(rows).toHaveLength(7)
    expect(rows[new Date(d1).getDay()].total).toBe(100)
    expect(rows[new Date(d2).getDay()].total).toBe(50)
    expect(rows.reduce((s, r) => s + r.total, 0)).toBe(150)
  })
})

describe('avgTransactionByCategoryForMonth', () => {
  it('computes average spend per category, not just total', () => {
    const cats: Category[] = [{ id: 'cat-food', name: 'مطاعم', kind: 'expense' }]
    const transactions: Transaction[] = [
      { id: 't1', type: 'expense', amount: 30, date: '2026-08-01', accountId: 'acc-1', categoryId: 'cat-food' },
      { id: 't2', type: 'expense', amount: 70, date: '2026-08-02', accountId: 'acc-1', categoryId: 'cat-food' },
    ]
    const rows = avgTransactionByCategoryForMonth('2026-08', transactions, cats)
    expect(rows).toEqual([{ name: 'مطاعم', count: 2, total: 100, avg: 50 }])
  })
})

describe('monthlyTrendEndingAt', () => {
  it('ends at the given month instead of always the current month', () => {
    const transactions: Transaction[] = [
      { id: 't1', type: 'income', amount: 500, date: '2026-06-01', accountId: 'acc-1' },
      { id: 't2', type: 'expense', amount: 100, date: '2026-06-05', accountId: 'acc-1' },
      { id: 't3', type: 'income', amount: 999, date: '2026-08-01', accountId: 'acc-1' }, // بعد نهاية النافذة
    ]
    const trend = monthlyTrendEndingAt('2026-06', transactions, 3)
    expect(trend).toHaveLength(3)
    expect(trend[trend.length - 1]).toMatchObject({ income: 500, expense: 100 })
  })
})

describe('netWorthTrendEndingAt', () => {
  const accounts: Account[] = [{ id: 'acc-1', name: 'المحفظة', type: 'cash', balance: 1000 }]

  it('reconstructs a flat history when nothing happened after the window', () => {
    const points = netWorthTrendEndingAt('2026-08', accounts, [], [], [], 3)
    expect(points).toHaveLength(3)
    expect(points.every((p) => p.total === 1000)).toBe(true)
  })

  it('reverses income/expense that happened after a given month-end to get that month-end balance', () => {
    // دخل 500 في يوليو، مصروف 200 في أغسطس — الرصيد الحالي 1000 يعكس الاثنين
    const transactions: Transaction[] = [
      { id: 't1', type: 'income', amount: 500, date: '2026-07-15', accountId: 'acc-1' },
      { id: 't2', type: 'expense', amount: 200, date: '2026-08-10', accountId: 'acc-1' },
    ]
    const points = netWorthTrendEndingAt('2026-08', accounts, transactions, [], [], 3)
    // يونيو: نرجّع أثر حركتي يوليو وأغسطس = -500 (الدخل) + 200 (المصروف) = 1000 - 500 + 200 = 700
    const june = points.find((p) => p.label === new Date(2026, 5, 1).toLocaleDateString('ar-SA-u-ca-gregory', { month: 'short' }))
    expect(june?.total).toBe(700)
    // يوليو: نرجّع أثر حركة أغسطس بس = 1000 + 200 = 1200
    const july = points.find((p) => p.label === new Date(2026, 6, 1).toLocaleDateString('ar-SA-u-ca-gregory', { month: 'short' }))
    expect(july?.total).toBe(1200)
    // أغسطس (الشهر الحالي بالنافذة): الرصيد الحالي كما هو = 1000
    const august = points[points.length - 1]
    expect(august.total).toBe(1000)
  })

  it('ignores transfers between the user\'s own accounts (net zero on total balance)', () => {
    const twoAccounts: Account[] = [...accounts, { id: 'acc-2', name: 'التوفير', type: 'savings', balance: 0 }]
    const transactions: Transaction[] = [
      { id: 't1', type: 'transfer', amount: 300, date: '2026-08-10', accountId: 'acc-1', transferToAccountId: 'acc-2' },
    ]
    const points = netWorthTrendEndingAt('2026-08', twoAccounts, transactions, [], [], 2)
    expect(points.every((p) => p.total === 1000)).toBe(true)
  })

  it('reverses loan-given and zakat-payment effects the same way', () => {
    const loanTransactions: LoanTransaction[] = [{ id: 'l1', personId: 'p1', direction: 'given', amount: 100, accountId: 'acc-1', date: '2026-08-05' }]
    const zakatPayments: ZakatPayment[] = [{ id: 'z1', accountId: 'acc-1', date: '2026-08-05', amount: 50, hawlStartDate: '2025-01-01' }]
    const points = netWorthTrendEndingAt('2026-08', accounts, [], loanTransactions, zakatPayments, 2)
    // يوليو: نرجّع سلفة أعطيتها (+100) وزكاة دفعتها (+50) = 1000 + 100 + 50 = 1150
    expect(points[0].total).toBe(1150)
  })
})

describe('upcomingObligations', () => {
  it('includes only active items due within the window, sorted by due date', () => {
    const subscriptions: Subscription[] = [
      { id: 's1', name: 'Netflix', cost: 40, billingCycle: 'monthly', nextRenewalDate: '2026-08-10', accountId: 'acc-1', status: 'active' },
      { id: 's2', name: 'قديم منتهي', cost: 999, billingCycle: 'monthly', nextRenewalDate: '2026-08-05', accountId: 'acc-1', status: 'cancelled' },
    ]
    const commitments: Commitment[] = [
      { id: 'c1', name: 'إيجار', cost: 500, accountId: 'acc-1', intervalUnit: 'month', intervalCount: 1, nextDueDate: '2026-08-01', status: 'active' },
    ]
    const recurring: RecurringTransaction[] = [
      { id: 'r1', name: 'راتب', type: 'income', amount: 5000, accountId: 'acc-1', intervalUnit: 'month', intervalCount: 1, nextDueDate: '2026-08-03', status: 'active' },
      { id: 'r2', name: 'اشتراك ياهو', type: 'expense', amount: 20, accountId: 'acc-1', intervalUnit: 'month', intervalCount: 1, nextDueDate: '2026-08-20', status: 'active' },
    ]
    const result = upcomingObligations(subscriptions, commitments, recurring, 30, '2026-08-01')
    expect(result.items.map((i) => i.name)).toEqual(['إيجار', 'Netflix', 'اشتراك ياهو'])
    expect(result.total).toBe(500 + 40 + 20)
  })

  it('excludes items due outside the window', () => {
    const subscriptions: Subscription[] = [
      { id: 's1', name: 'بعيد', cost: 40, billingCycle: 'monthly', nextRenewalDate: '2026-12-01', accountId: 'acc-1', status: 'active' },
    ]
    const result = upcomingObligations(subscriptions, [], [], 30, '2026-08-01')
    expect(result.items).toEqual([])
    expect(result.total).toBe(0)
  })
})
