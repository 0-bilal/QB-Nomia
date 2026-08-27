import type { Account, Category, IncomeSource, Transaction } from '../types'
import { formatDate } from './format'

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

export interface ReportData {
  periodLabel: string
  generatedAtLabel: string
  income: number
  expense: number
  net: number
  savingsRate: number | null
  categoryRows: ReportCategoryRow[]
  transactionRows: ReportTransactionRow[]
}

function monthRange(monthValue: string): { startISO: string; endISO: string; label: string } {
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
  }
}
