import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../state/DataContext'
import { ScreenScroll } from '../components/ScreenScroll'
import { ScreenHeader } from '../components/ScreenHeader'
import { formatMoney, formatDate } from '../lib/format'
import {
  avgTransactionByCategoryForMonth,
  categoryBreakdownForMonth,
  currentMonthValue,
  incomeBreakdownForMonth,
  monthlyTrendEndingAt,
  monthRange,
  netWorthTrendEndingAt,
  upcomingObligations,
  weekdaySpendingForMonth,
} from '../lib/reportData'

function healthLabel(score: number): { text: string; color: string } {
  if (score >= 80) return { text: 'ممتازة', color: 'var(--color-income)' }
  if (score >= 50) return { text: 'جيدة', color: 'var(--color-subscription)' }
  return { text: 'تحتاج تحسين', color: 'var(--color-expense)' }
}

const UPCOMING_WINDOW_DAYS = 30

export function ReportsScreen() {
  const navigate = useNavigate()
  const { transactions, categories, incomeSources, accounts, loanTransactions, zakatPayments, subscriptions, commitments, recurringTransactions, totalMonthlySubscriptions } = useData()
  const [monthValue, setMonthValue] = useState(currentMonthValue())

  const { startISO, endISO, label: periodLabel } = monthRange(monthValue)
  const monthTxns = useMemo(() => transactions.filter((t) => t.date >= startISO && t.date < endISO), [transactions, startISO, endISO])
  const income = monthTxns.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expense = monthTxns.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const net = income - expense
  const savingsRate = income > 0 ? Math.round((net / income) * 100) : null

  const score = income > 0
    ? Math.round(Math.max(0, Math.min(1, net / income)) * 70 + Math.max(0, Math.min(1, 1 - totalMonthlySubscriptions / income)) * 30)
    : null

  const trend = useMemo(() => monthlyTrendEndingAt(monthValue, transactions, 6), [monthValue, transactions])
  const maxTrendValue = Math.max(1, ...trend.flatMap((m) => [m.income, m.expense]))

  const netWorth = useMemo(() => netWorthTrendEndingAt(monthValue, accounts, transactions, loanTransactions, zakatPayments, 6), [monthValue, accounts, transactions, loanTransactions, zakatPayments])
  const netWorthMin = Math.min(...netWorth.map((p) => p.total))
  const netWorthMax = Math.max(...netWorth.map((p) => p.total))
  const netWorthRange = Math.max(1, netWorthMax - netWorthMin)

  const categoryBreakdown = useMemo(() => categoryBreakdownForMonth(monthValue, transactions, categories), [monthValue, transactions, categories])
  const incomeBreakdown = useMemo(() => incomeBreakdownForMonth(monthValue, transactions, incomeSources), [monthValue, transactions, incomeSources])
  const weekdaySpending = useMemo(() => weekdaySpendingForMonth(monthValue, transactions), [monthValue, transactions])
  const maxWeekday = Math.max(1, ...weekdaySpending.map((w) => w.total))
  const avgByCategory = useMemo(() => avgTransactionByCategoryForMonth(monthValue, transactions, categories), [monthValue, transactions, categories])
  const upcoming = useMemo(
    () => upcomingObligations(subscriptions, commitments, recurringTransactions, UPCOMING_WINDOW_DAYS),
    [subscriptions, commitments, recurringTransactions],
  )

  return (
    <ScreenScroll header={<ScreenHeader title="التقارير" onBack={() => navigate(-1)} className="pt-8 pb-6" />}>
      <input
        type="month"
        value={monthValue}
        onChange={(e) => setMonthValue(e.target.value)}
        className="num mb-4 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[14px] outline-none"
        style={{ colorScheme: 'dark' }}
      />

      <div className="qb-card-elevated mb-4 p-5">
        <div className="mb-1.5 text-[12.5px] text-[var(--color-text-2)]">مؤشر الصحة المالية — {periodLabel}</div>
        {score === null ? (
          <div className="text-[13px] text-[var(--color-text-3)]">سجّل دخلك هذا الشهر لعرض المؤشر</div>
        ) : (
          <>
            <div className="flex items-end gap-2">
              <div className="num text-[40px] font-bold leading-none" style={{ color: healthLabel(score).color }}>
                {score}
              </div>
              <div className="mb-1 text-[13px] text-[var(--color-text-3)]">/ 100</div>
            </div>
            <div className="mt-1 text-[13px] font-semibold" style={{ color: healthLabel(score).color }}>
              {healthLabel(score).text}
            </div>
            <div className="mt-2 text-[11px] leading-relaxed text-[var(--color-text-3)]">
              يعتمد على نسبة ادخارك من دخلك بهذا الشهر (70%) وخفّة عبء اشتراكاتك الشهرية الحالية من دخله (30%)
            </div>
          </>
        )}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2.5">
        <div className="qb-card p-3.5">
          <div className="mb-1.5 text-[11.5px] text-[var(--color-text-2)]">دخل الشهر</div>
          <div className="num text-[16px] font-bold" style={{ color: 'var(--color-income)' }}>
            {formatMoney(income)}
          </div>
        </div>
        <div className="qb-card p-3.5">
          <div className="mb-1.5 text-[11.5px] text-[var(--color-text-2)]">مصروف الشهر</div>
          <div className="num text-[16px] font-bold" style={{ color: 'var(--color-expense)' }}>
            {formatMoney(expense)}
          </div>
        </div>
        <div className="qb-card p-3.5">
          <div className="mb-1.5 text-[11.5px] text-[var(--color-text-2)]">صافي التوفير</div>
          <div className="num text-[16px] font-bold" style={{ color: net >= 0 ? 'var(--color-accent)' : 'var(--color-expense)' }}>
            {formatMoney(net)}
          </div>
        </div>
        <div className="qb-card p-3.5">
          <div className="mb-1.5 text-[11.5px] text-[var(--color-text-2)]">نسبة الادخار</div>
          <div className="num text-[16px] font-bold" style={{ color: 'var(--color-accent)' }}>
            {savingsRate === null ? '—' : `${savingsRate}%`}
          </div>
        </div>
      </div>

      <div className="qb-card mb-4 p-4">
        <div className="qb-section-label mb-3">الدخل والمصروف — آخر 6 أشهر</div>
        <div dir="ltr" className="flex items-end justify-between gap-2" style={{ height: 90 }}>
          {trend.map((m, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex items-end gap-1" style={{ height: 72 }}>
                <div className="w-2.5 rounded-t-full" style={{ height: `${(m.income / maxTrendValue) * 72}px`, background: 'var(--color-income)' }} />
                <div className="w-2.5 rounded-t-full" style={{ height: `${(m.expense / maxTrendValue) * 72}px`, background: 'var(--color-expense)' }} />
              </div>
              <div className="text-[10px] text-[var(--color-text-3)]">{m.label}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-center gap-4 text-[11px] text-[var(--color-text-2)]">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full" style={{ background: 'var(--color-income)' }} />
            دخل
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full" style={{ background: 'var(--color-expense)' }} />
            مصروف
          </div>
        </div>
      </div>

      <div className="qb-card mb-4 p-4">
        <div className="qb-section-label mb-3">صافي الثروة — آخر 6 أشهر</div>
        <div dir="ltr" className="flex items-end justify-between gap-1.5" style={{ height: 70 }}>
          {netWorth.map((p, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t-md"
                style={{ height: `${Math.max(4, ((p.total - netWorthMin) / netWorthRange) * 56)}px`, background: p.total >= 0 ? 'var(--color-transfer)' : 'var(--color-expense)' }}
              />
              <div className="text-[9.5px] text-[var(--color-text-3)]">{p.label}</div>
            </div>
          ))}
        </div>
        <div className="mt-2 text-center text-[11px] text-[var(--color-text-3)]">
          آخر رصيد إجمالي مسجَّل: <span className="num font-semibold text-[var(--color-text-2)]">{formatMoney(netWorth[netWorth.length - 1]?.total ?? 0)}</span>
        </div>
      </div>

      {upcoming.items.length > 0 && (
        <>
          <div className="qb-section-label mb-2">الالتزامات القادمة — خلال {UPCOMING_WINDOW_DAYS} يوم</div>
          <div className="qb-card mb-4 flex flex-col gap-2.5 p-4">
            <div className="mb-1 flex items-baseline justify-between">
              <span className="text-[12px] text-[var(--color-text-3)]">إجمالي مستحق</span>
              <span className="num text-[17px] font-bold" style={{ color: 'var(--color-commitment)' }}>{formatMoney(upcoming.total)}</span>
            </div>
            {upcoming.items.map((it, i) => (
              <div key={i} className="flex items-center justify-between text-[12px]">
                <span className="text-[var(--color-text-2)]">{it.name}</span>
                <span className="flex items-center gap-2">
                  <span className="text-[10.5px] text-[var(--color-text-3)]">{formatDate(it.dueDate)}</span>
                  <span className="num font-semibold">{formatMoney(it.amount)}</span>
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="qb-section-label mb-2">توزيع المصاريف حسب الفئة — {periodLabel}</div>
      {categoryBreakdown.length === 0 ? (
        <div className="qb-card mb-4 py-8 text-center text-[13px] text-[var(--color-text-3)]">لا توجد مصاريف مسجّلة بهذا الشهر</div>
      ) : (
        <div className="qb-card mb-4 flex flex-col gap-3 p-4">
          {categoryBreakdown.map((c) => {
            const overBudget = c.pctOfBudget !== null && c.pctOfBudget >= 100
            const barPct = c.pctOfBudget !== null ? Math.min(100, c.pctOfBudget) : c.pctOfTotal
            return (
              <div key={c.id}>
                <div className="mb-1 flex items-center justify-between text-[12.5px]">
                  <div className="font-semibold">{c.name}</div>
                  <div className="num text-[var(--color-text-2)]">
                    {formatMoney(c.spent)}
                    <span className="text-[var(--color-text-3)]">
                      {c.budgetLimit ? ` · ${c.pctOfBudget}% من ميزانية ${formatMoney(c.budgetLimit)}` : ` · ${c.pctOfTotal}%`}
                    </span>
                  </div>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/6">
                  <div className="h-full rounded-full" style={{ width: `${barPct}%`, background: overBudget ? 'var(--color-expense)' : c.budgetLimit ? 'var(--color-commitment)' : 'var(--color-expense)' }} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {incomeBreakdown.length > 0 && (
        <>
          <div className="qb-section-label mb-2">تفصيل مصادر الدخل — {periodLabel}</div>
          <div className="qb-card mb-4 flex flex-col gap-3 p-4">
            {incomeBreakdown.map((s) => (
              <div key={s.id} className="flex items-center justify-between">
                <div className="min-w-0 flex-1 text-[12.5px] font-semibold">{s.name}</div>
                <div className="num text-[13px] font-bold" style={{ color: 'var(--color-income)' }}>
                  {formatMoney(s.amount)} <span className="text-[11px] font-normal text-[var(--color-text-3)]">· {s.pctOfTotal}%</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {expense > 0 && (
        <>
          <div className="qb-section-label mb-2">الإنفاق حسب يوم الأسبوع — {periodLabel}</div>
          <div className="qb-card mb-4 p-4">
            <div dir="ltr" className="flex items-end justify-between gap-2" style={{ height: 80 }}>
              {weekdaySpending.map((w, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex w-full items-end justify-center" style={{ height: 60 }}>
                    <div className="w-3.5 rounded-t-full" style={{ height: `${(w.total / maxWeekday) * 60}px`, background: 'var(--color-expense)' }} />
                  </div>
                  <div className="text-[9.5px] text-[var(--color-text-3)]">{w.label.slice(0, 3)}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {avgByCategory.length > 0 && (
        <>
          <div className="qb-section-label mb-2">متوسط قيمة الحركة لكل فئة — {periodLabel}</div>
          <div className="qb-card mb-4 flex flex-col gap-3 p-4">
            {avgByCategory.map((c) => (
              <div key={c.name} className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12.5px] font-semibold">{c.name}</div>
                  <div className="text-[10.5px] text-[var(--color-text-3)]">{c.count} حركة</div>
                </div>
                <div className="num text-[13px] font-bold">{formatMoney(c.avg)}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </ScreenScroll>
  )
}
