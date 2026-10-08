import { describe, expect, it } from 'vitest'
import { greetingSubline } from './greeting'
import { DEFAULT_PREFS, type UserProfile } from './profile'

const F: UserProfile = { name: 'سارة', gender: 'f', color: 0, prefs: DEFAULT_PREFS }
const id = (v: string) => v

describe('greetingSubline', () => {
  it('uses the daily budget in the morning', () => {
    expect(greetingSubline(9, null, { todaySpent: 0, dailyBudget: 86, monthBudgetLeft: 1000 }, id)).toBe('يومك جديد — ميزانيتك اليوم 86 ر.س')
    expect(greetingSubline(9, null, { todaySpent: 0, dailyBudget: null, monthBudgetLeft: null }, id)).toBe('يومك جديد — بداية موفّقة')
  })

  it('addresses by gender and masks amounts', () => {
    expect(greetingSubline(14, F, { todaySpent: 64, dailyBudget: null, monthBudgetLeft: null }, id)).toBe('صرفتِ 64 ر.س اليوم حتى الآن')
    expect(greetingSubline(20, null, { todaySpent: 106, dailyBudget: null, monthBudgetLeft: null }, () => '•••')).toBe('ختام يومك: صرفت •••')
    expect(greetingSubline(2, F, { todaySpent: 0, dailyBudget: null, monthBudgetLeft: null }, id)).toContain('سهرانة')
  })
})
