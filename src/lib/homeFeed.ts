import type { Commitment, RecurringTransaction, Subscription } from '../types'

export type UpcomingKind = 'subscription' | 'commitment' | 'recurring'

export interface UpcomingItem {
  id: string
  kind: UpcomingKind
  name: string
  date: string
  /** موجب للدخل المتكرر، سالب للمدفوعات، undefined للالتزام بدون تكلفة. */
  amount?: number
  daysLeft: number
}

export function localIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** عدد الأيام بين تاريخين ISO (يوم فقط) — سالب لو التاريخ فات. */
export function daysBetween(fromIso: string, toIso: string): number {
  const a = Date.UTC(+fromIso.slice(0, 4), +fromIso.slice(5, 7) - 1, +fromIso.slice(8, 10))
  const b = Date.UTC(+toIso.slice(0, 4), +toIso.slice(5, 7) - 1, +toIso.slice(8, 10))
  return Math.round((b - a) / 86400000)
}

/** الاشتراكات والالتزامات والحركات المتكررة النشطة المستحقة خلال `withinDays` يومًا (والمتأخرة منها)، الأقرب أولًا. */
export function upcomingItems(
  subscriptions: Subscription[],
  commitments: Commitment[],
  recurring: RecurringTransaction[],
  today: string,
  withinDays = 14,
): UpcomingItem[] {
  const items: UpcomingItem[] = [
    ...subscriptions
      .filter((s) => s.status === 'active')
      .map((s): UpcomingItem => ({ id: `s-${s.id}`, kind: 'subscription', name: s.name, date: s.nextRenewalDate, amount: -s.cost, daysLeft: daysBetween(today, s.nextRenewalDate) })),
    ...commitments
      .filter((c) => c.status === 'active')
      .map((c): UpcomingItem => ({ id: `c-${c.id}`, kind: 'commitment', name: c.name, date: c.nextDueDate, amount: c.cost ? -c.cost : undefined, daysLeft: daysBetween(today, c.nextDueDate) })),
    ...recurring
      .filter((r) => r.status === 'active' && r.type !== 'transfer')
      .map(
        (r): UpcomingItem => ({
          id: `r-${r.id}`,
          kind: 'recurring',
          name: r.name,
          date: r.nextDueDate,
          amount: r.type === 'income' ? r.amount : -r.amount,
          daysLeft: daysBetween(today, r.nextDueDate),
        }),
      ),
  ]
  return items.filter((i) => i.daysLeft <= withinDays).sort((a, b) => a.daysLeft - b.daysLeft)
}

/** «3 أيام» حتى 10، و«11 يوم» فما فوق (تمييز العدد). */
function daysWord(n: number): string {
  return `${n} ${n <= 10 ? 'أيام' : 'يوم'}`
}

export function daysLeftLabel(days: number): string {
  if (days < 0) return days === -1 ? 'متأخر يوم' : `متأخر ${daysWord(-days)}`
  if (days === 0) return 'اليوم'
  if (days === 1) return 'غدًا'
  if (days === 2) return 'بعد يومين'
  return `بعد ${daysWord(days)}`
}

/** تقسيم عناصر مرتّبة (الأحدث أولًا) حسب اليوم مع الحفاظ على الترتيب. */
export function groupByDay<T extends { date: string }>(items: T[]): { date: string; items: T[] }[] {
  const groups: { date: string; items: T[] }[] = []
  for (const item of items) {
    const last = groups[groups.length - 1]
    if (last && last.date === item.date) last.items.push(item)
    else groups.push({ date: item.date, items: [item] })
  }
  return groups
}

export function dayLabel(date: string, today: string): string {
  const diff = daysBetween(date, today)
  if (diff === 0) return 'اليوم'
  if (diff === 1) return 'أمس'
  return ''
}
