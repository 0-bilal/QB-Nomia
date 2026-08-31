import { describe, expect, it } from 'vitest'
import { computeOilChangeStatus, OIL_CHANGE_WARNING_RATIO } from './vehicleMaintenance'

describe('computeOilChangeStatus', () => {
  it('reports low usage right after a change', () => {
    const s = computeOilChangeStatus(100200, 100000, 5000)
    expect(s.drivenSinceLastChange).toBe(200)
    expect(s.remainingKm).toBe(4800)
    expect(s.pct).toBeCloseTo(4, 5)
    expect(s.dueSoon).toBe(false)
    expect(s.overdue).toBe(false)
  })

  it('flags dueSoon once remaining km drops to the warning ratio', () => {
    // 4600/5000 driven -> 400 remaining -> exactly at the 10% warning threshold
    const atThreshold = computeOilChangeStatus(104600, 100000, 5000)
    expect(atThreshold.remainingKm).toBe(400)
    expect(atThreshold.dueSoon).toBe(true)
    expect(atThreshold.overdue).toBe(false)

    // comfortably before the threshold -> not due yet
    const beforeThreshold = computeOilChangeStatus(104000, 100000, 5000)
    expect(beforeThreshold.remainingKm).toBe(1000)
    expect(beforeThreshold.dueSoon).toBe(false)
  })

  it('flags overdue once the interval is fully driven or exceeded', () => {
    const exact = computeOilChangeStatus(105000, 100000, 5000)
    expect(exact.remainingKm).toBe(0)
    expect(exact.overdue).toBe(true)
    expect(exact.dueSoon).toBe(false)

    const past = computeOilChangeStatus(106200, 100000, 5000)
    expect(past.remainingKm).toBe(-1200)
    expect(past.pct).toBeCloseTo(124, 5)
    expect(past.overdue).toBe(true)
  })

  it('clamps driven distance at 0 if the odometer reading is somehow below the baseline', () => {
    const s = computeOilChangeStatus(99000, 100000, 5000)
    expect(s.drivenSinceLastChange).toBe(0)
    expect(s.remainingKm).toBe(5000)
    expect(s.overdue).toBe(false)
  })

  it('exposes the warning ratio used for the threshold', () => {
    expect(OIL_CHANGE_WARNING_RATIO).toBe(0.1)
  })
})
