import type { ActivityItem } from '../state/DataContext'
import { localIso } from './homeFeed'

/** أنواع الحركة كما تظهر ببطاقات "كل الحركات" — "سلف" تجمع أعطيته/استلمت منه. */
export type TxType = 'expense' | 'income' | 'transfer' | 'loan'

export function txTypeOf(kind: ActivityItem['kind']): TxType {
  if (kind === 'loan-given' || kind === 'loan-received') return 'loan'
  // المساهمة مصروف دفعه غيرك — تظهر تحت «مصروف» (بمبلغ صفر فلا تغيّر المجاميع).
  if (kind === 'contribution') return 'expense'
  return kind
}

/** فترة جاهزة، أو `m:YYYY-MM` لشهر محدد (متنقّل الأشهر)، أو `custom` بتاريخي from/to. */
export type PeriodKey = 'all' | 'month' | 'last' | '30' | '90' | 'year' | 'custom' | `m:${string}`

export const PERIOD_PRESETS: [PeriodKey, string][] = [
  ['all', 'كل الوقت'],
  ['month', 'هذا الشهر'],
  ['last', 'الشهر الماضي'],
  ['30', 'آخر 30 يوم'],
  ['90', 'آخر 3 أشهر'],
  ['year', 'هذه السنة'],
]

export type SortKey = 'new' | 'old' | 'high' | 'low'
export const SORT_OPTIONS: [SortKey, string][] = [
  ['new', 'الأحدث أولًا'],
  ['old', 'الأقدم أولًا'],
  ['high', 'الأعلى مبلغًا'],
  ['low', 'الأقل مبلغًا'],
]

export const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']

export interface TxFilters {
  type: TxType | null
  period: PeriodKey
  from: string
  to: string
  accountIds: string[]
  minAmount: string
  maxAmount: string
  /** أسماء فئات المصاريف المختارة من بطاقات الفئات. */
  categories: string[]
  sort: SortKey
}

export const EMPTY_TX_FILTERS: TxFilters = {
  type: null,
  period: 'all',
  from: '',
  to: '',
  accountIds: [],
  minAmount: '',
  maxAmount: '',
  categories: [],
  sort: 'new',
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7)
}

export function monthLabel(key: string): string {
  return `${MONTHS_AR[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`
}

/** نقل مفتاح شهر (YYYY-MM) بعدد أشهر (سالب = للخلف). */
export function shiftMonth(key: string, delta: number): string {
  const y = Number(key.slice(0, 4))
  const m = Number(key.slice(5, 7)) - 1 + delta
  const d = new Date(y, m, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** نطاق التواريخ [from, to] (شامل) لفترة — سلسلتان فارغتان = بدون حد. */
export function periodRange(f: Pick<TxFilters, 'period' | 'from' | 'to'>, today: string): [string, string] {
  const p = f.period
  const ym = monthKey(today)
  if (p === 'all') return ['', '']
  if (p === 'custom') return [f.from, f.to]
  if (p === 'month') return [`${ym}-01`, `${ym}-31`]
  if (p === 'last') {
    const k = shiftMonth(ym, -1)
    return [`${k}-01`, `${k}-31`]
  }
  if (p === 'year') return [`${today.slice(0, 4)}-01-01`, `${today.slice(0, 4)}-12-31`]
  if (p === '30' || p === '90') {
    const d = new Date(`${today}T00:00:00`)
    d.setDate(d.getDate() - Number(p) + 1)
    return [localIso(d), today]
  }
  const k = p.slice(2)
  return [`${k}-01`, `${k}-31`]
}

export function periodLabel(f: Pick<TxFilters, 'period' | 'from' | 'to'>): string {
  if (f.period.startsWith('m:')) return monthLabel(f.period.slice(2))
  if (f.period === 'custom') return `${f.from ? f.from.replaceAll('-', '/') : '…'} ← ${f.to ? f.to.replaceAll('-', '/') : '…'}`
  return PERIOD_PRESETS.find(([k]) => k === f.period)?.[1] ?? ''
}

/** يطابق البحث: الاسم، الوصف (الحساب)، الملاحظة، أو المبلغ نفسه. */
export function matchesQuery(item: ActivityItem, q: string): boolean {
  if (!q) return true
  return (
    item.title.includes(q) ||
    item.subtitle.includes(q) ||
    (item.note ?? '').includes(q) ||
    String(Math.abs(item.amount)).includes(q.replace(/,/g, ''))
  )
}

export interface FilterOptions {
  /** تجاهل فلتر النوع (لحساب مجاميع بطاقات الأنواع نفسها). */
  ignoreType?: boolean
  /** تجاهل فلتر الفئة (لحساب بطاقات الفئات نفسها). */
  ignoreCategory?: boolean
}

export function filterActivity(items: ActivityItem[], f: TxFilters, query: string, today: string, opts: FilterOptions = {}): ActivityItem[] {
  const q = query.trim()
  const [from, to] = periodRange(f, today)
  const min = f.minAmount ? Number(f.minAmount) : null
  const max = f.maxAmount ? Number(f.maxAmount) : null
  return items.filter((item) => {
    if (!opts.ignoreType && f.type && txTypeOf(item.kind) !== f.type) return false
    if (!opts.ignoreCategory && f.categories.length > 0 && !((item.kind === 'expense' || item.kind === 'contribution') && f.categories.includes(item.title))) return false
    if (from && item.date < from) return false
    if (to && item.date > to) return false
    if (f.accountIds.length > 0 && !item.accountIds.some((id) => f.accountIds.includes(id))) return false
    const abs = Math.abs(item.amount)
    if (min !== null && abs < min) return false
    if (max !== null && abs > max) return false
    return matchesQuery(item, q)
  })
}

/** ترتيب حسب الاختيار — `items` مرتّبة أصلًا من الأحدث (compareActivityDesc). */
export function sortActivity(items: ActivityItem[], sort: SortKey): ActivityItem[] {
  if (sort === 'new') return items
  if (sort === 'old') return [...items].reverse()
  const sign = sort === 'high' ? -1 : 1
  return [...items].sort((a, b) => sign * (Math.abs(a.amount) - Math.abs(b.amount)))
}

/** عدد الفلاتر المفعّلة بنافذة الفلترة (الفترة، الحساب، المبلغ، الترتيب) — للرقم فوق زر الفلترة. */
export function sheetFilterCount(f: TxFilters): number {
  return (f.period !== 'all' ? 1 : 0) + (f.accountIds.length > 0 ? 1 : 0) + (f.minAmount || f.maxAmount ? 1 : 0) + (f.sort !== 'new' ? 1 : 0)
}

export interface Totals {
  income: number
  expense: number
  net: number
}

/** الدخل والمصروف والصافي — بدون التحويلات (لا تغيّر ما تملكه)؛ السلف تُحسب بإشارتها. */
export function totalsOf(items: ActivityItem[]): Totals {
  let income = 0
  let expense = 0
  for (const i of items) {
    if (i.kind === 'transfer') continue
    if (i.amount > 0) income += i.amount
    else expense += -i.amount
  }
  return { income, expense, net: income - expense }
}

/** مجموع كل نوع (بالقيمة المطلقة) — لبطاقات الأنواع. */
export function typeTotals(items: ActivityItem[]): Record<TxType, number> {
  const out: Record<TxType, number> = { expense: 0, income: 0, transfer: 0, loan: 0 }
  for (const i of items) out[txTypeOf(i.kind)] += Math.abs(i.amount)
  return out
}

/** صافي مجموعة (بدون التحويلات) — لعناوين الأشهر والأيام. */
export function netOf(items: ActivityItem[]): number {
  return items.filter((i) => i.kind !== 'transfer').reduce((s, i) => s + i.amount, 0)
}
