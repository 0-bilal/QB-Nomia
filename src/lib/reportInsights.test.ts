import { describe, expect, it } from 'vitest'
import { busiestWeekday, dailyExpenseForMonth, monthIncomeExpense, monthNotes, pctChange, shiftMonth } from './reportInsights'
import type { Category, Transaction } from '../types'

let n = 0
const tx = (date: string, amount: number, categoryId = 'food', type: Transaction['type'] = 'expense'): Transaction => ({ id: `t${n++}`, type, amount, date, accountId: 'a', categoryId })
const cats: Category[] = [
  { id: 'food', name: 'مطاعم', kind: 'expense' },
  { id: 'car', name: 'مواصلات', kind: 'expense' },
]

describe('month helpers', () => {
  it('shifts across years', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
    expect(shiftMonth('2026-11', 2)).toBe('2027-01')
  })
  it('sums income and expense of a month only', () => {
    const t = [tx('2026-10-01', 100), tx('2026-10-31', 50), tx('2026-11-01', 999), tx('2026-10-05', 3000, undefined, 'income')]
    expect(monthIncomeExpense('2026-10', t)).toEqual({ income: 3000, expense: 150 })
  })
  it('computes percent change', () => {
    expect(pctChange(120, 100)).toBe(20)
    expect(pctChange(80, 100)).toBe(-20)
    expect(pctChange(5, 0)).toBeNull()
  })
  it('builds daily totals and finds the busiest weekday', () => {
    const daily = dailyExpenseForMonth('2026-10', [tx('2026-10-01', 300), tx('2026-10-08', 100), tx('2026-10-02', 50)])
    expect(daily).toHaveLength(31)
    expect(daily[0]).toBe(300)
    // 1 و 8 أكتوبر 2026 خميس
    expect(busiestWeekday('2026-10', daily, 8)).toEqual({ label: 'الخميس', avg: 200 })
    expect(busiestWeekday('2026-10', new Array(31).fill(0), 8)).toBeNull()
  })
})

describe('monthNotes', () => {
  it('reports biggest increase, biggest saving and projection', () => {
    const t = [
      tx('2026-09-10', 600), tx('2026-10-03', 820),
      tx('2026-07-10', 650, 'car'), tx('2026-08-10', 650, 'car'), tx('2026-09-12', 650, 'car'), tx('2026-10-02', 50, 'car'),
    ]
    const notes = monthNotes({ monthValue: '2026-10', transactions: t, categories: cats, monthlyBudgetLimit: 1000, today: new Date(2026, 9, 8) })
    expect(notes.map((x) => x.kind)).toEqual(['up', 'down', 'warn'])
    expect(notes[0].title).toContain('«مطاعم» 37%')
    expect(notes[1].title).toContain('«مواصلات»')
    expect(notes[2].title).toContain('3,371')
  })
  it('skips projection for past months', () => {
    const notes = monthNotes({ monthValue: '2026-09', transactions: [tx('2026-09-01', 10)], categories: cats, monthlyBudgetLimit: 1, today: new Date(2026, 9, 8) })
    expect(notes).toEqual([])
  })
})
