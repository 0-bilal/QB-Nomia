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
import { colorFor } from '../components/Avatar'
import { HeroCard, HeroLabel, IconBubble, ListGroup, ListItem, ProgressBar, RingProgress, SectionTitle, StatTile } from '../components/ui'
import { rise } from '../lib/motion'

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

  // نقاط خط صافي الثروة (SVG) — مقياس من أدنى لأعلى قيمة بنافذة الأشهر الستة.
  const nwW = 300
  const nwH = 90
  const nwPoints = netWorth.map((p, i) => {
    const x = netWorth.length > 1 ? (i / (netWorth.length - 1)) * nwW : nwW / 2
    const y = nwH - 8 - ((p.total - netWorthMin) / netWorthRange) * (nwH - 20)
    return { x, y }
  })
  const nwLine = nwPoints.map((pt, i) => `${i === 0 ? 'M' : 'L'}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' ')
  const nwArea = nwPoints.length ? `${nwLine} L${nwW},${nwH} L0,${nwH} Z` : ''

  return (
    <ScreenScroll header={<ScreenHeader title="التقارير" onBack={() => navigate(-1)} />}>
      <label className="mb-5 flex items-center gap-2.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-[var(--color-text-3)]">
        <span className="flex-shrink-0 text-[12.5px] font-medium">الشهر</span>
        <input
          type="month"
          value={monthValue}
          onChange={(e) => setMonthValue(e.target.value)}
          className="num min-w-0 flex-1 bg-transparent py-3 text-[var(--color-text)] outline-none"
          style={{ colorScheme: 'dark', boxShadow: 'none' }}
        />
      </label>

      <HeroCard className="mb-4">
        {score === null ? (
          <div className="py-4 text-center text-[13px] text-[var(--color-text-3)]">سجّل دخلك بهذا الشهر لعرض مؤشر الصحة المالية</div>
        ) : (
          <div className="flex items-center gap-5">
            <RingProgress pct={score} size={112} stroke={11} color={healthLabel(score).color}>
              <span className="num text-[32px] font-bold leading-none" style={{ color: healthLabel(score).color }}>
                {score}
              </span>
              <span className="mt-1 text-[10px] text-[var(--color-text-3)]">من 100</span>
            </RingProgress>
            <div className="min-w-0 flex-1">
              <HeroLabel>الصحة المالية — {periodLabel}</HeroLabel>
              <div className="text-[20px] font-semibold" style={{ color: healthLabel(score).color }}>
                {healthLabel(score).text}
              </div>
              <div className="mt-1.5 text-[11px] leading-relaxed text-[var(--color-text-3)]">نسبة الادخار (70%) + خفّة عبء الاشتراكات (30%)</div>
            </div>
          </div>
        )}
      </HeroCard>

      <div className="qb-rise mb-6 grid grid-cols-2 gap-3" style={rise(1)}>
        <StatTile label="دخل الشهر" value={formatMoney(income)} color="var(--color-income)" />
        <StatTile label="مصروف الشهر" value={formatMoney(expense)} color="var(--color-expense)" />
        <StatTile label="صافي التوفير" value={formatMoney(net)} color={net >= 0 ? 'var(--color-accent)' : 'var(--color-expense)'} />
        <StatTile label="نسبة الادخار" value={savingsRate === null ? '—' : `${savingsRate}%`} color="var(--color-accent)" />
      </div>

      <SectionTitle title="الدخل والمصروف" hint="آخر 6 أشهر" />
      <div className="qb-card qb-rise mb-6 p-4" style={rise(2)}>
        <div dir="ltr" className="relative flex items-end justify-between gap-2" style={{ height: 130 }}>
          <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-white/[0.06]" />
          <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-white/[0.06]" />
          {trend.map((m, i) => (
            <div key={i} className="relative flex flex-1 flex-col items-center gap-1.5">
              <div className="flex items-end gap-1" style={{ height: 108 }}>
                <div className="w-3 rounded-full" style={{ height: `${Math.max(3, (m.income / maxTrendValue) * 108)}px`, background: 'var(--color-income)', transition: 'height 700ms var(--ease-out-expo)' }} />
                <div className="w-3 rounded-full" style={{ height: `${Math.max(3, (m.expense / maxTrendValue) * 108)}px`, background: 'var(--color-expense)', transition: 'height 700ms var(--ease-out-expo)' }} />
              </div>
              <div className="text-[10px] text-[var(--color-text-3)]">{m.label}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-center gap-5 text-[11.5px] text-[var(--color-text-2)]">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[var(--color-income)]" />
            دخل
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[var(--color-expense)]" />
            مصروف
          </span>
        </div>
      </div>

      <SectionTitle title="صافي الثروة" hint="آخر 6 أشهر" />
      <div className="qb-card qb-rise mb-6 p-4" style={rise(3)}>
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-[12px] text-[var(--color-text-3)]">آخر رصيد إجمالي</span>
          <span className="num text-[18px] font-bold">{formatMoney(netWorth[netWorth.length - 1]?.total ?? 0)}</span>
        </div>
        <svg viewBox={`0 0 ${nwW} ${nwH}`} className="w-full" style={{ height: 96 }} preserveAspectRatio="none">
          <defs>
            <linearGradient id="nw-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-iris)" stopOpacity="0.45" />
              <stop offset="100%" stopColor="var(--color-iris)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {nwArea && <path d={nwArea} fill="url(#nw-fill)" />}
          {nwLine && <path d={nwLine} fill="none" stroke="var(--color-iris)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
        </svg>
        <div dir="ltr" className="mt-1 flex justify-between">
          {netWorth.map((p, i) => (
            <span key={i} className="text-[9.5px] text-[var(--color-text-3)]">
              {p.label}
            </span>
          ))}
        </div>
      </div>

      {upcoming.items.length > 0 && (
        <>
          <SectionTitle title="الالتزامات القادمة" hint={`خلال ${UPCOMING_WINDOW_DAYS} يوم — الإجمالي ${formatMoney(upcoming.total)}`} />
          <ListGroup className="mb-6">
            {upcoming.items.map((it, i) => (
              <ListItem
                key={i}
                divider={i > 0}
                leading={
                  <IconBubble color="var(--color-commitment)" size={38}>
                    <span className="num text-[13px] font-bold">{new Date(it.dueDate).getDate()}</span>
                  </IconBubble>
                }
                title={it.name}
                subtitle={formatDate(it.dueDate)}
                trailing={<span className="num text-[14px] font-bold">{formatMoney(it.amount)}</span>}
              />
            ))}
          </ListGroup>
        </>
      )}

      <SectionTitle title="المصاريف حسب الفئة" hint={periodLabel} />
      {categoryBreakdown.length === 0 ? (
        <div className="qb-card mb-6 px-6 py-10 text-center text-[13px] text-[var(--color-text-3)]">لا توجد مصاريف مسجّلة بهذا الشهر</div>
      ) : (
        <div className="qb-card mb-6 flex flex-col gap-3.5 p-4">
          {categoryBreakdown.map((c) => {
            const overBudget = c.pctOfBudget !== null && c.pctOfBudget >= 100
            const barPct = c.pctOfBudget !== null ? Math.min(100, c.pctOfBudget) : c.pctOfTotal
            return (
              <div key={c.id}>
                <div className="mb-1.5 flex items-center justify-between text-[12.5px]">
                  <div className="flex items-center gap-2 font-medium">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: colorFor(c.name) }} />
                    {c.name}
                  </div>
                  <div className="num font-semibold">{formatMoney(c.spent)}</div>
                </div>
                <ProgressBar pct={barPct} color={overBudget ? 'var(--color-expense)' : colorFor(c.name)} height={6} />
                <div className="mt-1 text-[10.5px] text-[var(--color-text-3)]">
                  {c.budgetLimit ? `${c.pctOfBudget}% من ميزانية ${formatMoney(c.budgetLimit)}` : `${c.pctOfTotal}% من مصروف الشهر`}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {incomeBreakdown.length > 0 && (
        <>
          <SectionTitle title="مصادر الدخل" hint={periodLabel} />
          <ListGroup className="mb-6">
            {incomeBreakdown.map((src, i) => (
              <ListItem
                key={src.id}
                divider={i > 0}
                leading={
                  <IconBubble color={colorFor(src.name)} size={38}>
                    <span style={{ fontWeight: 600 }}>{src.name.trim().charAt(0)}</span>
                  </IconBubble>
                }
                title={src.name}
                subtitle={`${src.pctOfTotal}% من الدخل`}
                trailing={
                  <span className="num text-[14px] font-bold" style={{ color: 'var(--color-income)' }}>
                    {formatMoney(src.amount)}
                  </span>
                }
              />
            ))}
          </ListGroup>
        </>
      )}

      {expense > 0 && (
        <>
          <SectionTitle title="الإنفاق حسب يوم الأسبوع" hint={periodLabel} />
          <div className="qb-card mb-6 p-4">
            <div dir="ltr" className="flex items-end justify-between gap-2" style={{ height: 96 }}>
              {weekdaySpending.map((w, i) => {
                const isMax = w.total === maxWeekday && w.total > 0
                return (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                    <div className="flex w-full items-end justify-center" style={{ height: 74 }}>
                      <div
                        className="w-full max-w-[22px] rounded-full"
                        style={{ height: `${Math.max(4, (w.total / maxWeekday) * 74)}px`, background: isMax ? 'var(--color-accent)' : 'var(--color-surface-high)' }}
                      />
                    </div>
                    <div className="text-[9.5px]" style={{ color: isMax ? 'var(--color-accent)' : 'var(--color-text-3)' }}>
                      {w.label.slice(0, 3)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {avgByCategory.length > 0 && (
        <>
          <SectionTitle title="متوسط قيمة الحركة لكل فئة" hint={periodLabel} />
          <ListGroup className="mb-4">
            {avgByCategory.map((c, i) => (
              <ListItem
                key={c.name}
                divider={i > 0}
                title={c.name}
                subtitle={`${c.count} حركة`}
                trailing={<span className="num text-[14px] font-bold">{formatMoney(c.avg)}</span>}
              />
            ))}
          </ListGroup>
        </>
      )}
    </ScreenScroll>
  )
}
