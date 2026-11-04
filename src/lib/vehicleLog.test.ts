import { describe, expect, it } from 'vitest'
import type { FuelLog, OilChangeLog, Transaction } from '../types'
import {
  DEFAULT_LOG_FILTER,
  advancedKeys,
  averageKmPerLiter,
  buildVehicleEntries,
  filterToQuick,
  filterVehicleEntries,
  findLogTransaction,
  groupVehicleByMonth,
  quickToFilter,
  type FuelEntry,
  type OilEntry,
} from './vehicleLog'

const fuel = (id: string, date: string, odometerKm: number, liters: number, cost: number, isFullTank = true, over: Partial<FuelLog> = {}): FuelLog => ({ id, date, odometerKm, liters, cost, isFullTank, accountId: 'a1', ...over })

const LOGS: FuelLog[] = [
  fuel('f1', '2026-10-02', 137676, 21, 46, false, { accountId: undefined, paidByPersonId: 'p1' }),
  fuel('f2', '2026-10-04', 138013, 30.6, 67),
  fuel('f3', '2026-10-13', 138764, 11.42, 25, false),
  fuel('f4', '2026-10-14', 138848, 30.6, 67),
  fuel('f5', '2026-11-01', 140200, 28.53, 63, true, { accountId: 'a2' }),
  fuel('f6', '2026-11-04', 140530, 34.05, 68),
]
const OIL: OilChangeLog[] = [
  { id: 'o1', date: '2026-07-05', odometerKm: 133700, cost: 95, accountId: 'a1' },
  { id: 'o2', date: '2026-10-10', odometerKm: 138700, cost: 100, accountId: 'a1' },
]
const entries = buildVehicleEntries(LOGS, OIL, 5000, 140530)
const get = (id: string) => entries.find((e) => e.id === id)!

describe('buildVehicleEntries', () => {
  it('تفاصيل التعبئة: المسافة والأيام والسعر', () => {
    const f6 = get('f6') as FuelEntry
    expect(f6.drivenKm).toBe(330)
    expect(f6.prevOdometerKm).toBe(140200)
    expect(f6.days).toBe(3)
    expect(f6.kmPerLiter).toBeCloseTo(330 / 34.05)
    expect(f6.pricePerLiter).toBeCloseTo(68 / 34.05)
    expect(f6.costPerKm).toBeCloseTo(68 / 330)
  })

  it('الاستهلاك فقط بين تعبئتين كاملتين', () => {
    expect((get('f3') as FuelEntry).kmPerLiter).toBeNull()
    expect((get('f4') as FuelEntry).kmPerLiter).toBeNull()
    expect((get('f4') as FuelEntry).prevFull).toBe(false)
    expect((get('f1') as FuelEntry).drivenKm).toBeNull()
  })

  it('تغيير الزيت: المقطوع والباقي للتغيير الجاي', () => {
    const o2 = get('o2') as OilEntry
    expect(o2.sinceKm).toBe(5000)
    expect(o2.latest).toBe(true)
    expect(o2.leftKm).toBe(143700 - 140530)
    expect((get('o1') as OilEntry).leftKm).toBeNull()
  })

  it('المتوسط', () => {
    expect(averageKmPerLiter(entries)).not.toBeNull()
  })
})

describe('الفلترة والترتيب', () => {
  const today = '2026-11-04'
  it('الافتراضي: الكل بالأحدث', () => {
    expect(filterVehicleEntries(entries, DEFAULT_LOG_FILTER, today).map((e) => e.id)).toEqual(['f6', 'f5', 'f4', 'f3', 'o2', 'f2', 'f1', 'o1'])
  })

  it('النوع والتعبئة ومن دفع', () => {
    expect(filterVehicleEntries(entries, quickToFilter('oil', 'new'), today).map((e) => e.id)).toEqual(['o2', 'o1'])
    expect(filterVehicleEntries(entries, quickToFilter('partial', 'new'), today).map((e) => e.id)).toEqual(['f3', 'f1'])
    expect(filterVehicleEntries(entries, quickToFilter('others', 'new'), today).map((e) => e.id)).toEqual(['f1'])
    expect(filterVehicleEntries(entries, { ...DEFAULT_LOG_FILTER, payer: 'me', type: 'fuel' }, today)).toHaveLength(5)
  })

  it('الفترة والحساب', () => {
    expect(filterVehicleEntries(entries, { ...DEFAULT_LOG_FILTER, period: 'month' }, today).map((e) => e.id)).toEqual(['f6', 'f5'])
    expect(filterVehicleEntries(entries, { ...DEFAULT_LOG_FILTER, period: '3m' }, today)).toHaveLength(7)
    expect(filterVehicleEntries(entries, { ...DEFAULT_LOG_FILTER, accountId: 'a2' }, today).map((e) => e.id)).toEqual(['f5'])
  })

  it('الترتيب بالتكلفة والاستهلاك والأقدم', () => {
    expect(filterVehicleEntries(entries, { ...DEFAULT_LOG_FILTER, sort: 'cost' }, today)[0].id).toBe('o2')
    expect(filterVehicleEntries(entries, { ...DEFAULT_LOG_FILTER, sort: 'old' }, today)[0].id).toBe('o1')
    const kpl = filterVehicleEntries(entries, { ...DEFAULT_LOG_FILTER, type: 'fuel', sort: 'kpl' }, today)
    expect((kpl[0] as FuelEntry).kmPerLiter).toBeGreaterThan(0)
  })

  it('الفلتر السريع يتعرّف عليه، والمتقدم يطلع كبسولات', () => {
    expect(filterToQuick(quickToFilter('full', 'cost'))).toBe('full')
    expect(filterToQuick({ ...DEFAULT_LOG_FILTER, accountId: 'a1' })).toBeNull()
    expect(advancedKeys(quickToFilter('others', 'new'))).toEqual([])
    expect(advancedKeys({ ...DEFAULT_LOG_FILTER, period: 'month', payer: 'me', sort: 'cost' })).toEqual(['period', 'payer', 'sort'])
  })
})

describe('groupVehicleByMonth', () => {
  it('شهر بالرقم ومجاميعه', () => {
    const months = groupVehicleByMonth(filterVehicleEntries(entries, DEFAULT_LOG_FILTER, '2026-11-04'))
    expect(months.map((m) => m.label)).toEqual(['11/2026', '10/2026', '7/2026'])
    const nov = months[0]
    expect(nov.cost).toBe(131)
    expect(nov.liters).toBeCloseTo(62.58)
    expect(nov.drivenKm).toBe(1352 + 330)
    expect(months[2].liters).toBe(0)
    expect(months[2].avgKmPerLiter).toBeNull()
  })
})

describe('findLogTransaction', () => {
  const txns: Transaction[] = [
    { id: 't1', type: 'expense', amount: 68, date: '2026-11-04', accountId: 'a1', categoryId: 'cat-fuel' },
    { id: 't2', type: 'expense', amount: 100, date: '2026-10-10', accountId: 'a1', categoryId: 'cat-vehicle' },
  ]
  it('بالمعرّف أولًا، وإلا بالمطابقة', () => {
    expect(findLogTransaction({ ...LOGS[5], transactionId: 't2' }, 'cat-fuel', txns)?.id).toBe('t2')
    expect(findLogTransaction(LOGS[5], 'cat-fuel', txns)?.id).toBe('t1')
    expect(findLogTransaction(OIL[1], 'cat-vehicle', txns)?.id).toBe('t2')
    expect(findLogTransaction(LOGS[4], 'cat-fuel', txns)).toBeUndefined()
    expect(findLogTransaction(LOGS[0], 'cat-fuel', txns)).toBeUndefined()
  })
})
