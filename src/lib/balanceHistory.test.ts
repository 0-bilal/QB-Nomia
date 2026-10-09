import { describe, expect, it } from 'vitest'
import type { ActivityItem } from '../state/DataContext'
import { accountsBalanceValues, balanceSeries, effectOn, trendColor } from './balanceHistory'

const mk = (date: string, kind: ActivityItem['kind'], amount: number, accountIds: string[]): ActivityItem => ({ id: date + kind + amount, date, kind, amount, accountIds, title: '', subtitle: '', color: '' })
const INC = new Set(['a', 'b'])

describe('balanceHistory', () => {
  it('nets transfers between included accounts to zero', () => {
    expect(effectOn(mk('2026-10-01', 'transfer', -500, ['a', 'b']), INC)).toBe(0)
    expect(effectOn(mk('2026-10-01', 'transfer', -500, ['a', 'x']), INC)).toBe(-500)
    expect(effectOn(mk('2026-10-01', 'transfer', -500, ['x', 'a']), INC)).toBe(500)
    expect(effectOn(mk('2026-10-01', 'expense', -40, ['x']), INC)).toBe(0)
  })

  it('walks backwards from the current balance', () => {
    const items = [mk('2026-10-09', 'expense', -100, ['a']), mk('2026-10-08', 'income', 1000, ['b']), mk('2026-10-07', 'expense', -50, ['a'])]
    const s = balanceSeries(items, INC, 5000, 4, new Date(2026, 9, 9))
    expect(s).toEqual([
      { date: '2026-10-06', balance: 4150 },
      { date: '2026-10-07', balance: 4100 },
      { date: '2026-10-08', balance: 5100 },
      { date: '2026-10-09', balance: 5000 },
    ])
  })

  it('ignores future-dated items in past days', () => {
    const items = [mk('2026-10-20', 'expense', -200, ['a'])]
    const s = balanceSeries(items, INC, 800, 2, new Date(2026, 9, 9))
    expect(s.map((p) => p.balance)).toEqual([1000, 1000])
  })
})

describe('accountsBalanceValues / trendColor', () => {
  const item = (id: string, kind: ActivityItem['kind'], amount: number, date: string, accountIds: string[]): ActivityItem => ({ id, kind, amount, date, accountIds, title: '', subtitle: '', color: '' })
  const items = [item('1', 'income', 500, '2026-10-08', ['a']), item('2', 'transfer', -200, '2026-10-09', ['a', 'b'])]

  it('رصيد حساب واحد للخلف من رصيده الحالي (التحويل يؤثر على الطرفين)', () => {
    expect(accountsBalanceValues(items, ['a'], 1000, 3, new Date(2026, 9, 9))).toEqual([700, 1200, 1000])
    expect(accountsBalanceValues(items, ['b'], 300, 3, new Date(2026, 9, 9))).toEqual([100, 100, 300])
  })

  it('التحويل بين حسابين ضمن المجموعة لا يغيّر مجموعها', () => {
    expect(accountsBalanceValues(items, ['a', 'b'], 1300, 2, new Date(2026, 9, 9))).toEqual([1300, 1300])
  })

  it('لون الاتجاه', () => {
    expect(trendColor([1, 2])).toBe('var(--color-income)')
    expect(trendColor([2, 1])).toBe('var(--color-expense)')
  })
})
