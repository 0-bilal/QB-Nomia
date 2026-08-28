import { describe, expect, it } from 'vitest'
import {
  computeZakatStatus,
  getGoldPricePerGram,
  getGoldPriceUpdatedAt,
  HAWL_DAYS,
  NISAB_GOLD_GRAMS,
  setGoldPricePerGram,
  ZAKAT_RATE,
} from './zakat'

describe('getGoldPricePerGram / setGoldPricePerGram', () => {
  it('returns null when nothing is stored', () => {
    expect(getGoldPricePerGram()).toBeNull()
  })

  it('round-trips a stored price and records the update timestamp', () => {
    expect(getGoldPriceUpdatedAt()).toBeNull()
    setGoldPricePerGram(320)
    expect(getGoldPricePerGram()).toBe(320)
    expect(getGoldPriceUpdatedAt()).not.toBeNull()
  })

  it('rejects a corrupted or non-positive stored value', () => {
    localStorage.setItem('qbnomia.zakat.goldPricePerGram', 'not-a-number')
    expect(getGoldPricePerGram()).toBeNull()
    localStorage.setItem('qbnomia.zakat.goldPricePerGram', '-5')
    expect(getGoldPricePerGram()).toBeNull()
  })
})

describe('computeZakatStatus', () => {
  const today = new Date('2026-08-28T00:00:00Z')
  const goldPrice = 300 // نصاب = 85 * 300 = 25,500

  it('does not meet nisab when the balance is below it', () => {
    const status = computeZakatStatus(20000, goldPrice, '2025-01-01', today)
    expect(status.nisab).toBe(NISAB_GOLD_GRAMS * goldPrice)
    expect(status.meetsNisab).toBe(false)
    expect(status.due).toBe(0)
  })

  it('meets nisab but the hawl has not completed yet', () => {
    const recentStart = '2026-08-01' // 27 يوم فقط قبل "اليوم"
    const status = computeZakatStatus(30000, goldPrice, recentStart, today)
    expect(status.meetsNisab).toBe(true)
    expect(status.hawlComplete).toBe(false)
    expect(status.daysElapsed).toBe(27)
    expect(status.daysRemaining).toBe(HAWL_DAYS - 27)
    expect(status.due).toBe(0)
  })

  it('is exactly on the hawl-complete boundary at HAWL_DAYS elapsed', () => {
    const boundaryStart = new Date(today.getTime() - HAWL_DAYS * 86400000).toISOString().slice(0, 10)
    const status = computeZakatStatus(30000, goldPrice, boundaryStart, today)
    expect(status.daysElapsed).toBe(HAWL_DAYS)
    expect(status.hawlComplete).toBe(true)
    expect(status.daysRemaining).toBe(0)
  })

  it('is not yet complete one day before the boundary', () => {
    const almostStart = new Date(today.getTime() - (HAWL_DAYS - 1) * 86400000).toISOString().slice(0, 10)
    const status = computeZakatStatus(30000, goldPrice, almostStart, today)
    expect(status.hawlComplete).toBe(false)
    expect(status.daysRemaining).toBe(1)
  })

  it('owes 2.5% of the balance once nisab is met and the hawl is complete', () => {
    const oldStart = '2024-01-01'
    const status = computeZakatStatus(40000, goldPrice, oldStart, today)
    expect(status.meetsNisab).toBe(true)
    expect(status.hawlComplete).toBe(true)
    expect(status.due).toBe(40000 * ZAKAT_RATE)
  })

  it('never owes zakat if nisab is unmet even after the hawl period', () => {
    const oldStart = '2024-01-01'
    const status = computeZakatStatus(10000, goldPrice, oldStart, today)
    expect(status.hawlComplete).toBe(true)
    expect(status.meetsNisab).toBe(false)
    expect(status.due).toBe(0)
  })

  it('clamps daysElapsed at 0 for a hawl start date in the future', () => {
    const status = computeZakatStatus(30000, goldPrice, '2027-01-01', today)
    expect(status.daysElapsed).toBe(0)
    expect(status.daysRemaining).toBe(HAWL_DAYS)
  })
})
