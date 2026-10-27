/**
 * «برمجيات QB» — منطق النشاط التجاري: جدول تجديد كل عميل، حالته، والأرقام
 * الشهرية. التحصيل نفسه حركة دخل عادية تحمل clientId، فالجدول يُحسب منها
 * دائمًا (حذفها أو تعديل مبلغها أو التراجع عن حذفها ينعكس تلقائيًا).
 */
import type { BusinessClient, BusinessClientKind, Transaction } from '../types'

export const BUSINESS_NAME = 'برمجيات QB'
export const BUSINESS_SOURCE_ID = 'src-qb-software'

export const CLIENT_KINDS: [BusinessClientKind, string][] = [
  ['restaurant', 'مطعم'],
  ['store', 'متجر'],
  ['cafe', 'مقهى'],
  ['services', 'خدمات'],
]
export const kindLabel = (k: BusinessClientKind) => CLIENT_KINDS.find(([id]) => id === k)?.[1] ?? ''

export const CYCLES: [number, string][] = [
  [1, 'شهري'],
  [3, 'كل 3 أشهر'],
  [6, 'كل 6 أشهر'],
  [12, 'سنوي'],
]
export const cycleLabel = (m: number) => CYCLES.find(([c]) => c === m)?.[1] ?? `كل ${m} أشهر`

/** إضافة أشهر مع تثبيت اليوم على آخر الشهر لو ما يكفي (31 يناير + شهر = 28/29 فبراير). */
export function addMonths(date: string, months: number): string {
  const [y, m, d] = date.split('-').map(Number)
  const total = y * 12 + (m - 1) + months
  const ny = Math.floor(total / 12)
  const nm = total - ny * 12
  const last = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate()
  return `${ny}-${String(nm + 1).padStart(2, '0')}-${String(Math.min(d, last)).padStart(2, '0')}`
}

/** فرق الأيام بين تاريخين بصيغة YYYY-MM-DD (to − from). */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 864e5)
}

const cents = (n: number) => Math.round(n * 100)

export function clientPayments(clientId: string, txns: Transaction[]): Transaction[] {
  return txns.filter((t) => t.clientId === clientId && t.type === 'income')
}

export interface ClientSchedule {
  nextDueDate: string
  /** المحصّل من الدورة الحالية (تحصيل جزئي لم يكمل دورة). */
  credit: number
  /** المتبقي لإكمال الدورة الحالية. */
  remaining: number
  /** بداية الدورة الحالية. */
  periodStart: string
  totalPaid: number
}

export function clientSchedule(c: BusinessClient, txns: Transaction[]): ClientSchedule {
  const payments = clientPayments(c.id, txns)
  const totalPaid = payments.reduce((s, t) => s + t.amount, 0)
  const sinceBase = payments.filter((t) => (t.createdAt ?? '') >= c.baseAt).reduce((s, t) => s + cents(t.amount), 0)
  const unit = Math.max(1, cents(c.amount))
  const periods = Math.floor(sinceBase / unit)
  const credit = (sinceBase - periods * unit) / 100
  const nextDueDate = addMonths(c.baseDueDate, c.cycleMonths * periods)
  return { nextDueDate, credit, remaining: credit > 0 ? c.amount - credit : c.amount, periodStart: addMonths(nextDueDate, -c.cycleMonths), totalPaid }
}

export type ClientStatusKey = 'late' | 'soon' | 'active' | 'paused'

export interface ClientStatus {
  key: ClientStatusKey
  days: number
  label: string
}

/** «يوم»، «يومين»، «3 أيام»، «11 يوم». */
export function daysWord(n: number): string {
  if (n === 1) return 'يوم'
  if (n === 2) return 'يومين'
  if (n >= 3 && n <= 10) return `${n} أيام`
  return `${n} يوم`
}

export const SOON_DAYS = 7

export function clientStatus(c: BusinessClient, nextDueDate: string, today: string): ClientStatus {
  const days = daysBetween(today, nextDueDate)
  if (c.status === 'paused') return { key: 'paused', days, label: 'موقوف' }
  if (days < 0) return { key: 'late', days, label: `متأخر ${daysWord(-days)}` }
  if (days === 0) return { key: 'soon', days, label: 'اليوم' }
  if (days <= SOON_DAYS) return { key: 'soon', days, label: `بعد ${daysWord(days)}` }
  return { key: 'active', days, label: '' }
}

/** القيمة الشهرية للعميل النشط (السنوي ÷ 12). الموقوف = 0. */
export function monthlyValue(c: BusinessClient): number {
  return c.status === 'active' ? c.amount / c.cycleMonths : 0
}

export interface ClientView {
  client: BusinessClient
  schedule: ClientSchedule
  status: ClientStatus
}

const ORDER: Record<ClientStatusKey, number> = { late: 0, soon: 1, active: 2, paused: 3 }

export function clientViews(clients: BusinessClient[], txns: Transaction[], today: string): ClientView[] {
  return clients
    .map((client) => {
      const schedule = clientSchedule(client, txns)
      return { client, schedule, status: clientStatus(client, schedule.nextDueDate, today) }
    })
    .sort((a, b) => ORDER[a.status.key] - ORDER[b.status.key] || a.schedule.nextDueDate.localeCompare(b.schedule.nextDueDate))
}

export interface BusinessMonth {
  /** المحصّل هذا الشهر (حركات العملاء). */
  collected: number
  /** مستحق فات موعده وما اكتمل (من هذا الشهر أو قبله). */
  late: number
  /** مستحق باقي هذا الشهر وموعده ما جا. */
  upcoming: number
}

/** أرقام شهر (YYYY-MM) حتى اليوم. */
export function businessMonth(views: ClientView[], txns: Transaction[], month: string, today: string): BusinessMonth {
  const collected = txns.filter((t) => t.clientId && t.type === 'income' && t.date.startsWith(month)).reduce((s, t) => s + t.amount, 0)
  let late = 0
  let upcoming = 0
  for (const v of views) {
    if (v.client.status !== 'active') continue
    const due = v.schedule.nextDueDate
    if (due < today) late += v.schedule.remaining
    else if (due.startsWith(month)) upcoming += v.schedule.remaining
  }
  return { collected, late, upcoming }
}

/** المحصّل لكل شهر من قائمة أشهر (YYYY-MM). */
export function monthlyCollected(txns: Transaction[], months: string[]): number[] {
  const sums = new Map(months.map((m) => [m, 0]))
  for (const t of txns) {
    if (!t.clientId || t.type !== 'income') continue
    const m = t.date.slice(0, 7)
    if (sums.has(m)) sums.set(m, sums.get(m)! + t.amount)
  }
  return months.map((m) => sums.get(m)!)
}

/** آخر n أشهر تنتهي بشهر اليوم، بالأقدم أولًا. */
export function lastMonths(today: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => addMonths(`${today.slice(0, 7)}-01`, i - n + 1).slice(0, 7))
}

/** رابط واتساب لرقم سعودي (05xxxxxxxx أو 9665xxxxxxxx أو +966…). null لو الرقم غير صالح. */
export function whatsappLink(phone: string | undefined, text: string): string | null {
  if (!phone) return null
  let d = phone.replace(/[^\d]/g, '')
  if (d.startsWith('00')) d = d.slice(2)
  if (d.startsWith('05') && d.length === 10) d = `966${d.slice(1)}`
  else if (d.startsWith('5') && d.length === 9) d = `966${d}`
  if (d.length < 10) return null
  return `https://wa.me/${d}?text=${encodeURIComponent(text)}`
}
