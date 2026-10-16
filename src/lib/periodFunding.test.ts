import { describe, expect, it } from 'vitest'
import { fundMonth, fundPeriod, previousFundedExpenses } from './periodFunding'
import type { LoanTransaction, Transaction } from '../types'

let seq = 0
const tx = (p: Partial<Transaction> & Pick<Transaction, 'type' | 'amount' | 'date' | 'accountId'>): Transaction => ({ id: `t${++seq}`, ...p })
/** التخزين الفعلي الأحدث أولًا. */
const store = (...list: Transaction[]) => [...list].reverse()

describe('fundPeriod', () => {
  it('الشراء من الادخار: من رصيد سابق، فما يطلع عجز', () => {
    const salary = tx({ type: 'income', amount: 3000, date: '2026-10-01', accountId: 'bank' })
    const spend = tx({ type: 'expense', amount: 3000, date: '2026-10-05', accountId: 'bank' })
    const phone = tx({ type: 'expense', amount: 2000, date: '2026-10-08', accountId: 'sav' })
    const f = fundMonth(store(salary, spend, phone), [], '2026-10')
    expect(f.income).toBe(3000)
    expect(f.expense).toBe(5000)
    expect(f.fromPeriod).toBe(3000)
    expect(f.fromPrevious).toBe(2000)
    expect(f.previousSources).toEqual([{ accountId: 'sav', amount: 2000, viaTransfer: 0 }])
    expect(f.expensePrevious.get(phone.id)).toEqual({ amount: 2000, accountIds: ['sav'] })
    expect(f.expensePrevious.has(spend.id)).toBe(false)
  })

  it('سحب من الادخار للجاري ثم الصرف: الزائد عن الراتب من رصيد الادخار', () => {
    const salary = tx({ type: 'income', amount: 3000, date: '2026-10-01', accountId: 'bank' })
    const pull = tx({ type: 'transfer', amount: 2000, date: '2026-10-02', accountId: 'sav', transferToAccountId: 'bank' })
    const spend = tx({ type: 'expense', amount: 5000, date: '2026-10-05', accountId: 'bank' })
    const f = fundMonth(store(salary, pull, spend), [], '2026-10')
    expect(f.fromPeriod).toBe(3000)
    expect(f.fromPrevious).toBe(2000)
    expect(f.previousSources).toEqual([{ accountId: 'sav', amount: 2000, viaTransfer: 2000 }])
    expect(f.expensePrevious.get(spend.id)).toEqual({ amount: 2000, accountIds: ['sav'] })
  })

  it('تحويل من فلوس الفترة للادخار ثم الصرف منه: ينحسب على الفترة', () => {
    const salary = tx({ type: 'income', amount: 3000, date: '2026-10-01', accountId: 'bank' })
    const save = tx({ type: 'transfer', amount: 1000, date: '2026-10-02', accountId: 'bank', transferToAccountId: 'sav' })
    const spend = tx({ type: 'expense', amount: 1500, date: '2026-10-09', accountId: 'sav' })
    const f = fundMonth(store(salary, save, spend), [], '2026-10')
    expect(f.fromPeriod).toBe(1000)
    expect(f.fromPrevious).toBe(500)
    expect(f.previousSources).toEqual([{ accountId: 'sav', amount: 500, viaTransfer: 0 }])
  })

  it('الصرف من رصيد الشهر الماضي في نفس الحساب: من رصيد سابق', () => {
    const salary = tx({ type: 'income', amount: 1000, date: '2026-10-01', accountId: 'cash' })
    const spend = tx({ type: 'expense', amount: 1200, date: '2026-10-03', accountId: 'cash' })
    const f = fundMonth(store(salary, spend), [], '2026-10')
    expect(f.fromPeriod).toBe(1000)
    expect(f.previousSources).toEqual([{ accountId: 'cash', amount: 200, viaTransfer: 0 }])
    expect(f.fromPeriodByDate.get('2026-10-03')).toBe(1000)
  })

  it('السلفة المستلمة فلوس فترة (مو دخل)، والمعطاة تاخذ من فلوس الفترة أولًا', () => {
    const salary = tx({ type: 'income', amount: 1000, date: '2026-10-01', accountId: 'bank' })
    const spend = tx({ type: 'expense', amount: 1300, date: '2026-10-06', accountId: 'bank' })
    const loans: LoanTransaction[] = [
      { id: 'l1', direction: 'given', amount: 400, date: '2026-10-02', accountId: 'bank', personId: 'p' },
      { id: 'l2', direction: 'received', amount: 500, date: '2026-10-04', accountId: 'bank', personId: 'q' },
    ]
    const f = fundMonth(store(salary, spend), loans, '2026-10')
    expect(f.income).toBe(1000)
    // 1000 − 400 = 600 + 500 سلفة = 1100 فلوس فترة، والباقي 200 من رصيد سابق.
    expect(f.fromPeriod).toBe(1100)
    expect(f.fromPrevious).toBe(200)
  })

  it('الحركات خارج الفترة ما تدخل، والكسور بالهللة', () => {
    const before = tx({ type: 'income', amount: 9999, date: '2026-09-30', accountId: 'bank' })
    const salary = tx({ type: 'income', amount: 100.1, date: '2026-10-01', accountId: 'bank' })
    const spend = tx({ type: 'expense', amount: 100.3, date: '2026-10-02', accountId: 'bank' })
    const f = fundPeriod(store(before, salary, spend), [], '2026-10-01', '2026-10-31')
    expect(f.income).toBe(100.1)
    expect(f.fromPeriod).toBe(100.1)
    expect(f.fromPrevious).toBe(0.2)
  })
})

describe('previousFundedExpenses', () => {
  it('كل مصروف بشهره', () => {
    const sepSalary = tx({ type: 'income', amount: 500, date: '2026-09-01', accountId: 'bank' })
    const sepSpend = tx({ type: 'expense', amount: 600, date: '2026-09-10', accountId: 'bank' })
    const octSalary = tx({ type: 'income', amount: 500, date: '2026-10-01', accountId: 'bank' })
    const octSpend = tx({ type: 'expense', amount: 400, date: '2026-10-10', accountId: 'bank' })
    const map = previousFundedExpenses(store(sepSalary, sepSpend, octSalary, octSpend), [])
    expect(map.get(sepSpend.id)).toEqual({ amount: 100, accountIds: ['bank'] })
    expect(map.has(octSpend.id)).toBe(false)
  })
})
