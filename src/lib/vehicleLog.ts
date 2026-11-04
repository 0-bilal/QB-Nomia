/**
 * سجل السيارة: تفاصيل كل عملية (تعبئة أو تغيير زيت)، الفلترة والترتيب،
 * والتجميع بالشهر. الاستهلاك والمسافة من computeFuelGaps حتى ما يختلف
 * الرقم بين السجل وبطاقة المعدل.
 */
import type { FuelLog, OilChangeLog, Transaction } from '../types'
import { computeFuelGaps } from './fuelConsumption'

export interface FuelEntry {
  kind: 'fuel'
  id: string
  date: string
  odometerKm: number
  cost: number
  log: FuelLog
  /** المسافة من التعبئة السابقة (أي نوع). */
  drivenKm: number | null
  /** قراءة العداد في التعبئة السابقة. */
  prevOdometerKm: number | null
  prevFull: boolean | null
  /** أيام من التعبئة السابقة. */
  days: number | null
  kmPerLiter: number | null
  pricePerLiter: number | null
  costPerKm: number | null
}

export interface OilEntry {
  kind: 'oil'
  id: string
  date: string
  odometerKm: number
  cost: number
  log: OilChangeLog
  /** المقطوع من تغيير الزيت السابق. */
  sinceKm: number | null
  /** آخر تغيير زيت: موعد التغيير الجاي والباقي له. */
  latest: boolean
  nextAtKm: number
  leftKm: number | null
}

export type VehicleEntry = FuelEntry | OilEntry

const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 864e5)

export function buildVehicleEntries(fuelLogs: FuelLog[], oilChanges: OilChangeLog[], oilIntervalKm: number, currentOdometerKm: number | null): VehicleEntry[] {
  const gaps = computeFuelGaps(fuelLogs)
  const fuelSorted = [...fuelLogs].sort((a, b) => a.odometerKm - b.odometerKm)
  const fuel: FuelEntry[] = fuelSorted.map((log, i) => {
    const prev = i > 0 ? fuelSorted[i - 1] : null
    const gap = gaps.get(log.id)
    const drivenKm = gap?.drivenKm ?? null
    const cost = log.cost ?? 0
    return {
      kind: 'fuel',
      id: log.id,
      date: log.date,
      odometerKm: log.odometerKm,
      cost,
      log,
      drivenKm,
      prevOdometerKm: gap && prev ? prev.odometerKm : null,
      prevFull: gap && prev ? prev.isFullTank : null,
      days: prev ? daysBetween(prev.date, log.date) : null,
      kmPerLiter: gap?.kmPerLiter ?? null,
      pricePerLiter: cost > 0 && log.liters > 0 ? cost / log.liters : null,
      costPerKm: cost > 0 && drivenKm ? cost / drivenKm : null,
    }
  })

  const oilSorted = [...oilChanges].sort((a, b) => a.odometerKm - b.odometerKm)
  const lastOdo = Math.max(currentOdometerKm ?? 0, ...fuelLogs.map((f) => f.odometerKm), ...oilChanges.map((o) => o.odometerKm))
  const oil: OilEntry[] = oilSorted.map((log, i) => {
    const prev = i > 0 ? oilSorted[i - 1] : null
    const latest = i === oilSorted.length - 1
    const nextAtKm = log.odometerKm + oilIntervalKm
    return {
      kind: 'oil',
      id: log.id,
      date: log.date,
      odometerKm: log.odometerKm,
      cost: log.cost ?? 0,
      log,
      sinceKm: prev && log.odometerKm > prev.odometerKm ? log.odometerKm - prev.odometerKm : null,
      latest,
      nextAtKm,
      leftKm: latest ? nextAtKm - lastOdo : null,
    }
  })

  return [...fuel, ...oil]
}

/** متوسط الاستهلاك من كل فترات كاملة→كاملة. */
export function averageKmPerLiter(entries: VehicleEntry[]): number | null {
  const v = entries.flatMap((e) => (e.kind === 'fuel' && e.kmPerLiter ? [e.kmPerLiter] : []))
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null
}

// ---------- الفلترة ----------

export type LogType = 'all' | 'fuel' | 'oil'
export type LogFill = 'all' | 'full' | 'partial'
export type LogPeriod = 'all' | 'month' | '3m' | 'year'
export type LogPayer = 'all' | 'me' | 'others'
export type LogSort = 'new' | 'old' | 'cost' | 'kpl'

export interface VehicleLogFilter {
  type: LogType
  fill: LogFill
  period: LogPeriod
  /** 'all' أو معرّف حساب. */
  accountId: string
  payer: LogPayer
  sort: LogSort
}

export const DEFAULT_LOG_FILTER: VehicleLogFilter = { type: 'all', fill: 'all', period: 'all', accountId: 'all', payer: 'all', sort: 'new' }

export type QuickFilter = 'all' | 'fuel' | 'oil' | 'full' | 'partial' | 'others'

export function quickToFilter(q: QuickFilter, sort: LogSort): VehicleLogFilter {
  const f = { ...DEFAULT_LOG_FILTER, sort }
  if (q === 'fuel' || q === 'oil') f.type = q
  if (q === 'full' || q === 'partial') return { ...f, type: 'fuel', fill: q }
  if (q === 'others') return { ...f, type: 'fuel', payer: 'others' }
  return f
}

/** الفلتر السريع المطابق للفلتر الحالي، أو null لو الفلتر متقدم. */
export function filterToQuick(f: VehicleLogFilter): QuickFilter | null {
  const base = { ...f, sort: DEFAULT_LOG_FILTER.sort }
  for (const q of ['all', 'fuel', 'oil', 'full', 'partial', 'others'] as QuickFilter[]) {
    const g = quickToFilter(q, DEFAULT_LOG_FILTER.sort)
    if (g.type === base.type && g.fill === base.fill && g.period === base.period && g.accountId === base.accountId && g.payer === base.payer) return q
  }
  return null
}

/** الحقول المتقدمة المفعّلة (غير اللي يغطيها الفلتر السريع) — تظهر كبسولات قابلة للإزالة. */
export function advancedKeys(f: VehicleLogFilter): ('period' | 'accountId' | 'payer' | 'sort')[] {
  const quick = filterToQuick({ ...f, period: 'all', accountId: 'all' })
  const keys: ('period' | 'accountId' | 'payer' | 'sort')[] = []
  if (f.period !== 'all') keys.push('period')
  if (f.accountId !== 'all') keys.push('accountId')
  if (f.payer !== 'all' && quick !== 'others') keys.push('payer')
  if (f.sort !== 'new') keys.push('sort')
  return keys
}

export function filterVehicleEntries(entries: VehicleEntry[], f: VehicleLogFilter, today: string): VehicleEntry[] {
  const out = entries.filter((e) => {
    if (f.type !== 'all' && e.kind !== f.type) return false
    if (f.fill !== 'all' && (e.kind !== 'fuel' || (f.fill === 'full') !== e.log.isFullTank)) return false
    if (f.period === 'month' && !e.date.startsWith(today.slice(0, 7))) return false
    if (f.period === '3m' && daysBetween(e.date, today) > 92) return false
    if (f.period === 'year' && !e.date.startsWith(today.slice(0, 4))) return false
    if (f.accountId !== 'all' && e.log.accountId !== f.accountId) return false
    const byOther = e.kind === 'fuel' && !!e.log.paidByPersonId
    if (f.payer === 'me' && byOther) return false
    if (f.payer === 'others' && !byOther) return false
    return true
  })
  const newest = (a: VehicleEntry, b: VehicleEntry) => b.date.localeCompare(a.date) || b.odometerKm - a.odometerKm
  const cmp: Record<LogSort, (a: VehicleEntry, b: VehicleEntry) => number> = {
    new: newest,
    old: (a, b) => -newest(a, b),
    cost: (a, b) => b.cost - a.cost || newest(a, b),
    kpl: (a, b) => ((b.kind === 'fuel' && b.kmPerLiter) || 0) - ((a.kind === 'fuel' && a.kmPerLiter) || 0) || newest(a, b),
  }
  return out.sort(cmp[f.sort])
}

// ---------- التجميع بالشهر ----------

export interface VehicleMonth {
  /** YYYY-MM */
  key: string
  /** «11/2026» — بالرقم. */
  label: string
  items: VehicleEntry[]
  cost: number
  liters: number
  drivenKm: number
  avgKmPerLiter: number | null
}

export function groupVehicleByMonth(entries: VehicleEntry[]): VehicleMonth[] {
  const map = new Map<string, VehicleEntry[]>()
  for (const e of entries) {
    const k = e.date.slice(0, 7)
    const list = map.get(k)
    if (list) list.push(e)
    else map.set(k, [e])
  }
  return [...map.entries()].map(([key, items]) => {
    const fuel = items.filter((e): e is FuelEntry => e.kind === 'fuel')
    const kpl = fuel.flatMap((e) => (e.kmPerLiter ? [e.kmPerLiter] : []))
    return {
      key,
      label: `${Number(key.slice(5, 7))}/${key.slice(0, 4)}`,
      items,
      cost: items.reduce((s, e) => s + e.cost, 0),
      liters: fuel.reduce((s, e) => s + e.log.liters, 0),
      drivenKm: fuel.reduce((s, e) => s + (e.drivenKm ?? 0), 0),
      avgKmPerLiter: kpl.length ? kpl.reduce((s, x) => s + x, 0) / kpl.length : null,
    }
  })
}

// ---------- ربط العملية بحركتها المالية ----------

/**
 * حركة المصروف المرتبطة بتعبئة أو تغيير زيت: بالمعرّف المحفوظ (السجلات الجديدة)،
 * وإلا بالمطابقة (نفس التاريخ والمبلغ والحساب والفئة) للسجلات القديمة قبل الربط.
 */
export function findLogTransaction(log: FuelLog | OilChangeLog, categoryId: string, txns: Transaction[]): Transaction | undefined {
  if (log.transactionId) return txns.find((t) => t.id === log.transactionId)
  if (!log.cost || !log.accountId) return undefined
  return txns.find((t) => t.type === 'expense' && t.categoryId === categoryId && t.date === log.date && t.accountId === log.accountId && Math.abs(t.amount - log.cost!) < 0.005)
}
