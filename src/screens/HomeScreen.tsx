import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../state/DataContext'
import { formatMoney, formatSigned, formatDate } from '../lib/format'
import { ActivityIcon } from '../components/ActivityIcon'
import { activityEditPath } from '../lib/activityNav'

function EyeIcon({ hidden }: { hidden: boolean }) {
  if (hidden) {
    return (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3l18 18" />
        <path d="M10.6 5.2A10.4 10.4 0 0 1 12 5c5 0 9 4 10 7-0.4 1.2-1.2 2.6-2.4 3.9M6.5 6.6C4.4 8 2.9 10 2 12c1 3 5 7 10 7 1.4 0 2.7-.3 3.9-.8" />
        <path d="M9.5 10a3 3 0 0 0 4.2 4.2" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12c1-3 5-7 10-7s9 4 10 7c-1 3-5 7-10 7s-9-4-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15,6 9,12 15,18" />
    </svg>
  )
}

function CashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="6" width="19" height="12" rx="2.5" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  )
}
function BankIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10 L12 4 L21 10" />
      <path d="M5 10v9M19 10v9M12 10v9" />
      <path d="M3 19h18" />
    </svg>
  )
}
function SavingsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12a8 8 0 1 1 8 8" />
      <path d="M4 12v5h5" />
      <path d="M12 8v4l3 2" />
    </svg>
  )
}

export function HomeScreen() {
  const { accounts, availableBalance, totalMonthlySubscriptions, recentActivity, categories, categorySpentThisMonth, monthTotals } =
    useData()
  const navigate = useNavigate()
  const [hidden, setHidden] = useState(false)
  const mask = (s: string) => (hidden ? '•••••' : s)

  const cash = accounts.find((a) => a.type === 'cash')?.balance ?? 0
  const bank = accounts.find((a) => a.type === 'bank')?.balance ?? 0
  const savings = accounts.find((a) => a.type === 'savings')?.balance ?? 0

  const activity = recentActivity(6)
  const { income: monthIncome, expense: monthExpense } = monthTotals()

  const topCategories = categories
    .filter((c) => c.kind === 'expense')
    .map((c) => ({ ...c, spent: categorySpentThisMonth(c.id) }))
    .filter((c) => c.spent > 0)
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 5)
  const maxCategorySpent = topCategories[0]?.spent ?? 0

  const budgetAlerts = categories
    .filter((c) => c.kind === 'expense' && c.budgetLimit)
    .map((c) => ({ ...c, spent: categorySpentThisMonth(c.id), pct: (categorySpentThisMonth(c.id) / (c.budgetLimit ?? 1)) * 100 }))
    .filter((c) => c.pct >= 80)
    .sort((a, b) => b.pct - a.pct)

  return (
    <div dir="rtl" className="safe-top px-5 pb-4 pt-14">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <div className="mb-0.5 text-[13px] font-semibold text-[var(--color-text-2)]">مرحبًا بك في QB-Nomia</div>
          <div className="text-xs text-[var(--color-text-3)]">
            {new Date().toLocaleDateString('ar-SA-u-ca-gregory', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </div>
        <button
          onClick={() => setHidden((h) => !h)}
          className="qb-press flex h-9.5 w-9.5 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-2)]"
          style={{ width: 38, height: 38 }}
          aria-label="إخفاء الأرقام"
        >
          <EyeIcon hidden={hidden} />
        </button>
      </div>

      <div className="qb-card-elevated mb-4 p-5.5">
        <div className="relative">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-[9px]"
                style={{ background: 'linear-gradient(150deg, var(--color-accent-a), var(--color-accent-b))' }}
              >
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#0A0A0C" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="6" width="18" height="13" rx="2.5" />
                  <path d="M3 10h18" />
                </svg>
              </div>
              <div className="text-[12.5px] font-semibold text-[var(--color-text-2)]">الرصيد المتاح</div>
            </div>
          </div>
          <div className="num mb-4 text-[36px] font-bold tracking-tight">{mask(formatMoney(availableBalance))}</div>
          <div className="flex gap-2">
            {[
              ['كاش', cash, <CashIcon key="i" />],
              ['بنكي', bank, <BankIcon key="i" />],
              ['ادخار', savings, <SavingsIcon key="i" />],
            ].map(([label, val, icon]) => (
              <div
                key={label as string}
                className="min-w-0 flex-1 rounded-[16px] border border-white/[0.06] bg-white/[0.045] px-3 py-2.5"
              >
                <div className="mb-1.5 flex items-center gap-1.25 text-[var(--color-text-3)]">
                  {icon}
                  <div className="text-[10.5px] font-semibold text-[var(--color-text-2)]">{label}</div>
                </div>
                <div className="num whitespace-nowrap text-[12.5px] font-bold">{mask(formatMoney(val as number))}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {budgetAlerts.length > 0 && (
        <button
          onClick={() => navigate('/categories')}
          className="qb-press mb-4 flex w-full flex-col gap-1.5 rounded-2xl border px-4 py-3 text-right"
          style={{ borderColor: 'rgba(255,92,92,0.3)', background: 'rgba(255,92,92,0.08)' }}
        >
          {budgetAlerts.map((c) => (
            <div key={c.id} className="flex items-center justify-between text-[12px] font-semibold" style={{ color: 'var(--color-expense)' }}>
              <span>{c.pct >= 100 ? `تجاوزت ميزانية "${c.name}"` : `قاربت على تجاوز ميزانية "${c.name}"`}</span>
              <span className="num">{Math.round(c.pct)}%</span>
            </div>
          ))}
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
            {mask(formatMoney(monthExpense))}
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
                  <div className="num font-semibold text-[var(--color-text-2)]">{mask(formatMoney(c.spent))}</div>
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

      {totalMonthlySubscriptions > 0 && (
        <button
          onClick={() => navigate('/subscriptions')}
          className="qb-card qb-press mb-4 flex w-full items-center justify-between px-4 py-3 text-right"
        >
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-[10px]"
              style={{ width: 32, height: 32, background: 'rgba(245,185,66,0.12)', color: 'var(--color-subscription)' }}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="8,6 18,12 8,18" />
              </svg>
            </div>
            <div className="text-[12.5px] font-semibold text-[var(--color-text-2)]">الاشتراكات الشهرية</div>
          </div>
          <div className="num text-[14px] font-bold" style={{ color: 'var(--color-subscription)' }}>
            {mask(formatMoney(totalMonthlySubscriptions))}
          </div>
        </button>
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
                {mask(formatSigned(item.amount))}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
