import { describe, expect, it } from 'vitest'
import { dayLabel, daysBetween, daysLeftLabel, groupByDay, upcomingItems } from './homeFeed'
import type { Commitment, RecurringTransaction, Subscription } from '../types'

describe('daysBetween', () => {
  it('counts whole days across month ends', () => {
    expect(daysBetween('2026-10-30', '2026-11-02')).toBe(3)
    expect(daysBetween('2026-10-08', '2026-10-01')).toBe(-7)
  })
})

describe('upcomingItems', () => {
  const sub = (id: string, date: string, status: Subscription['status'] = 'active'): Subscription => ({ id, name: id, cost: 45, billingCycle: 'monthly', nextRenewalDate: date, accountId: 'a', status })
  const com = (id: string, date: string): Commitment => ({ id, name: id, intervalUnit: 'year', intervalCount: 1, nextDueDate: date, status: 'active' })
  const rec = (id: string, date: string, type: RecurringTransaction['type']): RecurringTransaction => ({ id, name: id, type, amount: 9500, accountId: 'a', intervalUnit: 'month', intervalCount: 1, nextDueDate: date, status: 'active' })

  it('keeps active items due within the window (overdue included), soonest first', () => {
    const res = upcomingItems(
      [sub('far', '2026-11-30'), sub('soon', '2026-10-10'), sub('paused', '2026-10-09', 'paused' as Subscription['status'])],
      [com('late', '2026-10-05')],
      [rec('salary', '2026-10-20', 'income'), rec('move', '2026-10-09', 'transfer')],
      '2026-10-08',
    )
    expect(res.map((r) => r.name)).toEqual(['late', 'soon', 'salary'])
    expect(res[0].daysLeft).toBe(-3)
    expect(res[1].amount).toBe(-45)
    expect(res[2].amount).toBe(9500)
    expect(res[0].amount).toBeUndefined()
  })
})

describe('labels and grouping', () => {
  it('labels days', () => {
    expect(daysLeftLabel(0)).toBe('اليوم')
    expect(daysLeftLabel(1)).toBe('غدًا')
    expect(daysLeftLabel(6)).toBe('بعد 6 أيام')
    expect(daysLeftLabel(-3)).toBe('متأخر 3 أيام')
    expect(daysLeftLabel(12)).toBe('بعد 12 يوم')
    expect(daysLeftLabel(-14)).toBe('متأخر 14 يوم')
    expect(dayLabel('2026-10-08', '2026-10-08')).toBe('اليوم')
    expect(dayLabel('2026-10-07', '2026-10-08')).toBe('أمس')
    expect(dayLabel('2026-10-01', '2026-10-08')).toBe('')
  })
  it('groups consecutive same-day items', () => {
    const g = groupByDay([{ date: 'b' }, { date: 'b' }, { date: 'a' }])
    expect(g.map((x) => [x.date, x.items.length])).toEqual([['b', 2], ['a', 1]])
  })
})
