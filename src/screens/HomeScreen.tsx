import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../state/DataContext'
import { formatMoney, formatSigned, formatDate } from '../lib/format'
import { ActivityIcon } from '../components/ActivityIcon'
import { activityEditPath } from '../lib/activityNav'
import { NotificationBellButton, NotificationsSheet } from '../components/NotificationsSheet'
import { AccountCardStack } from '../components/AccountCardStack'
import { EyeToggleButton } from '../components/EyeToggleButton'
import { getHideBalancesDefault } from '../lib/privacy'
import { daysInMonth, MIN_DAYS_ELAPSED_FOR_PROJECTION, projectedMonthEndPct } from '../lib/budgetPace'

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15,6 9,12 15,18" />
    </svg>
  )
}

function SubscriptionIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="8,6 18,12 8,18" />
    </svg>
  )
}
function CommitmentIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="18" rx="2.5" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  )
}

export function HomeScreen() {
  const {
    accounts,
    totalMonthlySubscriptions,
    commitments,
    notifications,
    recentActivity,
    categories,
    categorySpentThisMonth,
    monthTotals,
  } = useData()
  const navigate = useNavigate()
  const [hidden, setHidden] = useState(getHideBalancesDefault)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const mask = (s: string) => (hidden ? '•••••' : s)

  const activity = recentActivity(6)
  const { income: monthIncome, expense: monthExpense } = monthTotals()

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

  return (
    <div dir="rtl" className="px-5 pb-4">
      <div className="safe-top qb-glass-bar-top -mx-5 mb-5 flex items-center justify-between px-5 pt-14 pb-3">
        <div>
          <div className="mb-0.5 text-[13px] font-semibold text-[var(--color-text-2)]">مرحبًا بك في QB-Nomia</div>
          <div className="num text-xs text-[var(--color-text-3)]">{formatDate(new Date().toISOString().slice(0, 10))}</div>
        </div>
        <div className="flex items-center gap-2.5">
          <NotificationBellButton notifications={notifications} onClick={() => setNotificationsOpen(true)} />
          <EyeToggleButton hidden={hidden} onToggle={() => setHidden((h) => !h)} />
        </div>
      </div>

      <NotificationsSheet open={notificationsOpen} notifications={notifications} onClose={() => setNotificationsOpen(false)} />

      <AccountCardStack accounts={accounts} hidden={hidden} />

      {budgetAlerts.length > 0 && (
        <button
          onClick={() => navigate('/categories')}
          className="qb-press mb-4 flex w-full flex-col gap-1.5 rounded-2xl border px-4 py-3 text-right"
          style={{ borderColor: 'rgba(255,92,92,0.3)', background: 'rgba(255,92,92,0.08)' }}
        >
          {budgetAlerts.map((c) => {
            const isProjectedOnly = c.pct < 80 && c.projectedPct >= 100
            const label = c.pct >= 100
              ? `تجاوزت ميزانية "${c.name}"`
              : c.pct >= 80
                ? `قاربت على تجاوز ميزانية "${c.name}"`
                : `بمعدلك الحالي راح تتجاوز ميزانية "${c.name}"`
            return (
              <div key={c.id} className="flex items-center justify-between text-[12px] font-semibold" style={{ color: 'var(--color-expense)' }}>
                <span>{label}</span>
                <span className="num">
                  {Math.round(isProjectedOnly ? c.projectedPct : c.pct)}%{isProjectedOnly ? ' متوقع' : ''}
                </span>
              </div>
            )
          })}
        </button>
      )}

      <div className="mb-4 flex gap-2.5">
        <div className="qb-card flex-1 p-3.5">
          <div className="mb-2.5 flex items-center gap-1.5">
            <div
              className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full"
              style={{ background: 'rgba(34,197,94,0.14)' }}
            >
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="var(--color-income)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="6,11 12,5 18,11" />
              </svg>
            </div>
            <div className="text-[11.5px] font-semibold text-[var(--color-text-2)]">دخل الشهر</div>
          </div>
          <div className="num text-[16.5px] font-bold" style={{ color: 'var(--color-income)' }}>
            {mask(formatMoney(monthIncome))}
          </div>
        </div>
        <div className="qb-card flex-1 p-3.5">
          <div className="mb-2.5 flex items-center gap-1.5">
            <div
              className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full"
              style={{ background: 'rgba(255,92,92,0.14)' }}
            >
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="var(--color-expense)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <polyline points="6,13 12,19 18,13" />
              </svg>
            </div>
            <div className="text-[11.5px] font-semibold text-[var(--color-text-2)]">مصروف الشهر</div>
          </div>
          <div className="num text-[16.5px] font-bold" style={{ color: 'var(--color-expense)' }}>
            {formatMoney(monthExpense)}
          </div>
        </div>
      </div>

      {topCategories.length > 0 && (
        <div className="qb-card mb-4 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="qb-section-label">أكثر الفئات إنفاقًا هذا الشهر</div>
            <button
              onClick={() => navigate('/categories')}
              className="qb-press flex items-center gap-0.5 text-[11.5px] font-semibold"
              style={{ color: 'var(--color-accent)' }}
            >
              عرض الكل
              <ChevronIcon />
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {topCategories.map((c) => (
              <div key={c.id}>
                <div className="mb-1 flex items-center justify-between text-[12.5px]">
                  <div className="font-semibold">{c.name}</div>
                  <div className="num font-semibold text-[var(--color-text-2)]">{formatMoney(c.spent)}</div>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/6">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${maxCategorySpent ? (c.spent / maxCategorySpent) * 100 : 0}%`, background: 'var(--color-expense)' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(totalMonthlySubscriptions > 0 || activeCommitments.length > 0) && (
        <div className="mb-4 flex gap-2.5">
          {totalMonthlySubscriptions > 0 && (
            <button onClick={() => navigate('/subscriptions')} className="qb-card qb-press flex-1 p-3.5 text-right">
              <div className="mb-2.5 flex items-center gap-1.5">
                <div
                  className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full"
                  style={{ background: 'rgba(245,185,66,0.14)', color: 'var(--color-subscription)' }}
                >
                  <SubscriptionIcon />
                </div>
                <div className="text-[11.5px] font-semibold text-[var(--color-text-2)]">الاشتراكات</div>
              </div>
              <div className="num text-[15px] font-bold" style={{ color: 'var(--color-subscription)' }}>
                {formatMoney(totalMonthlySubscriptions)}
              </div>
              <div className="mt-0.5 text-[10.5px] text-[var(--color-text-3)]">شهريًا</div>
            </button>
          )}
          {activeCommitments.length > 0 && (
            <button onClick={() => navigate('/commitments')} className="qb-card qb-press flex-1 p-3.5 text-right">
              <div className="mb-2.5 flex items-center gap-1.5">
                <div
                  className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full"
                  style={{ background: 'rgba(96,165,250,0.14)', color: 'var(--color-commitment)' }}
                >
                  <CommitmentIcon />
                </div>
                <div className="text-[11.5px] font-semibold text-[var(--color-text-2)]">الالتزامات</div>
              </div>
              <div className="num text-[15px] font-bold" style={{ color: 'var(--color-commitment)' }}>
                {activeCommitments.length}
              </div>
              <div className="mt-0.5 text-[10.5px] text-[var(--color-text-3)]">نشطة</div>
            </button>
          )}
        </div>
      )}

      <div className="mb-2 flex items-center justify-between">
        <div className="text-[14.5px] font-bold">آخر الحركات</div>
        {activity.length > 0 && (
          <button
            onClick={() => navigate('/transactions')}
            className="qb-press flex items-center gap-0.5 text-[11.5px] font-semibold"
            style={{ color: 'var(--color-accent)' }}
          >
            عرض الكل
            <ChevronIcon />
          </button>
        )}
      </div>

      {activity.length === 0 ? (
        <div className="qb-card py-8 text-center text-[13px] text-[var(--color-text-3)]">لا توجد حركات بعد</div>
      ) : (
        <div className="qb-card overflow-hidden">
          {activity.map((item, i) => (
            <button
              key={item.id}
              onClick={() => navigate(activityEditPath(item))}
              className={`qb-press flex w-full items-center gap-3 px-4 py-3 text-right ${i > 0 ? 'border-t qb-divider' : ''}`}
            >
              <div
                className="flex h-10.5 w-10.5 flex-shrink-0 items-center justify-center rounded-[13px]"
                style={{ width: 42, height: 42, background: `${item.color}1f`, color: item.color }}
              >
                <ActivityIcon kind={item.kind} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-semibold">{item.title}</div>
                <div className="truncate text-[11.5px] text-[var(--color-text-3)]">
                  {item.subtitle} · {formatDate(item.date)}
                </div>
              </div>
              <div className="num flex-shrink-0 text-[13.5px] font-bold" style={{ color: item.color }}>
                {formatSigned(item.amount)}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
