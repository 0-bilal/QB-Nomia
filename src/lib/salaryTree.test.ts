import { describe, expect, it } from 'vitest'
import { salaryPeriods } from './salaryTree'
import type { Transaction } from '../types'

let seq = 0
const tx = (p: Partial<Transaction> & Pick<Transaction, 'type' | 'amount' | 'date'>): Transaction => ({ id: `t${++seq}`, accountId: 'a', ...p })
const salary = (amount: number, date: string) => tx({ type: 'income', amount, date, incomeSourceId: 'src-salary' })

describe('salaryPeriods', () => {
  it('كل راتب ومصاريفه لين قبل الراتب التالي، والأحدث أولًا', () => {
    const aug = salary(3000, '2026-08-27')
    const sep = salary(3000, '2026-09-27')
    const before = tx({ type: 'expense', amount: 99, date: '2026-08-20', categoryId: 'food' })
    const e1 = tx({ type: 'expense', amount: 200, date: '2026-08-27', categoryId: 'food' })
    const e2 = tx({ type: 'expense', amount: 100.5, date: '2026-09-26', categoryId: 'bills' })
    const e3 = tx({ type: 'expense', amount: 50, date: '2026-09-27', categoryId: 'food' })
    const other = tx({ type: 'income', amount: 500, date: '2026-09-01', incomeSourceId: 'src-other' })
    const move = tx({ type: 'transfer', amount: 700, date: '2026-09-02', transferToAccountId: 'b' })
    const periods = salaryPeriods([e3, e2, move, other, e1, before, sep, aug], 'src-salary')

    expect(periods.map((p) => p.salary.id)).toEqual([sep.id, aug.id])
    const [last, first] = periods
    expect(first.from).toBe('2026-08-27')
    expect(first.to).toBe('2026-09-26')
    expect(first.expenses.map((e) => e.id)).toEqual([e1.id, e2.id])
    expect(first.spent).toBe(300.5)
    expect(first.left).toBe(2699.5)
    expect(first.byCategory).toEqual([
      { categoryId: 'food', amount: 200, count: 1 },
      { categoryId: 'bills', amount: 100.5, count: 1 },
    ])
    expect(last.to).toBeNull()
    expect(last.expenses.map((e) => e.id)).toEqual([e3.id])
  })

  it('المصاريف الأكبر من الراتب تعطي باقي سالب', () => {
    const s = salary(1000, '2026-01-01')
    const e = tx({ type: 'expense', amount: 1200, date: '2026-01-05' })
    const [p] = salaryPeriods([e, s], 'src-salary')
    expect(p.left).toBe(-200)
    expect(p.byCategory).toEqual([{ categoryId: '', amount: 1200, count: 1 }])
  })

  it('بدون رواتب: قائمة فاضية', () => {
    expect(salaryPeriods([tx({ type: 'expense', amount: 5, date: '2026-01-01' })], 'src-salary')).toEqual([])
  })
})
