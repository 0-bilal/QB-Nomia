import { useCallback, type CSSProperties } from 'react'
import { useData } from '../state/DataContext'
import { batchParts, type BatchKind, type BatchPart, type MoneyBatch } from '../lib/moneyTrail'
import { formatAmount } from '../lib/format'
import { MONTHS_AR } from '../lib/txFilters'
import { ScaleIcon } from './ActivityIcon'

/** أيقونة «شجرة المصاريف» — جذع يتفرع لثلاثة. */
export function TrailIcon({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="4.5" r="2" />
      <circle cx="5" cy="19.5" r="2" />
      <circle cx="12" cy="19.5" r="2" />
      <circle cx="19" cy="19.5" r="2" />
      <path d="M12 6.5v11M12 11c-5 0-7 2-7 6.5M12 11c5 0 7 2 7 6.5" />
    </svg>
  )
}

export function HandIcon({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 11V7a2 2 0 0 1 4 0v4M11 10V5a2 2 0 0 1 4 0v6M15 9a2 2 0 0 1 4 0v4a7 7 0 0 1-7 7h-1a6 6 0 0 1-5-3l-2.5-4a1.8 1.8 0 0 1 3-2L7 13" />
    </svg>
  )
}

export function PeopleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 3-6 6.5-6s6.5 2.4 6.5 6" />
      <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.4c1.9.8 3 2.8 3 5.6" />
    </svg>
  )
}

export function AlertIcon({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4 2.8 19.5h18.4z" />
      <path d="M12 10v4.5M12 17.2h.01" />
    </svg>
  )
}

function IncomeArrow({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V5M6 11l6-6 6 6" />
    </svg>
  )
}

function HistoryIcon({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5M12 8v4l3 2" />
    </svg>
  )
}

export const KIND_COLOR: Record<BatchKind, string> = {
  income: 'var(--color-income)',
  borrowed: 'var(--color-owed-by)',
  opening: 'var(--color-text-2)',
  adjustment: 'var(--color-text-2)',
  unknown: 'var(--color-subscription)',
}

export function BatchKindIcon({ kind, size = 18 }: { kind: BatchKind; size?: number }) {
  if (kind === 'income') return <IncomeArrow size={size} />
  if (kind === 'borrowed') return <HandIcon size={size} />
  if (kind === 'opening') return <HistoryIcon size={size} />
  if (kind === 'adjustment') return <ScaleIcon size={size} />
  return <AlertIcon size={size} />
}

/** بلاطة أيقونة الدفعة بلون نوعها. */
export function BatchIconBox({ batch, size = 40 }: { batch: MoneyBatch; size?: number }) {
  const c = KIND_COLOR[batch.kind]
  return (
    <span
      className="flex flex-shrink-0 items-center justify-center"
      style={{ width: size, height: size, borderRadius: size * 0.34, background: `color-mix(in srgb, ${c} 15%, transparent)`, color: c }}
    >
      <BatchKindIcon kind={batch.kind} size={Math.round(size * 0.45)} />
    </span>
  )
}

export const PART_META: Record<BatchPart, { label: string; color: string }> = {
  spent: { label: 'صُرف', color: 'var(--color-expense)' },
  adjusted: { label: 'فرق مطابقة', color: 'var(--color-text-3)' },
  covered: { label: 'سدّ عجز سابق', color: 'var(--color-subscription)' },
  repaid: { label: 'سداد التزام', color: 'var(--color-owed-by)' },
  lent: { label: 'عند الناس', color: 'var(--color-owed-to)' },
  left: { label: 'باقي لك', color: 'var(--color-accent)' },
}

/** «1 أغسطس 2026». */
export function longDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${Number(d)} ${MONTHS_AR[Number(m) - 1]} ${y}`
}

/** مبلغ يحترم وضع الإخفاء. */
export function money(v: number, hidden: boolean): string {
  return hidden ? '•••' : formatAmount(v)
}

/** أسماء الدفعات والحسابات والأشخاص من البيانات الحالية. */
export function useTrailNames() {
  const { incomeSources, people, accounts } = useData()
  const accountName = useCallback((id?: string) => (id ? (accounts.find((a) => a.id === id)?.name ?? 'حساب محذوف') : ''), [accounts])
  const personName = useCallback((id?: string) => people.find((p) => p.id === id)?.name ?? 'شخص', [people])
  const batchTitle = useCallback(
    (b: MoneyBatch) => {
      // «راتب أغسطس»: اسم المصدر + شهر الدخول، حتى ما تتشابه دفعات نفس المصدر.
      if (b.kind === 'income') return `${incomeSources.find((s) => s.id === b.incomeSourceId)?.name ?? b.note ?? 'دخل'} ${MONTHS_AR[Number(b.date.slice(5, 7)) - 1]}`
      if (b.kind === 'borrowed') return `سلفة من ${personName(b.personId)}`
      if (b.kind === 'opening') return 'رصيد سابق'
      if (b.kind === 'adjustment') return 'تسوية مطابقة'
      return 'مصدر غير معروف'
    },
    [incomeSources, personName],
  )
  const batchSubtitle = useCallback(
    (b: MoneyBatch) => {
      if (b.kind === 'opening') return `${accountName(b.accountId)} · قبل أول حركة`
      const acc = b.accountId ? accountName(b.accountId) : 'صُرفت مباشرة'
      return `${longDate(b.date)} · ${acc}`
    },
    [accountName],
  )
  return { accountName, personName, batchTitle, batchSubtitle }
}

/** شريط الدفعة: أجزاؤها بألوانها بنسبة مبالغها. */
export function BatchBar({ batch, height = 8, style }: { batch: MoneyBatch; height?: number; style?: CSSProperties }) {
  const parts = batchParts(batch)
  return (
    <div className="flex overflow-hidden rounded-full bg-[var(--color-surface-high)]" style={{ height, gap: 2, ...style }}>
      {parts.map((p, i) => (
        <span
          key={p.part}
          className="qb-trail-grow block h-full"
          style={{ width: `${(p.amount / batch.amount) * 100}%`, background: PART_META[p.part].color, animationDelay: `${i * 90}ms` }}
        />
      ))}
    </div>
  )
}

export function BatchLegend({ batch, hidden }: { batch: MoneyBatch; hidden: boolean }) {
  return (
    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[var(--color-text-2)]">
      {batchParts(batch).map((p) => (
        <span key={p.part} className="inline-flex items-center gap-1.5">
          <span className="h-[7px] w-[7px] rounded-full" style={{ background: PART_META[p.part].color }} />
          {PART_META[p.part].label}
          <b className="num font-bold text-[var(--color-text)]">{money(p.amount, hidden)}</b>
        </span>
      ))}
    </div>
  )
}

export function BatchStatusBadge({ batch }: { batch: MoneyBatch }) {
  if (batch.kind === 'borrowed') return <TrailBadge color="var(--color-owed-by)">مقترضة</TrailBadge>
  if (batch.kind === 'unknown') return <TrailBadge color="var(--color-subscription)">تحتاج نظرة</TrailBadge>
  if (batch.open) return <TrailBadge color="var(--color-text-2)">مفتوحة</TrailBadge>
  return (
    <TrailBadge color="var(--color-income)">
      <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="m5 12.5 4.5 4.5L19 7.5" />
      </svg>
      مكتملة
    </TrailBadge>
  )
}

function TrailBadge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[10.5px] font-semibold" style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}>
      {children}
    </span>
  )
}
