import { describe, expect, it } from 'vitest'
import { buildReportData } from './reportData'
import type { Account, Category, IncomeSource, Transaction } from '../types'

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
