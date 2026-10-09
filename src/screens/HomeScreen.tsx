import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData, SALARY_INCOME_SOURCE_ID } from '../state/DataContext'
import { formatAmount, formatMoney, formatDate } from '../lib/format'
import { activityEditPath } from '../lib/activityNav'
import { NotificationBellButton, NotificationsSheet } from '../components/NotificationsSheet'
import { AccountCardStack, CARD_HEIGHT } from '../components/AccountCardStack'
import { EyeToggleButton } from '../components/EyeToggleButton'
import { HomeGreeting, OccasionCard } from '../components/HomeGreeting'
import { useProfile } from '../hooks/useProfile'
import { greetingSubline } from '../lib/greeting'
import { currentOccasion, recordOpenAndGetPrevious } from '../lib/profile'
import { BigAmount } from '../components/BigAmount'
import { BalanceChart } from '../components/BalanceChart'
import { balanceSeries } from '../lib/balanceHistory'
import { MONTHS_AR } from '../lib/txFilters'
import { TotalAccountsSheet } from '../components/TotalAccountsSheet'
import { FloatingHeaderRow, FLOATING_ROW_OFFSET } from '../components/TabHeader'
import { useScrolledPast } from '../hooks/useScrolledPast'
import { QuickSyncButton } from '../components/QuickSyncButton'
import { BalanceCapsule, GroupedActivity, InsightsStrip, UpcomingList, type Insight } from '../components/HomeSections'
import { localIso, upcomingItems } from '../lib/homeFeed'
import { useActivitySwipe } from '../hooks/useActivitySwipe'
import { getHideBalancesDefault } from '../lib/privacy'
import { daysInMonth, MIN_DAYS_ELAPSED_FOR_PROJECTION, projectedMonthEndPct } from '../lib/budgetPace'

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15,6 9,12 15,18" />
    </svg>
  )
}
function ArrowDownIcon() {
  return (
    <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 7l10 10M17 9v8H9" />
    </svg>
  )
}
function ArrowUpIcon() {
  return (
    <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 17 7 7M7 15V7h8" />
    </svg>
  )
}
function SwapIcon() {
  return (
    <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 3l4 4-4 4M20 7H8M8 21l-4-4 4-4M4 17h12" />
    </svg>
  )
}
function ListIcon() {
  return (
    <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 6h11M9 12h11M9 18h11" />
      <circle cx="4.5" cy="6" r="1" fill="currentColor" />
      <circle cx="4.5" cy="12" r="1" fill="currentColor" />
      <circle cx="4.5" cy="18" r="1" fill="currentColor" />
    </svg>
  )
}
function SubscriptionIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="8,6 18,12 8,18" />
    </svg>
  )
}
function CommitmentIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="18" rx="2.5" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  )
}
function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 2.5 20h19L12 3Z" />
      <path d="M12 10v4.5" />
      <circle cx="12" cy="17.3" r="0.6" fill="currentColor" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  )
}
function StoreIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9.5 5.5 4h13L20 9.5" />
      <path d="M4 9.5h16" />
      <path d="M5.5 13v7h13v-7" />
    </svg>
  )
}

const CHART_DAYS_KEY = 'qbnomia.home.chartDays'
const CHART_PERIODS: [number, string, string][] = [
  [7, 'أسبوع', 'آخر 7 أيام'],
  [30, 'شهر', 'آخر 30 يوم'],
  [90, '3 أشهر', 'آخر 3 أشهر'],
  [365, 'سنة', 'آخر سنة'],
]

/** ترتيب ظهور متتابع (stagger) لكتل الشاشة. */
function rise(i: number): CSSProperties {
  return { '--i': i } as CSSProperties
}

function QuickAction({ label, icon, onClick, primary = false, color }: { label: string; icon: ReactNode; onClick: () => void; primary?: boolean; color?: string }) {
  return (
    <button onClick={onClick} className="qb-press flex flex-1 flex-col items-center gap-2">
      <span
        className="flex h-[58px] w-[58px] items-center justify-center rounded-[22px] border"
        style={
          primary
            ? { background: 'var(--color-accent)', borderColor: 'transparent', color: 'var(--color-on-accent)', boxShadow: '0 14px 30px -14px rgba(255,255,255,0.35)' }
            : { background: 'var(--color-surface)', borderColor: 'var(--color-border)', color }
        }
      >
        {icon}
      </span>
      <span className="text-[11.5px] font-medium text-[var(--color-text-2)]">{label}</span>
    </button>
  )
}

function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="mb-3 flex items-center justify-between px-1">
      <div className="qb-section-title">{title}</div>
      {action && (
        <button onClick={onAction} className="qb-press flex items-center gap-0.5 text-[12px] font-medium text-[var(--color-accent)]">
          {action}
          <ChevronIcon />
        </button>
      )}
    </div>
  )
}

export function HomeScreen() {
  const {
    accounts,
    homeTotalBalance,
    totalMonthlySubscriptions,
    commitments,
    notifications,
    recentActivity,
    categories,
    categorySpentThisMonth,
    monthTotals,
    subscriptions,
    recurringTransactions,
    monthlyBudgetLimit,
    storeDebts,
    storeDebtPayments,
    transactions,
  } = useData()
  const profile = useProfile()
  // وقت آخر فتح قبل هذه الجلسة — لبطاقة "الرجوع بعد غياب" (يُقرأ مرة لكل تركيب).
  const [prevOpenAt] = useState(() => recordOpenAndGetPrevious())
  const [chartDays, setChartDays] = useState<number>(() => {
    const v = Number(localStorage.getItem(CHART_DAYS_KEY))
    return CHART_PERIODS.some((p) => p[0] === v) ? v : 30
  })
  const [scrubIndex, setScrubIndex] = useState<number | null>(null)
  const navigate = useNavigate()
  const swipeFor = useActivitySwipe()
  const [hidden, setHidden] = useState(getHideBalancesDefault)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [totalSheetOpen, setTotalSheetOpen] = useState(false)
  const [greetingRef, greetingPast] = useScrolledPast<HTMLDivElement>(FLOATING_ROW_OFFSET)
  // نهاية قسم الرصيد — بعد تمريره تظهر كبسولة الرصيد تحت صف الأزرار.
  const [balanceEndRef, balancePast] = useScrolledPast<HTMLDivElement>(100)
  const mask = (s: string) => (hidden ? '•••••' : s)

  const homeAccounts = accounts.filter((a) => a.showOnHome !== false)
  const includedCount = accounts.filter((a) => a.includeInTotal !== false).length

  const activity = recentActivity(8)
  const { income: monthIncome, expense: monthExpense } = monthTotals()
  const monthNet = monthIncome - monthExpense
  const flowTotal = monthIncome + monthExpense

  const topCategories = categories
    .filter((c) => c.kind === 'expense')
    .map((c) => ({ ...c, spent: categorySpentThisMonth(c.id) }))
    .filter((c) => c.spent > 0)
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 5)
  const maxCategorySpent = topCategories[0]?.spent ?? 0

  const activeCommitments = commitments.filter((c) => c.status === 'active')

  const now = new Date()
  const daysElapsedInMonth = now.getDate()
  const totalDaysInMonth = daysInMonth(now)

  // الترحيب: مصروف اليوم، وميزانية اليوم (المتبقي من ميزانية الشهر ÷ الأيام الباقية)، ونزول الراتب اليوم.
  const todayIso = localIso(now)
  const todaySpent = transactions.filter((x) => x.type === 'expense' && x.date === todayIso).reduce((s, x) => s + x.amount, 0)
  const monthBudgetLeft = monthlyBudgetLimit ? monthlyBudgetLimit - monthExpense : null
  const dailyBudget = monthBudgetLeft !== null ? Math.max(0, Math.round((monthBudgetLeft + todaySpent) / (totalDaysInMonth - daysElapsedInMonth + 1))) : null
  const salaryToday = transactions.some((x) => x.type === 'income' && x.incomeSourceId === SALARY_INCOME_SOURCE_ID && x.date === todayIso)
  // منحنى الرصيد خلف الإجمالي: رصيد نهاية كل يوم لفترة مختارة، والتمرير عليه يعرض رصيد يوم معيّن.
  const chartSeries = useMemo(() => {
    const included = new Set(accounts.filter((a) => a.includeInTotal !== false).map((a) => a.id))
    return balanceSeries(recentActivity(1000000), included, homeTotalBalance, chartDays, new Date())
  }, [accounts, recentActivity, homeTotalBalance, chartDays])
  const chartValues = useMemo(() => chartSeries.map((p) => p.balance), [chartSeries])
  const scrubPoint = scrubIndex !== null ? chartSeries[scrubIndex] : null
  const periodChange = chartValues.length > 1 ? chartValues[chartValues.length - 1] - chartValues[0] : 0
  const changePct = chartValues.length > 1 && chartValues[0] > 0 ? (periodChange / chartValues[0]) * 100 : null
  const shownChange = scrubPoint ? scrubPoint.balance - chartValues[0] : periodChange
  const hour = now.getHours()
  const occasion = currentOccasion(profile, now, { salaryToday, prevOpenAt })

  const budgetAlerts = categories
    .filter((c) => c.kind === 'expense' && c.budgetLimit)
    .map((c) => {
      const spent = categorySpentThisMonth(c.id)
      const limit = c.budgetLimit ?? 1
      const pct = (spent / limit) * 100
      const projectedPct =
        daysElapsedInMonth >= MIN_DAYS_ELAPSED_FOR_PROJECTION ? projectedMonthEndPct(spent, limit, daysElapsedInMonth, totalDaysInMonth) : pct
      return { ...c, spent, pct, projectedPct }
    })
    .filter((c) => c.pct >= 80 || c.projectedPct >= 100)
    .sort((a, b) => Math.max(b.pct, b.projectedPct) - Math.max(a.pct, a.projectedPct))

  const today = localIso(now)
  const upcoming = upcomingItems(subscriptions, commitments, recurringTransactions, today, 14).slice(0, 4)

  /** "يحتاج انتباهك": الميزانيات، المسموح يوميًا من السقف، اشتراكات تتجدد خلال يومين، وديون متاجر متأخرة. */
  const insights: Insight[] = []
  for (const c of budgetAlerts.slice(0, 3)) {
    const isProjectedOnly = c.pct < 80 && c.projectedPct >= 100
    const over = c.pct >= 100
    insights.push({
      id: `b-${c.id}`,
      color: over || isProjectedOnly ? 'var(--color-expense)' : 'var(--color-subscription)',
      icon: <AlertIcon />,
      title: over ? `تجاوزت ميزانية «${c.name}»` : c.pct >= 80 ? `قاربت ميزانية «${c.name}»` : `بمعدلك ستتجاوز «${c.name}»`,
      desc: (
        <>
          <span className="num">{mask(formatAmount(c.spent))}</span> من <span className="num">{formatAmount(c.budgetLimit ?? 0)}</span> ر.س
          {isProjectedOnly ? <> · المتوقع <span className="num">{Math.round(c.projectedPct)}%</span></> : null}
        </>
      ),
      barPct: c.pct,
      onClick: () => navigate('/categories'),
    })
  }
  if (monthlyBudgetLimit) {
    const daysLeft = totalDaysInMonth - daysElapsedInMonth + 1
    const remaining = monthlyBudgetLimit - monthExpense
    insights.push(
      remaining > 0
        ? {
            id: 'daily',
            color: 'var(--color-income)',
            icon: <ClockIcon />,
            title: (
              <>
                تقدر تصرف <span className="num">{mask(formatAmount(Math.floor(remaining / daysLeft)))}</span> ر.س يوميًا
              </>
            ),
            desc: `لتبقى ضمن سقفك الشهري حتى نهاية الشهر (${daysLeft} يوم)`,
            onClick: () => navigate('/categories'),
          }
        : {
            id: 'daily',
            color: 'var(--color-expense)',
            icon: <AlertIcon />,
            title: 'تجاوزت سقفك الشهري',
            desc: (
              <>
                بفارق <span className="num">{mask(formatAmount(-remaining))}</span> ر.س
              </>
            ),
            onClick: () => navigate('/categories'),
          },
    )
  }
  for (const sub of subscriptions) {
    if (sub.status !== 'active') continue
    const item = upcoming.find((u) => u.id === `s-${sub.id}`)
    if (!item || item.daysLeft > 2) continue
    insights.push({
      id: `s-${sub.id}`,
      color: 'var(--color-subscription)',
      icon: <SubscriptionIcon />,
      title: item.daysLeft < 0 ? `فات موعد تجديد ${sub.name}` : item.daysLeft === 0 ? `${sub.name} يتجدد اليوم` : item.daysLeft === 1 ? `${sub.name} يتجدد غدًا` : `${sub.name} بعد يومين`,
      desc: (
        <>
          <span className="num">{mask(formatAmount(sub.cost))}</span> ر.س · <span className="num">{formatDate(sub.nextRenewalDate)}</span>
        </>
      ),
      onClick: () => navigate('/subscriptions'),
    })
  }
  for (const d of storeDebts) {
    const left = d.amount - storeDebtPayments.filter((p) => p.debtId === d.id).reduce((sum, p) => sum + p.amount, 0)
    if (left <= 0 || !d.dueDate || d.dueDate >= today) continue
    insights.push({
      id: `d-${d.id}`,
      color: 'var(--color-subscription)',
      icon: <StoreIcon />,
      title: `دَين «${d.storeName}» متأخر`,
      desc: (
        <>
          متبقي <span className="num">{mask(formatAmount(left))}</span> ر.س · كان مستحقًا <span className="num">{formatDate(d.dueDate)}</span>
        </>
      ),
      onClick: () => navigate('/loans?tab=stores'),
    })
  }

  return (
    <div dir="rtl" className="px-5 pb-6">
      <FloatingHeaderRow
        title="الرئيسية"
        visible={greetingPast}
        end={
          <>
            <QuickSyncButton />
            <NotificationBellButton notifications={notifications} onClick={() => setNotificationsOpen(true)} />
            <EyeToggleButton hidden={hidden} onToggle={() => setHidden((h) => !h)} />
          </>
        }
      />
      <BalanceCapsule
        visible={balancePast}
        balance={homeTotalBalance}
        net={flowTotal > 0 ? monthNet : 0}
        hidden={hidden}
        onTap={() => greetingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
      />
      <div ref={greetingRef} className="safe-top mb-4 pt-[60px]">
        <HomeGreeting
          profile={profile}
          hour={hour}
          subline={greetingSubline(hour, profile, { todaySpent, dailyBudget, monthBudgetLeft }, mask)}
          onAvatar={() => navigate(profile ? '/profile' : '/welcome')}
        />
        {occasion && (
          <div className="mt-3.5">
            <OccasionCard occasion={occasion} profile={profile} monthBudgetLeft={monthBudgetLeft} mask={mask} onOpen={(to) => navigate(to)} />
          </div>
        )}
      </div>

      <NotificationsSheet open={notificationsOpen} notifications={notifications} onClose={() => setNotificationsOpen(false)} />
      <TotalAccountsSheet open={totalSheetOpen} onClose={() => setTotalSheetOpen(false)} />

      {/* الرصيد الإجمالي — العنصر البطل بالشاشة، فوق منحنى الرصيد (مثل شاشات الأسهم) */}
      <section className="qb-rise relative -mx-5 overflow-hidden px-6 pb-6 pt-3" style={{ ...rise(0), minHeight: 190 }}>
        <BalanceChart values={chartValues} onScrub={setScrubIndex} />
        <div
          className="pointer-events-none absolute inset-0 z-0"
          style={{ background: 'radial-gradient(70% 60% at 85% 45%, rgba(5,5,6,0.55), transparent 75%)' }}
          aria-hidden="true"
        />
        <div className="pointer-events-none relative z-10 [text-shadow:0_2px_14px_rgba(0,0,0,0.85)]">
          {scrubPoint ? (
            <div className="mb-2 flex items-center gap-2 py-1 text-[13px] font-medium text-[var(--color-text-2)]">
              رصيدك في
              <span className="num rounded-full bg-white/[0.07] px-2.5 py-1 text-[11.5px]">
                {Number(scrubPoint.date.slice(8, 10))} {MONTHS_AR[Number(scrubPoint.date.slice(5, 7)) - 1]} {scrubPoint.date.slice(0, 4)}
              </span>
            </div>
          ) : (
            <button
              onClick={() => setTotalSheetOpen(true)}
              className="qb-press pointer-events-auto mb-2 flex items-center gap-2 rounded-full py-1 text-[13px] font-medium text-[var(--color-text-2)]"
              aria-label="اختيار الحسابات المحسوبة بالإجمالي"
            >
              إجمالي رصيدك
              <span className="num inline-flex items-center gap-1 rounded-full bg-white/[0.07] px-2.5 py-1 text-[11.5px] text-[var(--color-text-2)]">
                {includedCount === accounts.length ? `كل الحسابات (${accounts.length})` : `${includedCount} من ${accounts.length} حسابات`}
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6,9 12,15 18,9" />
                </svg>
              </span>
            </button>
          )}
          <BigAmount value={scrubPoint ? scrubPoint.balance : homeTotalBalance} hidden={hidden} size={46} animate={!scrubPoint} />
          {chartValues.length > 1 && (
            <div className="mt-3 flex items-center gap-2">
              <span
                dir="ltr"
                className="num inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-semibold"
                style={{ background: shownChange >= 0 ? 'rgba(62,224,143,0.12)' : 'rgba(255,95,109,0.12)', color: shownChange >= 0 ? 'var(--color-income)' : 'var(--color-expense)' }}
              >
                {shownChange >= 0 ? '▲' : '▼'} {mask(`${formatAmount(Math.abs(shownChange))} ر.س`)}
                {!scrubPoint && changePct !== null && <span className="opacity-80">· {Math.abs(changePct).toFixed(1)}%</span>}
              </span>
              <span className="text-[11.5px] text-[var(--color-text-3)]">{scrubPoint ? 'منذ بداية الفترة' : CHART_PERIODS.find((p) => p[0] === chartDays)?.[2]}</span>
            </div>
          )}
        </div>
      </section>
      <div className="-mt-3 mb-5 flex gap-1 px-1">
        {CHART_PERIODS.map(([d, label]) => (
          <button
            key={d}
            onClick={() => {
              setChartDays(d)
              try {
                localStorage.setItem(CHART_DAYS_KEY, String(d))
              } catch {
                /* تفضيل عرض فقط */
              }
            }}
            className="qb-press rounded-full px-3 py-1.5 text-[11px] font-semibold"
            style={chartDays === d ? { background: 'rgba(255,255,255,0.09)', color: 'var(--color-text)' } : { color: 'var(--color-text-3)' }}
          >
            {label}
          </button>
        ))}
      </div>

      <div ref={balanceEndRef} aria-hidden="true" />

      {/* اختصارات سريعة */}
      <section className="qb-rise mb-6 flex items-start justify-between gap-2" style={rise(1)}>
        <QuickAction primary label="مصروف" icon={<ArrowDownIcon />} onClick={() => navigate('/add/transaction?type=expense')} />
        <QuickAction label="دخل" color="var(--color-income)" icon={<ArrowUpIcon />} onClick={() => navigate('/add/transaction?type=income')} />
        <QuickAction label="تحويل" color="var(--color-transfer)" icon={<SwapIcon />} onClick={() => navigate('/add/transaction?type=transfer')} />
        <QuickAction label="الحركات" color="var(--color-text)" icon={<ListIcon />} onClick={() => navigate('/transactions')} />
      </section>

      <section className="qb-rise" style={rise(2)}>
        <SectionTitle title="بطاقاتك" action="الكل" onAction={() => navigate('/accounts')} />
        {accounts.length > 0 && homeAccounts.length === 0 ? (
          <button
            onClick={() => navigate('/accounts')}
            className="qb-card-elevated qb-press mb-4 flex w-full flex-col items-center justify-center gap-2 p-8 text-center"
            style={{ height: CARD_HEIGHT }}
          >
            <div className="text-[13.5px] font-semibold">كل حساباتك مخفية من الشاشة الرئيسية</div>
            <div className="text-[12px] text-[var(--color-text-3)]">فعّل الظهور لأي حساب من شاشة الحسابات</div>
          </button>
        ) : (
          <AccountCardStack accounts={homeAccounts} hidden={hidden} />
        )}
      </section>

      {insights.length > 0 && (
        <section className="qb-rise mb-5" style={rise(3)}>
          <SectionTitle title="يحتاج انتباهك" />
          <InsightsStrip insights={insights} />
        </section>
      )}

      {/* شبكة Bento — ملخص الشهر */}
      <section className="qb-rise mb-4 grid grid-cols-2 gap-3" style={rise(4)}>
        <div className="qb-card col-span-2 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-[13px] font-medium text-[var(--color-text-2)]">تدفّق هذا الشهر</div>
            <div className="text-[11px] text-[var(--color-text-3)]">دخل مقابل مصروف</div>
          </div>
          <div className="mb-3 flex h-2.5 gap-1 overflow-hidden rounded-full bg-white/[0.04]">
            {flowTotal > 0 && (
              <>
                <div className="h-full rounded-full" style={{ width: `${(monthIncome / flowTotal) * 100}%`, background: 'var(--color-income)', transition: 'width 600ms var(--ease-out-expo)' }} />
                <div className="h-full rounded-full" style={{ width: `${(monthExpense / flowTotal) * 100}%`, background: 'var(--color-expense)', transition: 'width 600ms var(--ease-out-expo)' }} />
              </>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="mb-1 flex items-center gap-1.5 text-[11.5px] text-[var(--color-text-3)]">
                <span className="h-2 w-2 rounded-full bg-[var(--color-income)]" />
                الدخل
              </div>
              <div className="num text-[18px] font-bold" style={{ color: 'var(--color-income)' }}>
                {mask(formatMoney(monthIncome))}
              </div>
            </div>
            <div>
              <div className="mb-1 flex items-center gap-1.5 text-[11.5px] text-[var(--color-text-3)]">
                <span className="h-2 w-2 rounded-full bg-[var(--color-expense)]" />
                المصروف
              </div>
              <div className="num text-[18px] font-bold" style={{ color: 'var(--color-expense)' }}>
                {formatMoney(monthExpense)}
              </div>
            </div>
          </div>
        </div>

        {totalMonthlySubscriptions > 0 && (
          <button onClick={() => navigate('/subscriptions')} className={`qb-card qb-press p-4 text-right ${activeCommitments.length === 0 ? 'col-span-2' : ''}`}>
            <span className="mb-5 flex h-9 w-9 items-center justify-center rounded-full" style={{ background: 'rgba(255,191,71,0.14)', color: 'var(--color-subscription)' }}>
              <SubscriptionIcon />
            </span>
            <div className="mb-0.5 text-[12px] text-[var(--color-text-3)]">الاشتراكات شهريًا</div>
            <div className="num text-[17px] font-bold">{formatMoney(totalMonthlySubscriptions)}</div>
          </button>
        )}
        {activeCommitments.length > 0 && (
          <button onClick={() => navigate('/commitments')} className={`qb-card qb-press p-4 text-right ${totalMonthlySubscriptions <= 0 ? 'col-span-2' : ''}`}>
            <span className="mb-5 flex h-9 w-9 items-center justify-center rounded-full" style={{ background: 'rgba(95,179,255,0.14)', color: 'var(--color-commitment)' }}>
              <CommitmentIcon />
            </span>
            <div className="mb-0.5 text-[12px] text-[var(--color-text-3)]">التزامات نشطة</div>
            <div className="num text-[17px] font-bold">{activeCommitments.length}</div>
          </button>
        )}
      </section>

      {topCategories.length > 0 && (
        <section className="qb-card qb-rise mb-6 p-4" style={rise(5)}>
          <div className="mb-4 flex items-center justify-between">
            <div className="text-[14px] font-semibold">أين ذهبت أموالك</div>
            <button onClick={() => navigate('/categories')} className="qb-press flex items-center gap-0.5 text-[12px] font-medium text-[var(--color-accent)]">
              الفئات
              <ChevronIcon />
            </button>
          </div>
          <div className="flex flex-col gap-3.5">
            {topCategories.map((c, i) => (
              <div key={c.id}>
                <div className="mb-1.5 flex items-center justify-between text-[12.5px]">
                  <div className="font-medium">{c.name}</div>
                  <div className="num font-semibold text-[var(--color-text-2)]">{formatMoney(c.spent)}</div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${maxCategorySpent ? (c.spent / maxCategorySpent) * 100 : 0}%`,
                      background: i === 0 ? 'var(--color-accent)' : `color-mix(in srgb, var(--color-accent) ${70 - i * 12}%, var(--color-surface-high))`,
                      transition: 'width 700ms var(--ease-out-expo)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {upcoming.length > 0 && (
        <section className="qb-rise mb-6" style={rise(6)}>
          <SectionTitle title="القادم خلال 14 يوم" />
          <UpcomingList
            items={upcoming}
            hidden={hidden}
            onOpen={(kind) => navigate(kind === 'subscription' ? '/subscriptions' : kind === 'commitment' ? '/commitments' : '/recurring')}
          />
        </section>
      )}

      <section className="qb-rise" style={rise(7)}>
        <SectionTitle title="آخر الحركات" action={activity.length > 0 ? 'عرض الكل' : undefined} onAction={() => navigate('/transactions')} />

        {activity.length === 0 ? (
          <div className="qb-card flex flex-col items-center gap-3 py-10 text-center">
            <div className="text-[13.5px] text-[var(--color-text-3)]">لا توجد حركات بعد</div>
            <button onClick={() => navigate('/add/transaction')} className="qb-btn-primary px-5 py-2.5 text-[13px]">
              سجّل أول حركة
            </button>
          </div>
        ) : (
          <>
            <GroupedActivity
              items={activity}
              categories={categories}
              today={today}
              hidden={hidden}
              swipeFor={swipeFor}
              onOpen={(item) => navigate(activityEditPath(item))}
            />
            <div className="mt-2.5 text-center text-[11px] text-[var(--color-text-3)]">اسحب الحركة يسارًا للحذف · يمينًا لتكرارها</div>
          </>
        )}
      </section>
    </div>
  )
}
