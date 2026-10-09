import { describe, expect, it } from 'vitest'
import type { LoanTransaction, SalaryAdvance, SalaryViolationDeduction, StoreDebt, StoreDebtPayment } from '../types'
import { advanceHistory, hasHistory, peopleHistory, storeHistory, violationsHistory, weeklyDates } from './debtHistory'

const dates = ['2026-09-18', '2026-09-25', '2026-10-02', '2026-10-09']

describe('weeklyDates', () => {
  it('ينتهي باليوم وبفارق أسبوع', () => {
    expect(weeklyDates(new Date(2026, 9, 9), 3)).toEqual(['2026-09-25', '2026-10-02', '2026-10-09'])
  })
})

describe('peopleHistory', () => {
  const loan = (personId: string, direction: LoanTransaction['direction'], amount: number, date: string): LoanTransaction => ({ id: `${personId}${date}${amount}`, personId, direction, amount, date, accountId: 'a' })
  it('يجمع الأرصدة الموجبة والسالبة لكل أسبوع ويتجاهل الأشخاص المحذوفين', () => {
    const r = peopleHistory(
      [loan('p1', 'given', 500, '2026-09-20'), loan('p1', 'received', 200, '2026-10-01'), loan('p2', 'received', 300, '2026-09-26'), loan('gone', 'given', 900, '2026-09-01')],
      ['p1', 'p2'],
      dates,
    )
    expect(r.owedToMe).toEqual([0, 500, 300, 300])
    expect(r.iOwe).toEqual([0, 0, 300, 300])
  })
})

describe('advanceHistory', () => {
  it('تظهر السلفة من تاريخها حتى خصمها', () => {
    const a: SalaryAdvance[] = [{ id: '1', date: '2026-09-20', amount: 1000, accountId: 'a', settled: true, settledDate: '2026-10-01' }]
    expect(advanceHistory(a, dates)).toEqual([0, 1000, 0, 0])
  })
  it('القائمة تبقى حتى اليوم', () => {
    const a: SalaryAdvance[] = [{ id: '1', date: '2026-10-01', amount: 700, accountId: 'a', settled: false }]
    expect(advanceHistory(a, dates)).toEqual([0, 0, 700, 700])
  })
})

describe('storeHistory', () => {
  it('الدَين ناقص ما سُدّد منه حتى ذلك اليوم', () => {
    const d: StoreDebt[] = [{ id: 'd', storeName: 'x', amount: 600, date: '2026-09-18' }]
    const p: StoreDebtPayment[] = [
      { id: '1', debtId: 'd', amount: 200, date: '2026-09-24', accountId: 'a', transactionId: 't' },
      { id: '2', debtId: 'd', amount: 400, date: '2026-10-05', accountId: 'a', transactionId: 't' },
    ]
    expect(storeHistory(d, p, dates)).toEqual([600, 400, 400, 0])
  })
})

describe('violationsHistory', () => {
  it('تراكمي داخل السنة ويبدأ من الصفر بسنة جديدة', () => {
    const v = (amount: number, date: string): SalaryViolationDeduction => ({ id: date, date, amount, accountId: 'a', transactionId: 't' })
    expect(violationsHistory([v(100, '2025-12-30'), v(50, '2026-01-02')], ['2025-12-31', '2026-01-01', '2026-01-03'])).toEqual([100, 0, 50])
  })
})

describe('hasHistory', () => {
  it('false لو كل القيم صفر', () => {
    expect(hasHistory([0, 0], [0])).toBe(false)
    expect(hasHistory([0, 2])).toBe(true)
  })
})
