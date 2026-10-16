import { describe, expect, it } from 'vitest'
import { salaryPeriods } from './salaryTree'
import type { LoanTransaction, Transaction } from '../types'

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
    expect(first.byCategory).toEqual([
      { categoryId: 'food', amount: 200, count: 1 },
      { categoryId: 'bills', amount: 100.5, count: 1 },
    ])
    // التحويل من حساب الراتب خلال الفترة: ما يدخل المصاريف وينقص من الباقي.
    expect(first.transfers.map((t) => t.id)).toEqual([move.id])
    expect(first.transferred).toBe(700)
    expect(first.byDestination).toEqual([{ accountId: 'b', amount: 700, count: 1 }])
    expect(first.left).toBe(1999.5)
    expect(last.to).toBeNull()
    expect(last.expenses.map((e) => e.id)).toEqual([e3.id])
  })

  it('تحويلات من حسابات ثانية أو لنفس الحساب ما تدخل', () => {
    const s = salary(1000, '2026-02-01')
    const fromOther = tx({ type: 'transfer', amount: 50, date: '2026-02-02', accountId: 'cash', transferToAccountId: 'sav' })
    const toSalaryAcc = tx({ type: 'transfer', amount: 80, date: '2026-02-03', accountId: 'cash', transferToAccountId: 'a' })
    const [p] = salaryPeriods([toSalaryAcc, fromOther, s], 'src-salary')
    expect(p.transfers).toEqual([])
    expect(p.left).toBe(1000)
  })

  it('السلف خلال الفترة: المعطاة تنقص من الباقي، والمستلمة للعرض فقط', () => {
    const s = salary(3000, '2026-08-01')
    const next = salary(3000, '2026-09-01')
    const l = (id: string, direction: LoanTransaction['direction'], amount: number, date: string, personId: string): LoanTransaction => ({ id, direction, amount, date, personId, accountId: 'a' })
    const loans = [l('l1', 'given', 500, '2026-08-03', 'ahmad'), l('l2', 'given', 100, '2026-08-10', 'ahmad'), l('l3', 'received', 1000, '2026-08-05', 'khalid'), l('l4', 'given', 50, '2026-09-02', 'ahmad')]
    const [, aug] = salaryPeriods([next, s], 'src-salary', loans)
    expect(aug.loans.map((x) => x.id)).toEqual(['l1', 'l3', 'l2'])
    expect(aug.lent).toBe(600)
    expect(aug.borrowed).toBe(1000)
    expect(aug.byPerson).toEqual([
      { personId: 'khalid', direction: 'received', amount: 1000, count: 1 },
      { personId: 'ahmad', direction: 'given', amount: 600, count: 2 },
    ])
    expect(aug.left).toBe(2400)
  })

  it('الشراء من الادخار: يبقى على فئته، لكنه من رصيد سابق فما ينقص من الراتب', () => {
    const s = salary(3000, '2026-10-01')
    const food = tx({ type: 'expense', amount: 1000, date: '2026-10-03', categoryId: 'food' })
    const phone = tx({ type: 'expense', amount: 2000, date: '2026-10-08', accountId: 'sav', categoryId: 'tech' })
    const [p] = salaryPeriods([phone, food, s], 'src-salary')
    expect(p.spent).toBe(3000)
    expect(p.fromPrevious).toBe(2000)
    expect(p.previousSources).toEqual([{ accountId: 'sav', amount: 2000, viaTransfer: 0 }])
    expect(p.expensePrevious.get(phone.id)?.amount).toBe(2000)
    expect(p.byCategory.map((c) => c.categoryId)).toEqual(['tech', 'food'])
    expect(p.left).toBe(2000)
  })

  it('المصاريف الأكبر من الراتب: الزائد من رصيد الحساب السابق، فما يطلع عجز', () => {
    const s = salary(1000, '2026-01-01')
    const e = tx({ type: 'expense', amount: 1200, date: '2026-01-05' })
    const [p] = salaryPeriods([e, s], 'src-salary')
    expect(p.fromPrevious).toBe(200)
    expect(p.previousSources).toEqual([{ accountId: 'a', amount: 200, viaTransfer: 0 }])
    expect(p.left).toBe(0)
    expect(p.byCategory).toEqual([{ categoryId: '', amount: 1200, count: 1 }])
  })

  it('بدون رواتب: قائمة فاضية', () => {
    expect(salaryPeriods([tx({ type: 'expense', amount: 5, date: '2026-01-01' })], 'src-salary')).toEqual([])
  })
})
