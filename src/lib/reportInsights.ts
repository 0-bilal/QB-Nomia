import type { Category, Transaction } from '../types'
import { monthRange } from './reportData'

export const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
/** أيام الأسبوع بترتيب getDay() (الأحد = 0). */
const WEEKDAYS_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

/** "YYYY-MM" مزاحًا بعدد أشهر (سالب للخلف). */
export function shiftMonth(monthValue: string, delta: number): string {
  const [y, m] = monthValue.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function monthName(monthValue: string): string {
  return MONTHS_AR[Number(monthValue.slice(5, 7)) - 1]
}

export function monthIncomeExpense(monthValue: string, transactions: Transaction[]): { income: number; expense: number } {
  const { startISO, endISO } = monthRange(monthValue)
  let income = 0
  let expense = 0
  for (const t of transactions) {
    if (t.date < startISO || t.date >= endISO) continue
    if (t.type === 'income') income += t.amount
    else if (t.type === 'expense') expense += t.amount
  }
  return { income, expense }
}

/** نسبة التغيّر (مقرّبة) — null لو ما فيه أساس للمقارنة. */
export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null
  return Math.round(((current - previous) / Math.abs(previous)) * 100)
}

/** مصروف كل يوم بالشهر (الفهرس 0 = اليوم 1). */
export function dailyExpenseForMonth(monthValue: string, transactions: Transaction[]): number[] {
  const [y, m] = monthValue.split('-').map(Number)
  const days = new Date(y, m, 0).getDate()
  const out = new Array<number>(days).fill(0)
  const prefix = `${monthValue}-`
  for (const t of transactions) {
    if (t.type !== 'expense' || !t.date.startsWith(prefix)) continue
    out[Number(t.date.slice(8, 10)) - 1] += t.amount
  }
  return out
}

/** يوم الأسبوع الأعلى متوسط إنفاق (على الأيام المنقضية فقط) — null لو ما فيه مصاريف. */
export function busiestWeekday(monthValue: string, daily: number[], elapsedDays: number): { label: string; avg: number } | null {
  const [y, m] = monthValue.split('-').map(Number)
  const sum = new Array(7).fill(0)
  const count = new Array(7).fill(0)
  for (let d = 1; d <= Math.min(elapsedDays, daily.length); d++) {
    const wd = new Date(y, m - 1, d).getDay()
    sum[wd] += daily[d - 1]
    count[wd]++
  }
  let best = -1
  let bestAvg = 0
  for (let i = 0; i < 7; i++) {
    const avg = count[i] ? sum[i] / count[i] : 0
    if (avg > bestAvg) {
      bestAvg = avg
      best = i
    }
  }
  return best < 0 ? null : { label: WEEKDAYS_AR[best], avg: Math.round(bestAvg) }
}

export function categorySpendForMonth(monthValue: string, transactions: Transaction[]): Map<string, number> {
  const { startISO, endISO } = monthRange(monthValue)
  const map = new Map<string, number>()
  for (const t of transactions) {
    if (t.type !== 'expense' || t.date < startISO || t.date >= endISO) continue
    const key = t.categoryId ?? '__none__'
    map.set(key, (map.get(key) ?? 0) + t.amount)
  }
  return map
}

export interface MonthNote {
  id: string
  kind: 'up' | 'down' | 'warn' | 'ok'
  title: string
  detail: string
}

const MIN_DIFF = 50

/**
 * ملاحظات الشهر المكتوبة تلقائيًا:
 * - أكبر زيادة لفئة مقارنة بالشهر السابق.
 * - أكبر توفير لفئة مقارنة بمتوسط آخر 3 أشهر (مُعدَّل بنسبة الأيام المنقضية للشهر الجاري).
 * - توقّع مصروف نهاية الشهر الجاري مقابل السقف الشهري.
 */
export function monthNotes(params: {
  monthValue: string
  transactions: Transaction[]
  categories: Category[]
  monthlyBudgetLimit: number | null
  today: Date
}): MonthNote[] {
  const { monthValue, transactions, categories, monthlyBudgetLimit, today } = params
  const notes: MonthNote[] = []
  const nameOf = (id: string) => (id === '__none__' ? 'بدون فئة' : (categories.find((c) => c.id === id)?.name ?? 'فئة محذوفة'))
  const [y, m] = monthValue.split('-').map(Number)
  const daysInMonth = new Date(y, m, 0).getDate()
  const isCurrent = today.getFullYear() === y && today.getMonth() + 1 === m
  const elapsed = isCurrent ? today.getDate() : daysInMonth
  const fmt = (n: number) => Math.round(n).toLocaleString('en-US')

  const cur = categorySpendForMonth(monthValue, transactions)
  const prevMonth = shiftMonth(monthValue, -1)
  const prev = categorySpendForMonth(prevMonth, transactions)

  let up: { id: string; pct: number; cur: number; prev: number } | null = null
  for (const [id, amount] of cur) {
    const p = prev.get(id) ?? 0
    if (p <= 0 || amount - p < MIN_DIFF) continue
    const pct = pctChange(amount, p) ?? 0
    if (!up || pct > up.pct) up = { id, pct, cur: amount, prev: p }
  }
  if (up) {
    notes.push({
      id: 'up',
      kind: 'up',
      title: `صرفت على «${nameOf(up.id)}» ${up.pct}% أكثر من ${monthName(prevMonth)}`,
      detail: `${fmt(up.cur)} مقابل ${fmt(up.prev)} ر.س`,
    })
  }

  const history = [1, 2, 3].map((k) => categorySpendForMonth(shiftMonth(monthValue, -k), transactions))
  let down: { id: string; pct: number; cur: number; avg: number } | null = null
  const ids = new Set(history.flatMap((h) => [...h.keys()]))
  for (const id of ids) {
    const avgFull = history.reduce((s, h) => s + (h.get(id) ?? 0), 0) / history.length
    const avg = avgFull * (elapsed / daysInMonth)
    const amount = cur.get(id) ?? 0
    if (avg <= 0 || avg - amount < MIN_DIFF) continue
    const pct = Math.round(((avg - amount) / avg) * 100)
    if (!down || pct > down.pct) down = { id, pct, cur: amount, avg }
  }
  if (down) {
    notes.push({
      id: 'down',
      kind: 'down',
      title: `وفّرت في «${nameOf(down.id)}» ${down.pct}% عن متوسطك`,
      detail: `${fmt(down.cur)} مقابل متوسط ${fmt(down.avg)} ر.س${isCurrent ? ' حتى هذا اليوم' : ''}`,
    })
  }

  if (isCurrent && monthlyBudgetLimit && elapsed >= 5) {
    const spent = [...cur.values()].reduce((s, v) => s + v, 0)
    const projected = (spent / elapsed) * daysInMonth
    notes.push(
      projected > monthlyBudgetLimit
        ? { id: 'proj', kind: 'warn', title: `بمعدلك الحالي سيصل مصروف الشهر إلى ${fmt(projected)} ر.س`, detail: `فوق سقفك الشهري ${fmt(monthlyBudgetLimit)} ر.س` }
        : { id: 'proj', kind: 'ok', title: `بمعدلك الحالي سيصل مصروف الشهر إلى ${fmt(projected)} ر.س`, detail: `ضمن سقفك الشهري ${fmt(monthlyBudgetLimit)} ر.س` },
    )
  }
  return notes
}
