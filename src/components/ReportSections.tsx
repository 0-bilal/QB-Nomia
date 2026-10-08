import { useState, type ReactNode } from 'react'
import { CategoryIcon } from './CategoryIcons'
import { formatAmount } from '../lib/format'
import { categoryColor } from '../lib/categoryStats'
import { MONTHS_AR, type MonthNote } from '../lib/reportInsights'
import type { CategorySpendRow, TrendPoint } from '../lib/reportData'

function soft(color: string, pct = 15): string {
  return `color-mix(in srgb, ${color} ${pct}%, transparent)`
}

function Chevron({ dir }: { dir: 'start' | 'end' }) {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d={dir === 'start' ? 'm9 6 6 6-6 6' : 'm15 6-6 6 6 6'} />
    </svg>
  )
}

/** شارة تغيّر عن الشهر السابق. `goodWhenUp` تحدد اللون: الزيادة خضراء للدخل/التوفير وحمراء للمصروف. */
export function DeltaChip({ pct, goodWhenUp, suffix = '' }: { pct: number | null; goodWhenUp: boolean; suffix?: string }) {
  if (pct === null) return null
  const good = pct === 0 ? null : pct > 0 === goodWhenUp
  const color = good === null ? 'var(--color-text-3)' : good ? 'var(--color-income)' : 'var(--color-expense)'
  return (
    <span className="num inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: good === null ? 'rgba(255,255,255,0.06)' : soft(color, 12), color }}>
      {pct > 0 ? '▲' : pct < 0 ? '▼' : ''} {Math.abs(pct)}%{suffix}
    </span>
  )
}

/** (1) التنقّل بين الأشهر بسهمين — التالي معطّل عند الشهر الحالي. */
export function MonthSwitcher({ label, sub, onPrev, onNext, nextDisabled }: { label: string; sub: string; onPrev: () => void; onNext: () => void; nextDisabled: boolean }) {
  return (
    <div className="mb-1 flex items-center justify-between rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-[5px]">
      <button onClick={onNext} disabled={nextDisabled} aria-label="الشهر التالي" className="qb-press flex h-[38px] w-[38px] items-center justify-center rounded-full bg-[var(--color-surface-high)] disabled:opacity-30">
        <Chevron dir="start" />
      </button>
      <div className="text-center">
        <div className="text-[15px] font-bold">{label}</div>
        <div className="text-[10.5px] text-[var(--color-text-3)]">{sub}</div>
      </div>
      <button onClick={onPrev} aria-label="الشهر السابق" className="qb-press flex h-[38px] w-[38px] items-center justify-center rounded-full bg-[var(--color-surface-high)]">
        <Chevron dir="end" />
      </button>
    </div>
  )
}

/** (2) ملخص الشهر: صافي التوفير والدخل والمصروف مع التغيّر عن الشهر السابق، ونسبة الادخار. */
export function MonthSummary({
  income,
  expense,
  prevIncome,
  prevExpense,
  prevName,
  pctChange,
}: {
  income: number
  expense: number
  prevIncome: number
  prevExpense: number
  prevName: string
  pctChange: (cur: number, prev: number) => number | null
}) {
  const net = income - expense
  const prevNet = prevIncome - prevExpense
  const rate = income > 0 ? Math.round((net / income) * 100) : null
  const netColor = net >= 0 ? 'var(--color-income)' : 'var(--color-expense)'
  return (
    <div className="qb-card-elevated qb-rise p-[18px]">
      <div className="relative">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12.5px] font-medium text-[var(--color-text-2)]">صافي التوفير</span>
          <DeltaChip pct={pctChange(net, prevNet)} goodWhenUp suffix={` عن ${prevName}`} />
        </div>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span dir="ltr" className="num text-[36px] font-bold" style={{ color: netColor }}>
            {net < 0 ? '−' : ''}
            {formatAmount(Math.abs(net))}
          </span>
          <span className="text-[13px] text-[var(--color-text-3)]">ر.س</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          {[
            { label: 'الدخل', value: income, prev: prevIncome, color: 'var(--color-income)', goodWhenUp: true },
            { label: 'المصروف', value: expense, prev: prevExpense, color: 'var(--color-expense)', goodWhenUp: false },
          ].map((x) => (
            <div key={x.label} className="rounded-[18px] bg-white/[0.04] p-3">
              <div className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-3)]">
                <span className="rounded-full" style={{ width: 7, height: 7, background: x.color }} />
                {x.label}
              </div>
              <div className="num mb-1.5 mt-0.5 text-[18px] font-bold">{formatAmount(x.value)}</div>
              <DeltaChip pct={pctChange(x.value, x.prev)} goodWhenUp={x.goodWhenUp} />
            </div>
          ))}
        </div>
        <div className="mt-3.5">
          <div className="mb-1.5 flex justify-between text-[11.5px] text-[var(--color-text-2)]">
            <span>
              نسبة الادخار <b className="num text-[var(--color-text)]">{rate === null ? '—' : `${rate}%`}</b>
            </span>
            {rate === null && <span className="text-[var(--color-text-3)]">لا يوجد دخل بهذا الشهر</span>}
          </div>
          <div className="overflow-hidden rounded-full bg-white/[0.07]" style={{ height: 8 }}>
            <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, rate ?? 0))}%`, background: 'var(--color-income)', transition: 'width 500ms ease' }} />
          </div>
        </div>
      </div>
    </div>
  )
}

/** (4) الدخل والمصروف لآخر 6 أشهر — الضغط على شهر يبرزه ويعرض أرقامه. الأحدث على اليسار (اتجاه القراءة). */
export function FlowChart({ trend, selected, onSelect }: { trend: TrendPoint[]; selected: number; onSelect: (i: number) => void }) {
  const max = Math.max(1, ...trend.flatMap((m) => [m.income, m.expense]))
  const sel = trend[selected]
  const BAR_H = 112
  return (
    <div className="qb-card p-4">
      {sel && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-1 text-[12px] text-[var(--color-text-2)]">
          <b className="text-[var(--color-text)]">{sel.label}</b>
          <span>
            دخل <b className="num text-[var(--color-text)]">{formatAmount(sel.income)}</b> · مصروف <b className="num text-[var(--color-text)]">{formatAmount(sel.expense)}</b> · صافي{' '}
            <b dir="ltr" className="num" style={{ color: sel.income - sel.expense >= 0 ? 'var(--color-income)' : 'var(--color-expense)' }}>
              {sel.income - sel.expense < 0 ? '−' : ''}
              {formatAmount(Math.abs(sel.income - sel.expense))}
            </b>
          </span>
        </div>
      )}
      <div className="relative flex items-end" style={{ height: BAR_H + 22 }}>
        <span className="pointer-events-none absolute inset-x-0 border-t border-white/[0.12]" style={{ bottom: 22 }} />
        <span className="pointer-events-none absolute inset-x-0 border-t border-dashed border-white/[0.05]" style={{ bottom: 22 + BAR_H / 2 }} />
        {trend.map((m, i) => {
          const active = i === selected
          return (
            <button
              key={i}
              onClick={() => onSelect(i)}
              aria-pressed={active}
              aria-label={`${m.label}: دخل ${formatAmount(m.income)}، مصروف ${formatAmount(m.expense)}`}
              className="relative flex h-full flex-1 flex-col items-center justify-end"
            >
              {active && <span className="absolute inset-x-1 rounded-[10px] bg-white/[0.04]" style={{ top: 0, bottom: 20 }} />}
              <span className="relative flex items-end gap-0.5" style={{ height: BAR_H, opacity: active ? 1 : 0.45, transition: 'opacity 200ms ease' }}>
                <span className="w-[11px] rounded-t-[4px]" style={{ height: Math.max(3, (m.income / max) * BAR_H), background: 'var(--color-income)', transition: 'height 600ms var(--ease-out-expo)' }} />
                <span className="w-[11px] rounded-t-[4px]" style={{ height: Math.max(3, (m.expense / max) * BAR_H), background: 'var(--color-expense)', transition: 'height 600ms var(--ease-out-expo)' }} />
              </span>
              <span className="mt-1.5 text-[10px]" style={{ color: active ? 'var(--color-text)' : 'var(--color-text-3)', fontWeight: active ? 700 : 400, height: 14 }}>
                {m.label}
              </span>
            </button>
          )
        })}
      </div>
      <div className="mt-2.5 flex justify-center gap-4 text-[11px] text-[var(--color-text-2)]">
        <span className="flex items-center gap-1.5">
          <span className="rounded-[3px] bg-[var(--color-income)]" style={{ width: 8, height: 8 }} />
          دخل
        </span>
        <span className="flex items-center gap-1.5">
          <span className="rounded-[3px] bg-[var(--color-expense)]" style={{ width: 8, height: 8 }} />
          مصروف
        </span>
      </div>
    </div>
  )
}

function rowColor(row: CategorySpendRow): string {
  return row.id === '__none__' ? 'var(--color-text-3)' : categoryColor({ name: row.name })
}

/** (6) المصاريف حسب الفئة: دائرة بالمجموع ومفتاح ألوان، ثم صف لكل فئة بأيقونتها وميزانيتها والتغيّر عن الشهر السابق. */
export function CategoryDonut({ rows, prevSpend, prevName, onOpen }: { rows: CategorySpendRow[]; prevSpend: Map<string, number>; prevName: string; onOpen: () => void }) {
  const [selected, setSelected] = useState<string | null>(null)
  const total = rows.reduce((s, r) => s + r.spent, 0)
  const R = 52
  const C = 2 * Math.PI * R
  const sel = rows.find((r) => r.id === selected)
  const maxSpent = rows[0]?.spent ?? 1
  // بداية كل قطعة بالدائرة = مجموع أطوال ما قبلها.
  const segments = rows.map((r, i) => ({
    row: r,
    len: (r.spent / total) * C,
    start: rows.slice(0, i).reduce((s, x) => s + (x.spent / total) * C, 0),
  }))

  return (
    <div className="qb-card overflow-hidden">
      <div className="flex items-center gap-3.5 px-4 pb-2 pt-4">
        <div className="relative flex-shrink-0" style={{ width: 132, height: 132 }}>
          <svg viewBox="0 0 132 132" width="132" height="132" role="img" aria-label="توزيع المصاريف حسب الفئة">
            <circle cx="66" cy="66" r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="16" />
            {segments.map(({ row: r, len, start }) => (
                <circle
                  key={r.id}
                  cx="66"
                  cy="66"
                  r={R}
                  fill="none"
                  stroke={rowColor(r)}
                  strokeWidth={selected === r.id ? 20 : 16}
                  strokeDasharray={`${Math.max(0, len - 2)} ${C}`}
                  strokeDashoffset={-start}
                  transform="rotate(-90 66 66)"
                  opacity={selected === null || selected === r.id ? 1 : 0.3}
                  style={{ cursor: 'pointer', transition: 'opacity 200ms ease, stroke-width 200ms ease' }}
                  onClick={() => setSelected((s) => (s === r.id ? null : r.id))}
                >
                  <title>{`${r.name}: ${formatAmount(r.spent)} ر.س`}</title>
                </circle>
            ))}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] text-[var(--color-text-3)]">{sel ? sel.name : 'المصروف'}</span>
            <span className="num text-[19px] font-bold">{formatAmount(sel ? sel.spent : total)}</span>
            <span className="num text-[10px] text-[var(--color-text-3)]">{sel ? `${sel.pctOfTotal}%` : 'ر.س'}</span>
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          {rows.slice(0, 6).map((r) => (
            <button
              key={r.id}
              onClick={() => setSelected((s) => (s === r.id ? null : r.id))}
              className="flex items-center gap-1.5 text-right text-[11.5px] text-[var(--color-text-2)]"
              style={{ opacity: selected === null || selected === r.id ? 1 : 0.45 }}
            >
              <span className="flex-shrink-0 rounded-[3px]" style={{ width: 8, height: 8, background: rowColor(r) }} />
              <span className="min-w-0 flex-1 truncate">{r.name}</span>
              <b className="num font-semibold text-[var(--color-text)]">{r.pctOfTotal}%</b>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2">
        {rows.map((r) => {
          const color = rowColor(r)
          const prev = prevSpend.get(r.id) ?? 0
          const delta = prev > 0 ? Math.round(((r.spent - prev) / prev) * 100) : null
          const budgetPct = r.pctOfBudget
          const barColor = budgetPct === null ? color : budgetPct > 100 ? 'var(--color-expense)' : budgetPct >= 80 ? 'var(--color-subscription)' : color
          return (
            <button key={r.id} onClick={onOpen} className="flex w-full items-center gap-3 border-t border-[var(--color-border)] px-4 py-2.5 text-right">
              <span className="flex flex-shrink-0 items-center justify-center" style={{ width: 38, height: 38, borderRadius: 13, background: soft(color, 16), color }}>
                {r.icon ? <CategoryIcon iconKey={r.icon} size={18} /> : <span className="text-[15px] font-bold">{r.name.trim().charAt(0)}</span>}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between gap-2 text-[13px] font-semibold">
                  <span className="truncate">{r.name}</span>
                  <span className="num flex-shrink-0">{formatAmount(r.spent)}</span>
                </div>
                <div className="mt-1.5 overflow-hidden rounded-full bg-white/[0.07]" style={{ height: 5 }}>
                  <div className="h-full rounded-full" style={{ width: `${budgetPct === null ? (r.spent / maxSpent) * 100 : Math.min(100, budgetPct)}%`, background: barColor }} />
                </div>
                <div className="mt-1 flex justify-between gap-2 text-[10.5px] text-[var(--color-text-3)]">
                  <span>
                    {r.budgetLimit ? (
                      <>
                        <span className="num">{budgetPct}%</span> من ميزانية <span className="num">{formatAmount(r.budgetLimit)}</span>
                      </>
                    ) : (
                      'بدون ميزانية'
                    )}
                  </span>
                  {delta !== null && (
                    <span className="num" style={{ color: delta > 0 ? 'var(--color-expense)' : delta < 0 ? 'var(--color-income)' : undefined }}>
                      {delta > 0 ? '▲' : delta < 0 ? '▼' : ''} {Math.abs(delta)}% عن {prevName}
                    </span>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

const WEEK_HEAD = ['سبت', 'أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة']

/** (7) خريطة الإنفاق اليومي: تقويم الشهر بلون واحد يغمق مع زيادة الإنفاق، وجملة لأعلى يوم أسبوع. */
export function SpendingCalendar({
  monthValue,
  daily,
  elapsedDays,
  busiest,
}: {
  monthValue: string
  daily: number[]
  elapsedDays: number
  busiest: { label: string; avg: number } | null
}) {
  const [picked, setPicked] = useState<number | null>(null)
  const [y, m] = monthValue.split('-').map(Number)
  // السبت أول عمود: getDay() للسبت = 6 → 0.
  const startCol = (new Date(y, m - 1, 1).getDay() + 1) % 7
  const max = Math.max(1, ...daily)
  const monthLabel = MONTHS_AR[m - 1]
  const cells: ReactNode[] = []
  for (let i = 0; i < startCol; i++) cells.push(<span key={`e${i}`} />)
  daily.forEach((v, idx) => {
    const day = idx + 1
    const future = day > elapsedDays
    const isToday = day === elapsedDays && elapsedDays < daily.length
    const alpha = future ? 0 : v === 0 ? 0.05 : 0.12 + 0.73 * (v / max)
    cells.push(
      <button
        key={day}
        disabled={future}
        onClick={() => setPicked((p) => (p === day ? null : day))}
        aria-label={`${day} ${monthLabel}: ${v ? `${formatAmount(v)} ر.س` : 'لا مصاريف'}`}
        className="num flex aspect-square items-center justify-center rounded-[9px] text-[10px]"
        style={{
          background: future ? 'rgba(255,255,255,0.02)' : `rgba(255,95,109,${alpha.toFixed(2)})`,
          color: future ? 'var(--color-text-3)' : 'var(--color-text-2)',
          opacity: future ? 0.5 : 1,
          boxShadow: picked === day ? '0 0 0 1.5px var(--color-text)' : isToday ? '0 0 0 1.5px var(--color-accent)' : undefined,
        }}
      >
        {day}
      </button>,
    )
  })

  return (
    <div className="qb-card p-4">
      <div className="mb-1.5 grid grid-cols-7 gap-[5px] text-center text-[9.5px] text-[var(--color-text-3)]">
        {WEEK_HEAD.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-[5px]">{cells}</div>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <span className="text-[11.5px] text-[var(--color-text-2)]">
          {picked !== null ? (
            <>
              <span className="num">{picked}</span> {monthLabel}: <b className="num text-[var(--color-text)]">{daily[picked - 1] ? `${formatAmount(daily[picked - 1])} ر.س` : 'لا مصاريف'}</b>
            </>
          ) : (
            'اضغط أي يوم لرؤية مصروفه'
          )}
        </span>
        <span className="flex items-center gap-1 text-[10px] text-[var(--color-text-3)]">
          أقل
          {[0.12, 0.3, 0.55, 0.85].map((a) => (
            <span key={a} className="rounded-[3px]" style={{ width: 13, height: 9, background: `rgba(255,95,109,${a})` }} />
          ))}
          أكثر
        </span>
      </div>
      {busiest && (
        <div className="mt-3 flex items-center gap-2 border-t border-[var(--color-border)] pt-3 text-[12px] text-[var(--color-text-2)]">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
          <span>
            أعلى إنفاقك يوم <b className="text-[var(--color-text)]">{busiest.label}</b> — متوسط <b className="num text-[var(--color-text)]">{formatAmount(busiest.avg)}</b> ر.س
          </span>
        </div>
      )}
    </div>
  )
}

const NOTE_STYLE: Record<MonthNote['kind'], { color: string; path: string }> = {
  up: { color: 'var(--color-expense)', path: 'M7 17 17 7M9 7h8v8' },
  down: { color: 'var(--color-income)', path: 'M17 17 7 7M7 15V7h8' },
  warn: { color: 'var(--color-subscription)', path: 'M12 3 2.5 20h19L12 3ZM12 10v4.5M12 17.3h.01' },
  ok: { color: 'var(--color-income)', path: 'M5 12.5 10 17l9-10' },
}

/** (8) ملاحظات الشهر المكتوبة تلقائيًا. */
export function MonthNotes({ notes }: { notes: MonthNote[] }) {
  return (
    <div className="flex flex-col gap-2">
      {notes.map((n) => {
        const st = NOTE_STYLE[n.kind]
        return (
          <div key={n.id} className="flex items-start gap-3 rounded-[20px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-3">
            <span className="flex flex-shrink-0 items-center justify-center" style={{ width: 34, height: 34, borderRadius: 12, background: soft(st.color, 12), color: st.color }}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={st.path} />
              </svg>
            </span>
            <div className="min-w-0">
              <div className="text-[13px] font-semibold leading-relaxed">{n.title}</div>
              <div className="num mt-0.5 text-[11px] text-[var(--color-text-3)]">{n.detail}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
