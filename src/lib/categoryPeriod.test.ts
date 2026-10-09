import { describe, expect, it } from 'vitest'
import type { Transaction } from '../types'
import { allTimeStats, changePct, inComparison, inPeriod, periodMonthNumber, spentByCategory } from './categoryPeriod'

const now = new Date(2026, 9, 9) // 9 أكتوبر 2026
const tx = (type: Transaction['type'], amount: number, date: string, categoryId?: string): Transaction => ({ id: `${date}${amount}`, type, amount, date, accountId: 'a', categoryId })

describe('periodMonthNumber', () => {
  it('رقم الشهر/السنة، والشهر الماضي يعبر السنة', () => {
    expect(periodMonthNumber('cur', now)).toBe('10/2026')
    expect(periodMonthNumber('last', now)).toBe('9/2026')
    expect(periodMonthNumber('last', new Date(2026, 0, 5))).toBe('12/2025')
    expect(periodMonthNumber('all', now)).toBe('')
  })
})

describe('inPeriod / inComparison', () => {
  it('الشهر الحالي والماضي والكل', () => {
    expect(inPeriod('2026-10-01', 'cur', now)).toBe(true)
    expect(inPeriod('2026-09-30', 'cur', now)).toBe(false)
    expect(inPeriod('2026-09-30', 'last', now)).toBe(true)
    expect(inPeriod('2020-01-01', 'all', now)).toBe(true)
  })
  it('مقارنة الشهر الحالي بنفس الأيام من الشهر الماضي', () => {
    expect(inComparison('2026-09-09', 'cur', now)).toBe(true)
    expect(inComparison('2026-09-10', 'cur', now)).toBe(false)
    expect(inComparison('2026-08-31', 'last', now)).toBe(true)
    expect(inComparison('2026-09-01', 'last', now)).toBe(false)
    expect(inComparison('2026-09-01', 'all', now)).toBe(false)
  })
})

describe('spentByCategory', () => {
  it('يجمع المصروف فقط لكل فئة ضمن الشرط', () => {
    const m = spentByCategory([tx('expense', 50, '2026-10-02', 'c1'), tx('expense', 25, '2026-10-03', 'c1'), tx('income', 900, '2026-10-02'), tx('expense', 10, '2026-10-04'), tx('expense', 70, '2026-09-04', 'c1')], (d) => inPeriod(d, 'cur', now))
    expect(m.get('c1')).toBe(75)
    expect(m.get('')).toBe(10)
  })
})

describe('changePct', () => {
  it('null بدون أساس', () => {
    expect(changePct(100, 0)).toBeNull()
    expect(changePct(150, 100)).toBe(50)
    expect(changePct(80, 100)).toBe(-20)
  })
})

describe('allTimeStats', () => {
  it('المتوسط على كل الأشهر من أول مصروف (حتى الفارغة) وأعلى شهر', () => {
    const s = allTimeStats([tx('expense', 300, '2026-08-10'), tx('expense', 600, '2026-10-01'), tx('income', 5000, '2026-09-01')], now)
    expect(s.months).toBe(3)
    expect(s.monthlyAverage).toBe(300)
    expect(s.topMonth).toEqual({ key: '2026-10', total: 600 })
    expect(s.since).toBe('2026-08-10')
  })
  it('بدون مصاريف', () => {
    expect(allTimeStats([], now).months).toBe(0)
  })
})
