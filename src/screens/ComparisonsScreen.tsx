import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../state/DataContext'
import { ScreenScroll } from '../components/ScreenScroll'
import { ScreenHeader } from '../components/ScreenHeader'
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
    <span className="num inline-flex items-center gap-0.5 text-[11px] font-bold" style={{ color }}>
      {flat ? '=' : up ? '▲' : '▼'} {Math.abs(pct)}%
    </span>
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
    <ScreenScroll header={<ScreenHeader title="المقارنة الشخصية" onBack={() => navigate(-1)} className="pt-8 pb-6" />}>
      <div className="mb-5 flex gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-void)] p-1.25">
        {PERIOD_OPTIONS.map(([t, label]) => (
          <button
            key={t}
            onClick={() => setPeriodType(t)}
            className="qb-press flex-1 rounded-[14px] py-2.5 text-[12.5px] font-bold"
            style={periodType === t ? { background: 'rgba(255,255,255,0.14)', color: 'var(--color-accent)' } : { color: 'var(--color-text-2)' }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex items-center justify-between px-1 text-[11.5px]">
        <div className="font-bold text-[var(--color-text)]">{current.label}</div>
        <div className="text-[var(--color-text-3)]">مقابل {previous.label}</div>
      </div>

      <div className="mb-4 flex flex-col gap-2.5">
        <div className="qb-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[12.5px] font-semibold text-[var(--color-text-2)]">الدخل</div>
            <DeltaBadge current={currentTotals.income} previous={previousTotals.income} goodWhenUp={true} />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="num text-[19px] font-bold" style={{ color: 'var(--color-income)' }}>
              {formatMoney(currentTotals.income)}
            </span>
            <span className="num text-[12px] text-[var(--color-text-3)]">سابقًا {formatMoney(previousTotals.income)}</span>
          </div>
        </div>

        <div className="qb-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[12.5px] font-semibold text-[var(--color-text-2)]">المصروف</div>
            <DeltaBadge current={currentTotals.expense} previous={previousTotals.expense} goodWhenUp={false} />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="num text-[19px] font-bold" style={{ color: 'var(--color-expense)' }}>
              {formatMoney(currentTotals.expense)}
            </span>
            <span className="num text-[12px] text-[var(--color-text-3)]">سابقًا {formatMoney(previousTotals.expense)}</span>
          </div>
        </div>

        <div className="qb-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[12.5px] font-semibold text-[var(--color-text-2)]">صافي التوفير</div>
            <DeltaBadge current={currentNet} previous={previousNet} goodWhenUp={true} />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="num text-[19px] font-bold" style={{ color: currentNet >= 0 ? 'var(--color-accent)' : 'var(--color-expense)' }}>
              {formatMoney(currentNet)}
            </span>
            <span className="num text-[12px] text-[var(--color-text-3)]">سابقًا {formatMoney(previousNet)}</span>
          </div>
        </div>

        <div className="qb-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[12.5px] font-semibold text-[var(--color-text-2)]">نسبة الادخار</div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="num text-[19px] font-bold" style={{ color: 'var(--color-accent)' }}>
              {currentSavingsRate === null ? '—' : `${currentSavingsRate}%`}
            </span>
            <span className="num text-[12px] text-[var(--color-text-3)]">
              سابقًا {previousSavingsRate === null ? '—' : `${previousSavingsRate}%`}
            </span>
          </div>
        </div>
      </div>

      <div className="qb-section-label mb-2">المصاريف حسب الفئة</div>
      {categoryRows.length === 0 ? (
        <div className="qb-card py-8 text-center text-[13px] text-[var(--color-text-3)]">لا توجد مصاريف في الفترتين</div>
      ) : (
        <div className="qb-card flex flex-col gap-3 p-4">
          {categoryRows.map((c) => (
            <div key={c.id} className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12.5px] font-semibold">{c.name}</div>
                <div className="num text-[11px] text-[var(--color-text-3)]">سابقًا {formatMoney(c.previous)}</div>
              </div>
              <div className="flex-shrink-0 text-left">
                <div className="num text-[13px] font-bold">{formatMoney(c.current)}</div>
                <DeltaBadge current={c.current} previous={c.previous} goodWhenUp={false} />
              </div>
            </div>
          ))}
        </div>
      )}

      {incomeSourceRows.length > 0 && (
        <>
          <div className="qb-section-label mb-2 mt-4">الدخل حسب المصدر</div>
          <div className="qb-card flex flex-col gap-3 p-4">
            {incomeSourceRows.map((s) => (
              <div key={s.id} className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12.5px] font-semibold">{s.name}</div>
                  <div className="num text-[11px] text-[var(--color-text-3)]">سابقًا {formatMoney(s.previous)}</div>
                </div>
                <div className="flex-shrink-0 text-left">
                  <div className="num text-[13px] font-bold" style={{ color: 'var(--color-income)' }}>{formatMoney(s.current)}</div>
                  <DeltaBadge current={s.current} previous={s.previous} goodWhenUp={true} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {accountRows.length > 0 && (
        <>
          <div className="qb-section-label mb-2 mt-4">نشاط الحسابات (صافي الحركة بالفترة)</div>
          <div className="qb-card flex flex-col gap-3 p-4">
            {accountRows.map((a) => (
              <div key={a.id} className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12.5px] font-semibold">{a.name}</div>
                  <div className="num text-[11px] text-[var(--color-text-3)]">سابقًا {formatMoney(a.previous)}</div>
                </div>
                <div className="flex-shrink-0 text-left">
                  <div className="num text-[13px] font-bold" style={{ color: a.current >= 0 ? 'var(--color-income)' : 'var(--color-expense)' }}>
                    {formatMoney(a.current)}
                  </div>
                  <DeltaBadge current={a.current} previous={a.previous} goodWhenUp={true} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </ScreenScroll>
  )
}
