import { describe, expect, it } from 'vitest'
import { daysInMonth, projectedMonthEndPct } from './budgetPace'

describe('daysInMonth', () => {
  it('returns 31 for a 31-day month (August)', () => {
    expect(daysInMonth(new Date(2026, 7, 10))).toBe(31)
  })

  it('returns 28 for February in a non-leap year', () => {
    expect(daysInMonth(new Date(2026, 1, 10))).toBe(28)
  })

  it('returns 29 for February in a leap year', () => {
    expect(daysInMonth(new Date(2028, 1, 10))).toBe(29)
  })
})

describe('projectedMonthEndPct', () => {
  it('projects month-end spend linearly from the current daily pace', () => {
    // 350 spent over 10 of 31 days, limit 1000 -> pace = 35/day * 31 days / 1000 * 100 = 108.5%
    expect(projectedMonthEndPct(350, 1000, 10, 31)).toBeCloseTo(108.5, 5)
  })

  it('matches the actual percentage on the last day of the month', () => {
    expect(projectedMonthEndPct(500, 1000, 31, 31)).toBeCloseTo(50, 5)
  })

  it('falls back to the plain actual percentage when no days have elapsed yet', () => {
    expect(projectedMonthEndPct(200, 1000, 0, 30)).toBe(20)
  })

  it('a low early-month spend does not project an overrun', () => {
    // 30 spent by day 2 of 30, limit 1000 -> pace = 15/day * 30 / 1000 * 100 = 45%
    expect(projectedMonthEndPct(30, 1000, 2, 30)).toBeCloseTo(45, 5)
  })
})
