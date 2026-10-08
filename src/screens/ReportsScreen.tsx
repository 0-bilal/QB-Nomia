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
} from '../lib/reportData'
import { busiestWeekday, categorySpendForMonth, dailyExpenseForMonth, monthIncomeExpense, monthName, monthNotes, pctChange, shiftMonth } from '../lib/reportInsights'
import { CategoryDonut, FlowChart, MonthNotes, MonthSummary, MonthSwitcher, SpendingCalendar } from '../components/ReportSections'
import { colorFor } from '../components/Avatar'
import { HeroCard, HeroLabel, IconBubble, ListGroup, ListItem, RingProgress, SectionTitle } from '../components/ui'
import { rise } from '../lib/motion'

function healthLabel(score: number): { text: string; color: string } {
  if (score >= 80) return { text: 'ممتازة', color: 'var(--color-income)' }
  if (score >= 50) return { text: 'جيدة', color: 'var(--color-subscription)' }
  return { text: 'تحتاج تحسين', color: 'var(--color-expense)' }
}

const UPCOMING_WINDOW_DAYS = 30

export function ReportsScreen() {
  const navigate = useNavigate()
  const { transactions, categories, incomeSources, accounts, loanTransactions, zakatPayments, subscriptions, commitments, recurringTransactions, totalMonthlySubscriptions, monthlyBudgetLimit } = useData()
  const [monthValue, setMonthValue] = useState(currentMonthValue())

  const { startISO, endISO, label: periodLabel } = monthRange(monthValue)
  const monthTxns = useMemo(() => transactions.filter((t) => t.date >= startISO && t.date < endISO), [transactions, startISO, endISO])
  const income = monthTxns.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expense = monthTxns.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const net = income - expense

  const thisMonth = currentMonthValue()
  const isCurrentMonth = monthValue === thisMonth
  const prevMonth = shiftMonth(monthValue, -1)
  const prevName = monthName(prevMonth)
  const prevTotals = useMemo(() => monthIncomeExpense(prevMonth, transactions), [prevMonth, transactions])
  const prevCategorySpend = useMemo(() => categorySpendForMonth(prevMonth, transactions), [prevMonth, transactions])
  const daily = useMemo(() => dailyExpenseForMonth(monthValue, transactions), [monthValue, transactions])
  const elapsedDays = isCurrentMonth ? new Date().getDate() : daily.length
  const busiest = useMemo(() => busiestWeekday(monthValue, daily, elapsedDays), [monthValue, daily, elapsedDays])
  const notes = useMemo(
    () => monthNotes({ monthValue, transactions, categories, monthlyBudgetLimit, today: new Date() }),
    [monthValue, transactions, categories, monthlyBudgetLimit],
  )

  const score = income > 0
    ? Math.round(Math.max(0, Math.min(1, net / income)) * 70 + Math.max(0, Math.min(1, 1 - totalMonthlySubscriptions / income)) * 30)
    : null

  const trend = useMemo(() => monthlyTrendEndingAt(monthValue, transactions, 6), [monthValue, transactions])
  const [flowPick, setFlowPick] = useState<{ month: string; index: number } | null>(null)
  // الشهر المختار بالرسم يرجع لآخر شهر عند تغيير الشهر من الشريط العلوي.
  const flowSelected = flowPick && flowPick.month === monthValue ? flowPick.index : trend.length - 1

  const netWorth = useMemo(() => netWorthTrendEndingAt(monthValue, accounts, transactions, loanTransactions, zakatPayments, 6), [monthValue, accounts, transactions, loanTransactions, zakatPayments])
  const netWorthMin = Math.min(...netWorth.map((p) => p.total))
  const netWorthMax = Math.max(...netWorth.map((p) => p.total))
  const netWorthRange = Math.max(1, netWorthMax - netWorthMin)

  const categoryBreakdown = useMemo(() => categoryBreakdownForMonth(monthValue, transactions, categories), [monthValue, transactions, categories])
  const incomeBreakdown = useMemo(() => incomeBreakdownForMonth(monthValue, transactions, incomeSources), [monthValue, transactions, incomeSources])
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
      <MonthSwitcher
        label={periodLabel}
        sub={isCurrentMonth ? `حتى اليوم · مقارنة بـ${prevName}` : `مقارنة بـ${prevName}`}
        onPrev={() => setMonthValue(shiftMonth(monthValue, -1))}
        onNext={() => setMonthValue(shiftMonth(monthValue, 1))}
        nextDisabled={monthValue >= thisMonth}
      />

      <div className="mb-4 mt-5">
        <MonthSummary
          income={income}
          expense={expense}
          prevIncome={prevTotals.income}
          prevExpense={prevTotals.expense}
          prevName={prevName}
          pctChange={pctChange}
        />
      </div>

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


      <SectionTitle title="الدخل والمصروف" hint="اضغط أي شهر" />
      <div className="qb-rise mb-6" style={rise(2)}>
        <FlowChart trend={trend} selected={flowSelected} onSelect={(index) => setFlowPick({ month: monthValue, index })} />
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

      <SectionTitle title="المصاريف حسب الفئة" hint={`مقارنة بـ${prevName}`} />
      {categoryBreakdown.length === 0 ? (
        <div className="qb-card mb-6 px-6 py-10 text-center text-[13px] text-[var(--color-text-3)]">لا توجد مصاريف مسجّلة بهذا الشهر</div>
      ) : (
        <div className="mb-6">
          <CategoryDonut rows={categoryBreakdown} prevSpend={prevCategorySpend} prevName={prevName} onOpen={() => navigate('/categories')} />
        </div>
      )}

      {expense > 0 && (
        <>
          <SectionTitle title="خريطة الإنفاق اليومي" hint={monthName(monthValue)} />
          <div className="mb-6">
            <SpendingCalendar monthValue={monthValue} daily={daily} elapsedDays={elapsedDays} busiest={busiest} />
          </div>
        </>
      )}

      {notes.length > 0 && (
        <>
          <SectionTitle title="ملاحظات الشهر" />
          <div className="mb-6">
            <MonthNotes notes={notes} />
          </div>
        </>
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
