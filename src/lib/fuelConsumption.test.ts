import { describe, expect, it } from 'vitest'
import { computeFuelSegments, computeFuelStats, computeVehicleCostStats } from './fuelConsumption'
import type { FuelLog, OilChangeLog } from '../types'

function log(id: string, odometerKm: number, liters: number, isFullTank: boolean): FuelLog {
  return { id, date: '2026-01-01', odometerKm, liters, isFullTank }
}

function oilLog(id: string, odometerKm: number, cost?: number): OilChangeLog {
  return { id, date: '2026-01-01', odometerKm, cost }
}

describe('computeFuelSegments', () => {
  it('produces no segments with fewer than two full-tank fills', () => {
    expect(computeFuelSegments([log('a', 100000, 40, true)])).toEqual([])
    expect(computeFuelSegments([log('a', 100000, 40, false), log('b', 100300, 20, false)])).toEqual([])
  })

  it('computes a segment between two consecutive full-tank fills', () => {
    const segments = computeFuelSegments([log('a', 100000, 40, true), log('b', 100500, 40, true)])
    expect(segments).toHaveLength(1)
    expect(segments[0]).toMatchObject({ fromLogId: 'a', toLogId: 'b', drivenKm: 500, litersUsed: 40, kmPerLiter: 12.5 })
  })

  it('includes partial fills between two full fills as part of the same segment', () => {
    // ممتلئ عند 100000، تعبئة جزئية 20 لتر عند 100300، ممتلئ عند 100500 بـ25 لتر
    // -> الاستهلاك الفعلي بين التعبئتين الكاملتين = 20 + 25 = 45 لتر
    const segments = computeFuelSegments([
      log('full1', 100000, 40, true),
      log('partial', 100300, 20, false),
      log('full2', 100500, 25, true),
    ])
    expect(segments).toHaveLength(1)
    expect(segments[0]).toMatchObject({ fromLogId: 'full1', toLogId: 'full2', drivenKm: 500, litersUsed: 45 })
    expect(segments[0].kmPerLiter).toBeCloseTo(500 / 45, 5)
  })

  it('sorts logs by odometer before pairing, regardless of input order', () => {
    const segments = computeFuelSegments([log('b', 100500, 40, true), log('a', 100000, 40, true)])
    expect(segments).toHaveLength(1)
    expect(segments[0]).toMatchObject({ fromLogId: 'a', toLogId: 'b', drivenKm: 500 })
  })

  it('skips a pair with non-positive driven distance (bad data)', () => {
    const segments = computeFuelSegments([log('a', 100000, 40, true), log('b', 100000, 40, true)])
    expect(segments).toEqual([])
  })
})

describe('computeFuelStats', () => {
  it('returns nulls when there is not enough data yet', () => {
    const stats = computeFuelStats([log('a', 100000, 40, true)], 50)
    expect(stats.avgKmPerLiter).toBeNull()
    expect(stats.avgLitersPer100Km).toBeNull()
    expect(stats.estimatedRangeKm).toBeNull()
  })

  it('computes averages and estimated range from a single segment', () => {
    const stats = computeFuelStats([log('a', 100000, 40, true), log('b', 100500, 40, true)], 50)
    expect(stats.avgKmPerLiter).toBeCloseTo(12.5, 5)
    expect(stats.avgLitersPer100Km).toBeCloseTo(8, 5)
    expect(stats.estimatedRangeKm).toBeCloseTo(625, 5)
  })

  it('returns a null estimated range when tank capacity is not set', () => {
    const stats = computeFuelStats([log('a', 100000, 40, true), log('b', 100500, 40, true)], null)
    expect(stats.avgKmPerLiter).toBeCloseTo(12.5, 5)
    expect(stats.estimatedRangeKm).toBeNull()
  })

  it('weights the moving average by km/liters across multiple segments (not a plain average of ratios)', () => {
    // فترة أولى: 500 كم / 40 لتر = 12.5 كم/لتر. فترة ثانية: 300 كم / 30 لتر = 10 كم/لتر.
    // المتوسط الموزون الصحيح = (500+300)/(40+30) = 800/70، وليس (12.5+10)/2 = 11.25
    const stats = computeFuelStats(
      [log('a', 100000, 40, true), log('b', 100500, 40, true), log('c', 100800, 30, true)],
      null,
    )
    expect(stats.avgKmPerLiter).toBeCloseTo(800 / 70, 5)
  })

  it('only uses the last 5 segments (moving window), dropping older ones', () => {
    // 7 تعبئات كاملة عند 100000..102500 بفواصل 500كم/40لتر (5 فترات)، ثم
    // تعبئة أخيرة عند 103100 (فترة سادسة: 600كم/40لتر) — نتأكد إن أول فترة
    // (f0->f1) تُستبعد من النافذة ولا تؤثر على المتوسط.
    const logs: FuelLog[] = [
      log('f0', 100000, 40, true),
      log('f1', 100500, 40, true),
      log('f2', 101000, 40, true),
      log('f3', 101500, 40, true),
      log('f4', 102000, 40, true),
      log('f5', 102500, 40, true),
      log('f6', 103100, 40, true),
    ]

    const stats = computeFuelStats(logs, null)
    // 6 فترات إجمالًا (f0->f1 ... f5->f6)، النافذة تاخذ آخر 5 بس (f1->f2 ... f5->f6)
    expect(stats.segments).toHaveLength(5)
    const totalKm = 500 * 4 + 600
    const totalLiters = 40 * 5
    expect(stats.avgKmPerLiter).toBeCloseTo(totalKm / totalLiters, 5)
  })
})

describe('computeVehicleCostStats', () => {
  it('returns a null cost-per-km with no logs', () => {
    const stats = computeVehicleCostStats([], [])
    expect(stats).toMatchObject({ fuelCostTotal: 0, oilCostTotal: 0, totalCost: 0, drivenKm: 0, costPerKm: null })
  })

  it('sums fuel and oil costs, and divides by distance across both logs combined', () => {
    const fuelLogs = [log('f1', 100000, 40, true), log('f2', 100500, 40, true)]
    fuelLogs[0].cost = 100
    fuelLogs[1].cost = 120
    const oilChanges = [oilLog('o1', 100800, 150)]
    const stats = computeVehicleCostStats(fuelLogs, oilChanges)
    // المسافة = أعلى قراءة (100800) - أقل قراءة (100000) = 800
    expect(stats.fuelCostTotal).toBe(220)
    expect(stats.oilCostTotal).toBe(150)
    expect(stats.totalCost).toBe(370)
    expect(stats.drivenKm).toBe(800)
    expect(stats.costPerKm).toBeCloseTo(370 / 800, 5)
  })

  it('ignores entries with no recorded cost when summing, but still counts their odometer reading for distance', () => {
    const fuelLogs = [log('f1', 100000, 40, true), log('f2', 100500, 40, true)]
    // لا تكلفة مسجَّلة لأي منهما
    const stats = computeVehicleCostStats(fuelLogs, [])
    expect(stats.totalCost).toBe(0)
    expect(stats.drivenKm).toBe(500)
    expect(stats.costPerKm).toBeNull()
  })
})
