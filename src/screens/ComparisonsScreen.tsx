import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../state/DataContext'
import { ScreenScroll } from '../components/ScreenScroll'
import { ScreenHeader } from '../components/ScreenHeader'
import { HeroCard, SectionTitle, Segmented } from '../components/ui'
import { rise } from '../lib/motion'
import { formatMoney } from '../lib/format'
import type { Account, IncomeSource, Transaction } from '../types'

type PeriodType = 'month' | 'quarter' | 'year'

const PERIOD_OPTIONS: [PeriodType, string][] = [
  ['month', 'شهري'],
  ['quarter', 'كل 3 أشهر'],
  ['year', 'سنويًا'],
]

interface Range {
  startISO: string
  endISO: string
  label: string
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function monthLabel(d: Date): string {
  return d.toLocaleDateString('ar-SA-u-ca-gregory', { month: 'long', year: 'numeric' })
}

function rangeFor(type: PeriodType, offset: number): Range {
  const now = new Date()
  if (type === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth() - offset, 1)
    const end = new Date(now.getFullYear(), now.getMonth() - offset + 1, 1)
    return { startISO: toISO(start), endISO: toISO(end), label: monthLabel(start) }
  }
  if (type === 'quarter') {
    const currentQ = Math.floor(now.getMonth() / 3)
    const start = new Date(now.getFullYear(), (currentQ - offset) * 3, 1)
    const end = new Date(now.getFullYear(), (currentQ - offset + 1) * 3, 1)
    const qIndex = Math.floor(start.getMonth() / 3) + 1
    return { startISO: toISO(start), endISO: toISO(end), label: `الربع ${qIndex} · ${start.getFullYear()}` }
  }
  const start = new Date(now.getFullYear() - offset, 0, 1)
  const end = new Date(now.getFullYear() - offset + 1, 0, 1)
  return { startISO: toISO(start), endISO: toISO(end), label: `${start.getFullYear()}` }
}

function totalsFor(transactions: Transaction[], range: Range): { income: number; expense: number } {
  const inRange = transactions.filter((t) => t.date >= range.startISO && t.date < range.endISO)
  return {
    income: inRange.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
    expense: inRange.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
  }
}

function categorySpendFor(transactions: Transaction[], range: Range): Map<string, number> {
  const inRange = transactions.filter((t) => t.type === 'expense' && t.date >= range.startISO && t.date < range.endISO)
  const map = new Map<string, number>()
  for (const t of inRange) {
    const key = t.categoryId ?? '—'
    map.set(key, (map.get(key) ?? 0) + t.amount)
  }
  return map
}

function incomeSourceAmountFor(transactions: Transaction[], range: Range): Map<string, number> {
  const inRange = transactions.filter((t) => t.type === 'income' && t.date >= range.startISO && t.date < range.endISO)
  const map = new Map<string, number>()
  for (const t of inRange) {
    const key = t.incomeSourceId ?? '—'
    map.set(key, (map.get(key) ?? 0) + t.amount)
  }
  return map
}

/** صافي أثر حركات الفترة على حساب مُحدَّد — دخل وارد لهذا الحساب + تحويلات واردة - مصروف منه - تحويلات صادرة منه. يعكس نشاط/نمو الحساب خلال الفترة، مو رصيده التاريخي. */
function accountNetMovementFor(transactions: Transaction[], range: Range, accountId: string): number {
  const inRange = transactions.filter((t) => t.date >= range.startISO && t.date < range.endISO && (t.accountId === accountId || t.transferToAccountId === accountId))
  let net = 0
  for (const t of inRange) {
    if (t.accountId === accountId) {
      if (t.type === 'income') net += t.amount
      else net -= t.amount // expense أو تحويل صادر
    } else if (t.transferToAccountId === accountId) {
      net += t.amount
    }
  }
  return net
}

function DeltaBadge({ current, previous, goodWhenUp }: { current: number; previous: number; goodWhenUp: boolean }) {
  if (previous === 0 && current === 0) return null
  const delta = current - previous
  const pct = previous !== 0 ? Math.round((delta / previous) * 100) : 100
  const up = delta > 0
  const flat = delta === 0
  const good = flat ? null : up === goodWhenUp
  const color = flat ? 'var(--color-text-3)' : good ? 'var(--color-income)' : 'var(--color-expense)'
  return (
    <span className="num inline-flex flex-shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 text-[10.5px] font-bold" style={{ color, background: `color-mix(in srgb, ${color} 14%, transparent)` }}>
      {flat ? '=' : up ? '▲' : '▼'} {Math.abs(pct)}%
    </span>
  )
}

function DualBars({ current: cur, previous: prev, color }: { current: number; previous: number; color: string }) {
  const max = Math.max(Math.abs(cur), Math.abs(prev), 1)
  return (
    <div className="mt-2.5 flex flex-col gap-1">
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
        <div className="h-full rounded-full" style={{ width: `${(Math.abs(cur) / max) * 100}%`, background: color, transition: 'width 700ms var(--ease-out-expo)' }} />
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
        <div className="h-full rounded-full bg-white/25" style={{ width: `${(Math.abs(prev) / max) * 100}%`, transition: 'width 700ms var(--ease-out-expo)' }} />
      </div>
    </div>
  )
}

function CompareTile({ label, cur, prev, color, goodWhenUp, format = formatMoney }: { label: string; cur: number | null; prev: number | null; color: string; goodWhenUp?: boolean; format?: (n: number) => string }) {
  return (
    <div className="qb-card p-4">
      <div className="mb-1 flex items-center justify-between gap-1">
        <span className="text-[11.5px] text-[var(--color-text-3)]">{label}</span>
        {goodWhenUp !== undefined && cur !== null && prev !== null && <DeltaBadge current={cur} previous={prev} goodWhenUp={goodWhenUp} />}
      </div>
      <div className="num truncate text-[17px] font-bold" style={{ color }}>
        {cur === null ? '—' : format(cur)}
      </div>
      <div className="num truncate text-[11px] text-[var(--color-text-3)]">سابقًا {prev === null ? '—' : format(prev)}</div>
      {cur !== null && prev !== null && <DualBars current={cur} previous={prev} color={color} />}
    </div>
  )
}

function RowsCard({ rows, color, goodWhenUp }: { rows: { id: string; name: string; current: number; previous: number }[]; color: (v: number) => string; goodWhenUp: boolean }) {
  return (
    <div className="qb-card mb-6 flex flex-col p-4 [&>*+*]:mt-4">
      {rows.map((r) => (
        <div key={r.id}>
          <div className="flex items-center justify-between gap-2">
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{r.name}</span>
            <DeltaBadge current={r.current} previous={r.previous} goodWhenUp={goodWhenUp} />
            <span className="num flex-shrink-0 text-[13.5px] font-bold" style={{ color: color(r.current) }}>
              {formatMoney(r.current)}
            </span>
          </div>
          <DualBars current={r.current} previous={r.previous} color={color(r.current)} />
          <div className="num mt-1 text-[10.5px] text-[var(--color-text-3)]">سابقًا {formatMoney(r.previous)}</div>
        </div>
      ))}
    </div>
  )
}

export function ComparisonsScreen() {
  const navigate = useNavigate()
  const { transactions, categories, incomeSources, accounts } = useData()
  const [periodType, setPeriodType] = useState<PeriodType>('month')

  const current = useMemo(() => rangeFor(periodType, 0), [periodType])
  const previous = useMemo(() => rangeFor(periodType, 1), [periodType])

  const currentTotals = useMemo(() => totalsFor(transactions, current), [transactions, current])
  const previousTotals = useMemo(() => totalsFor(transactions, previous), [transactions, previous])

  const currentNet = currentTotals.income - currentTotals.expense
  const previousNet = previousTotals.income - previousTotals.expense
  const currentSavingsRate = currentTotals.income > 0 ? Math.round((currentNet / currentTotals.income) * 100) : null
  const previousSavingsRate = previousTotals.income > 0 ? Math.round((previousNet / previousTotals.income) * 100) : null

  const currentCatSpend = useMemo(() => categorySpendFor(transactions, current), [transactions, current])
  const previousCatSpend = useMemo(() => categorySpendFor(transactions, previous), [transactions, previous])

  const categoryRows = useMemo(() => {
    const ids = new Set([...currentCatSpend.keys(), ...previousCatSpend.keys()])
    return categories
      .filter((c) => c.kind === 'expense' && ids.has(c.id))
      .map((c) => ({
        id: c.id,
        name: c.name,
        current: currentCatSpend.get(c.id) ?? 0,
        previous: previousCatSpend.get(c.id) ?? 0,
      }))
      .sort((a, b) => b.current - a.current)
  }, [categories, currentCatSpend, previousCatSpend])

  const currentIncomeSrc = useMemo(() => incomeSourceAmountFor(transactions, current), [transactions, current])
  const previousIncomeSrc = useMemo(() => incomeSourceAmountFor(transactions, previous), [transactions, previous])
  const incomeSourceRows = useMemo(() => {
    const ids = new Set([...currentIncomeSrc.keys(), ...previousIncomeSrc.keys()])
    return incomeSources
      .filter((s: IncomeSource) => ids.has(s.id))
      .map((s) => ({ id: s.id, name: s.name, current: currentIncomeSrc.get(s.id) ?? 0, previous: previousIncomeSrc.get(s.id) ?? 0 }))
      .sort((a, b) => b.current - a.current)
  }, [incomeSources, currentIncomeSrc, previousIncomeSrc])

  const accountRows = useMemo(() => {
    return accounts
      .map((a: Account) => ({
        id: a.id,
        name: a.name,
        current: accountNetMovementFor(transactions, current, a.id),
        previous: accountNetMovementFor(transactions, previous, a.id),
      }))
      .filter((r) => r.current !== 0 || r.previous !== 0)
      .sort((a, b) => b.current - a.current)
  }, [accounts, transactions, current, previous])

  return (
    <ScreenScroll header={<ScreenHeader title="المقارنة الشخصية" onBack={() => navigate(-1)} />}>
      <Segmented options={PERIOD_OPTIONS} value={periodType} onChange={setPeriodType} />

      <HeroCard className="mb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] text-[var(--color-text-3)]">الفترة الحالية</div>
            <div className="truncate text-[16px] font-semibold text-[var(--color-accent)]">{current.label}</div>
          </div>
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-[11px] font-semibold text-[var(--color-text-2)]">VS</div>
          <div className="min-w-0 text-left">
            <div className="text-[11px] text-[var(--color-text-3)]">الفترة السابقة</div>
            <div className="truncate text-[16px] font-semibold text-[var(--color-text-2)]">{previous.label}</div>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-center gap-5 text-[11px] text-[var(--color-text-3)]">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-4 rounded-full bg-[var(--color-accent)]" />
            الحالية
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-4 rounded-full bg-white/25" />
            السابقة
          </span>
        </div>
      </HeroCard>

      <div className="qb-rise mb-6 grid grid-cols-2 gap-3" style={rise(1)}>
        <CompareTile label="الدخل" cur={currentTotals.income} prev={previousTotals.income} color="var(--color-income)" goodWhenUp />
        <CompareTile label="المصروف" cur={currentTotals.expense} prev={previousTotals.expense} color="var(--color-expense)" goodWhenUp={false} />
        <CompareTile label="صافي التوفير" cur={currentNet} prev={previousNet} color={currentNet >= 0 ? 'var(--color-accent)' : 'var(--color-expense)'} goodWhenUp />
        <CompareTile label="نسبة الادخار" cur={currentSavingsRate} prev={previousSavingsRate} color="var(--color-accent)" format={(n) => `${n}%`} />
      </div>

      <SectionTitle title="المصاريف حسب الفئة" />
      {categoryRows.length === 0 ? (
        <div className="qb-card mb-6 px-6 py-10 text-center text-[13px] text-[var(--color-text-3)]">لا توجد مصاريف في الفترتين</div>
      ) : (
        <RowsCard rows={categoryRows} color={() => 'var(--color-expense)'} goodWhenUp={false} />
      )}

      {incomeSourceRows.length > 0 && (
        <>
          <SectionTitle title="الدخل حسب المصدر" />
          <RowsCard rows={incomeSourceRows} color={() => 'var(--color-income)'} goodWhenUp />
        </>
      )}

      {accountRows.length > 0 && (
        <>
          <SectionTitle title="نشاط الحسابات" hint="صافي الحركة على كل حساب بالفترة" />
          <RowsCard rows={accountRows} color={(v) => (v >= 0 ? 'var(--color-income)' : 'var(--color-expense)')} goodWhenUp />
        </>
      )}
    </ScreenScroll>
  )
}
