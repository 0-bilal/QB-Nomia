import { useMemo, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { SALARY_INCOME_SOURCE_ID, useData } from '../../state/DataContext'
import { BUSINESS_NAME, BUSINESS_SOURCE_ID, clientViews, lastMonths, monthlyCollected, type ClientStatus } from '../../lib/business'
import { localIso } from '../../lib/homeFeed'
import { formatAmount } from '../../lib/format'
import { MONTHS_AR } from '../../lib/txFilters'
import type { BusinessClientKind } from '../../types'

/** عناصر «برمجيات QB» المشتركة: الشعار، أيقونات الأنواع، شارة الحالة، وبطاقات الدخل في الرئيسية والتقارير. */

export const soft = (c: string, p = 15) => `color-mix(in srgb, ${c} ${p}%, transparent)`

export function Svg({ size = 18, width = 2, children }: { size?: number; width?: number; children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}

/** شارة النشاط: مربع أبيض بحرفي QB (نفس لغة شعار التطبيق). */
export function BusinessMark({ size = 44 }: { size?: number }) {
  return (
    <span
      className="num grid flex-none place-items-center font-extrabold"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        fontSize: size * 0.34,
        background: 'linear-gradient(150deg, var(--color-accent-a), var(--color-accent) 55%, var(--color-accent-b))',
        color: 'var(--color-on-accent)',
        boxShadow: `0 ${size * 0.2}px ${size * 0.55}px -${size * 0.25}px rgba(255,255,255,0.4)`,
      }}
    >
      QB
    </span>
  )
}

const KIND_PATHS: Record<BusinessClientKind, ReactNode> = {
  restaurant: <path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 2-2 6 0 8v10" />,
  store: <path d="M4 9h16l-1 10H5zM8 9V6a4 4 0 0 1 8 0v3" />,
  cafe: <path d="M5 8h12v5a6 6 0 0 1-12 0zM17 9h1.5a2.5 2.5 0 0 1 0 5H17M8 3v2M12 3v2" />,
  services: <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z" />,
}

export function KindIcon({ kind, size = 18 }: { kind: BusinessClientKind; size?: number }) {
  return <Svg size={size}>{KIND_PATHS[kind]}</Svg>
}

export function KindTile({ kind, paused = false, size = 42 }: { kind: BusinessClientKind; paused?: boolean; size?: number }) {
  return (
    <span
      className="grid flex-none place-items-center"
      style={{ width: size, height: size, borderRadius: size / 3, background: paused ? 'var(--color-surface-high)' : 'rgba(255,255,255,.08)', color: paused ? 'var(--color-text-3)' : 'var(--color-text)' }}
    >
      <KindIcon kind={kind} size={size * 0.44} />
    </span>
  )
}

export function statusColor(key: ClientStatus['key']): string {
  return key === 'late' ? 'var(--color-expense)' : key === 'soon' ? 'var(--color-subscription)' : key === 'paused' ? 'var(--color-text-3)' : 'var(--color-text-2)'
}

/** شارة الحالة: متأخر أحمر، قريب أصفر، موقوف خافت، والنشط يعرض تاريخ الموعد. */
export function StatusChip({ status, due, small = false }: { status: ClientStatus; due?: string; small?: boolean }) {
  const color = statusColor(status.key)
  const label = status.key === 'active' && due ? `${Number(due.slice(8, 10))} ${MONTHS_AR[Number(due.slice(5, 7)) - 1]}` : status.label
  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold whitespace-nowrap ${small ? 'h-5 px-[7px] text-[10px]' : 'h-6 px-2.5 text-[11px]'}`}
      style={{ background: status.key === 'active' ? 'transparent' : soft(color, 14), color }}
    >
      {label}
    </span>
  )
}

export function Money({ value, hidden, className = '', color, sign = false }: { value: number; hidden?: boolean; className?: string; color?: string; sign?: boolean }) {
  return (
    <span dir="ltr" className={`num font-bold ${className}`} style={{ color }}>
      {hidden ? '•••' : `${sign && value > 0 ? '+' : ''}${formatAmount(value)}`}
      <span className="ms-1 font-sans text-[0.62em] font-medium text-[var(--color-text-3)]">ر.س</span>
    </span>
  )
}

/** الرئيسية: دخل الشهر حسب المصدر (الراتب، برمجيات QB، أخرى) — يظهر لما يكون فيه دخل من النشاط. */
export function IncomeSourcesStrip({ month, hidden }: { month: string; hidden: boolean }) {
  const { transactions } = useData()
  const navigate = useNavigate()
  const { salary, business, other } = useMemo(() => {
    let salary = 0
    let business = 0
    let other = 0
    for (const t of transactions) {
      if (t.type !== 'income' || !t.date.startsWith(month)) continue
      if (t.clientId || t.incomeSourceId === BUSINESS_SOURCE_ID) business += t.amount
      else if (t.incomeSourceId === SALARY_INCOME_SOURCE_ID) salary += t.amount
      else other += t.amount
    }
    return { salary, business, other }
  }, [transactions, month])
  if (business <= 0) return null
  const total = salary + business + other
  const parts: [string, number, string][] = [
    ['الراتب', salary, 'var(--color-commitment)'],
    [BUSINESS_NAME, business, 'var(--color-income)'],
    ['أخرى', other, 'var(--color-text-3)'],
  ]
  return (
    <button onClick={() => navigate('/business')} className="qb-press qb-card qb-rise mb-4 block w-full p-4 text-right">
      <div className="flex items-baseline justify-between">
        <span className="text-[12px] text-[var(--color-text-3)]">دخل الشهر حسب المصدر</span>
        <Money value={total} hidden={hidden} className="text-[15px]" color="var(--color-income)" />
      </div>
      <div className="mt-3 flex h-2.5 gap-[3px] overflow-hidden rounded-full">
        {parts
          .filter(([, v]) => v > 0)
          .map(([k, v, c]) => (
            <i key={k} className="block h-full rounded-[4px]" style={{ width: `${(v / total) * 100}%`, background: c }} />
          ))}
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {parts
          .filter(([, v]) => v > 0)
          .map(([k, v, c]) => (
            <div key={k} className="flex items-center gap-2 text-[12.5px]">
              <i className="h-2 w-2 flex-none rounded-[3px]" style={{ background: c }} />
              <span className="flex-1 text-[var(--color-text-2)]">
                {k}
                {k === BUSINESS_NAME && <span className="text-[var(--color-text-3)]"> · دخل إضافي</span>}
              </span>
              <span dir="ltr" className="num font-semibold">
                {hidden ? '•••' : formatAmount(v)}
              </span>
            </div>
          ))}
      </div>
    </button>
  )
}

/** التقارير: دخل آخر 6 أشهر مكدّس (الراتب + برمجيات QB) ونسبة النشاط. */
export function BusinessIncomeReport({ hidden = false }: { hidden?: boolean }) {
  const { transactions, businessClients } = useData()
  const today = localIso(new Date())
  const months = useMemo(() => lastMonths(today, 6), [today])
  const business = useMemo(() => monthlyCollected(transactions, months), [transactions, months])
  const salary = useMemo(
    () => months.map((m) => transactions.filter((t) => t.type === 'income' && !t.clientId && t.incomeSourceId === SALARY_INCOME_SOURCE_ID && t.date.startsWith(m)).reduce((s, t) => s + t.amount, 0)),
    [transactions, months],
  )
  const views = useMemo(() => clientViews(businessClients, transactions, today), [businessClients, transactions, today])
  const bizSum = business.reduce((s, v) => s + v, 0)
  if (bizSum <= 0 && views.length === 0) return null
  const all = bizSum + salary.reduce((s, v) => s + v, 0)
  const max = Math.max(1, ...months.map((_, i) => salary[i] + business[i]))

  return (
    <div className="qb-card p-4">
      <div className="flex h-[120px] items-end gap-2.5 px-1">
        {months.map((m, i) => (
          <div key={m} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="flex h-[100px] w-full flex-col-reverse gap-[2px]">
              {salary[i] > 0 && <i className="qb-col-grow block w-full rounded-[5px]" style={{ height: `${(salary[i] / max) * 100}%`, background: soft('var(--color-commitment)', 75) }} />}
              {business[i] > 0 && <i className="qb-col-grow block w-full rounded-[5px]" style={{ height: `${(business[i] / max) * 100}%`, background: 'var(--color-income)' }} />}
            </div>
            <small className="text-[10px] text-[var(--color-text-3)]">{MONTHS_AR[Number(m.slice(5, 7)) - 1].slice(0, 3)}</small>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-4 text-[12px] text-[var(--color-text-2)]">
        <span className="flex items-center gap-1.5">
          <i className="h-2 w-2 rounded-[3px]" style={{ background: 'var(--color-commitment)' }} />
          الراتب
        </span>
        <span className="flex items-center gap-1.5">
          <i className="h-2 w-2 rounded-[3px]" style={{ background: 'var(--color-income)' }} />
          {BUSINESS_NAME}
        </span>
      </div>
      <div className="mt-2.5 text-[11.5px] leading-relaxed text-[var(--color-text-3)]">
        النشاط شكّل <b className="num text-[var(--color-text)]">{all > 0 ? Math.round((bizSum / all) * 100) : 0}%</b> من دخلك خلال 6 أشهر، ومتوسطه{' '}
        <b className="num text-[var(--color-text)]">{hidden ? '•••' : formatAmount(bizSum / 6)}</b> ر.س شهريًا.
      </div>
    </div>
  )
}
