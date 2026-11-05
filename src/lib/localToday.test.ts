import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { upcomingObligations } from './reportData'
import type { Subscription } from '../types'

/**
 * «اليوم» لازم يكون بتوقيت الجهاز، مو UTC. بالسعودية (UTC+3) الساعة 1:30 الفجر يوم 5 نوفمبر
 * = 22:30 UTC يوم 4 نوفمبر — الحساب بـ toISOString كان يرجّع تاريخ أمس.
 */
describe('today is the local date, not the UTC date', () => {
  beforeEach(() => {
    vi.stubEnv('TZ', 'Asia/Riyadh')
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-04T22:30:00Z')) // 01:30 فجر 5 نوفمبر بتوقيت الرياض
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })

  const sub = (id: string, nextRenewalDate: string) =>
    ({ id, name: id, cost: 10, billingCycle: 'monthly', nextRenewalDate, status: 'active' }) as unknown as Subscription

  it('counts a renewal due today (local) and not one from yesterday', () => {
    const { items } = upcomingObligations([sub('today', '2026-11-05'), sub('yesterday', '2026-11-04')], [], [], 0)
    expect(items.map((i) => i.name)).toEqual(['today'])
  })
})
