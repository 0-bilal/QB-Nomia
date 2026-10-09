import { describe, expect, it } from 'vitest'
import type { Transaction } from '../types'
import { categoryShares, monthFlowSeries } from './monthFlow'

const tx = (type: Transaction['type'], amount: number, date: string): Transaction => ({ id: `${type}-${date}-${amount}`, type, amount, date, accountId: 'a' })

describe('monthFlowSeries', () => {
  const now = new Date(2026, 9, 5)

  it('يجمع الدخل والمصروف تراكميًا يومًا بيوم حتى اليوم', () => {
    const r = monthFlowSeries([tx('income', 1000, '2026-10-01'), tx('expense', 200, '2026-10-02'), tx('expense', 50, '2026-10-02'), tx('expense', 100, '2026-10-05')], now)
    expect(r.income).toEqual([1000, 1000, 1000, 1000, 1000])
    expect(r.expense).toEqual([0, 250, 250, 250, 350])
  })

  it('يتجاهل التحويلات وحركات الأشهر الأخرى', () => {
    const r = monthFlowSeries([tx('transfer', 500, '2026-10-01'), tx('expense', 80, '2026-09-30'), tx('income', 90, '2025-10-01')], now)
    expect(r.income.at(-1)).toBe(0)
    expect(r.expense.at(-1)).toBe(0)
  })

  it('الحركة بتاريخ لاحق داخل الشهر تُحسب في اليوم الحالي', () => {
    const r = monthFlowSeries([tx('expense', 40, '2026-10-20')], now)
    expect(r.expense).toEqual([0, 0, 0, 0, 40])
  })

  it('أول يوم بالشهر = نقطة واحدة', () => {
    expect(monthFlowSeries([], new Date(2026, 9, 1)).income).toEqual([0])
  })
})

describe('categoryShares', () => {
  const cats = [
    { id: 'a', spent: 50 },
    { id: 'b', spent: 300 },
    { id: 'c', spent: 0 },
    { id: 'd', spent: 100 },
  ]

  it('يرتّب بالأعلى ويضيف «أخرى» للفرق عن مجموع المصروف', () => {
    const r = categoryShares(cats, 500, 2)
    expect(r.map((x) => x.item?.id ?? null)).toEqual(['b', 'd', null])
    expect(r[2].spent).toBe(100)
    expect(r[0].share).toBeCloseTo(0.6)
  })

  it('بدون «أخرى» لو الفئات تغطي كل المصروف', () => {
    expect(categoryShares(cats, 450).some((x) => x.item === null)).toBe(false)
  })

  it('فارغ لو ما فيه صرف', () => {
    expect(categoryShares([], 0)).toEqual([])
  })
})
