import { useNavigate } from 'react-router-dom'
import { useData } from '../state/DataContext'
import { formatMoney, formatDate } from '../lib/format'
import { ScreenScroll } from '../components/ScreenScroll'
import { ScreenHeader } from '../components/ScreenHeader'

function GoalIcon() {
  return (
    <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  )
}

function monthsUntil(dateStr: string): number {
  const today = new Date()
  const target = new Date(dateStr)
  const months = (target.getFullYear() - today.getFullYear()) * 12 + (target.getMonth() - today.getMonth())
  return Math.max(1, months)
}

export function GoalsScreen() {
  const { accounts } = useData()
  const navigate = useNavigate()
  const goals = accounts.filter((a) => a.type === 'savings' && a.goalAmount)

  return (
    <ScreenScroll
      header={
        <ScreenHeader
          title="الأهداف"
          onBack={() => navigate(-1)}
          right={
            <button
              onClick={() => navigate('/accounts/new?type=savings')}
              className="qb-press flex h-9.5 w-9.5 items-center justify-center rounded-full border"
              style={{ width: 38, height: 38, background: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.27)', color: 'var(--color-accent)' }}
              aria-label="إضافة هدف"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          }
        />
      }
    >
      {goals.length === 0 ? (
        <div className="qb-card py-10 text-center text-[13px] text-[var(--color-text-3)]">
          لا توجد أهداف ادخار بعد — أضف حساب ادخار وحدد له مبلغ هدف
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {goals.map((a) => {
            const goalAmount = a.goalAmount ?? 0
            const pct = Math.min(100, (a.balance / goalAmount) * 100)
            const remaining = Math.max(0, goalAmount - a.balance)
            const months = a.goalTargetDate ? monthsUntil(a.goalTargetDate) : null
            const monthlyNeeded = months && remaining > 0 ? remaining / months : null
            const reached = a.balance >= goalAmount

            return (
              <button key={a.id} onClick={() => navigate(`/accounts/${a.id}/edit`)} className="qb-card-elevated qb-press block w-full p-4.5 text-right">
                <div className="mb-3 flex items-center gap-3">
                  <div
                    className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[14px]"
                    style={{ width: 44, height: 44, background: 'rgba(245,185,66,0.14)', color: 'var(--color-subscription)' }}
                  >
                    <GoalIcon />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14.5px] font-bold">{a.goalLabel || a.name}</div>
                    <div className="truncate text-[11px] text-[var(--color-text-3)]">{a.name}</div>
                  </div>
                  {reached && (
                    <div className="flex-shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-bold" style={{ background: 'rgba(34,197,94,0.16)', color: 'var(--color-income)' }}>
                      تحقق ✓
                    </div>
                  )}
                </div>

                <div className="num mb-2 flex items-baseline justify-between">
                  <span className="text-[19px] font-bold" style={{ color: 'var(--color-subscription)' }}>
                    {formatMoney(a.balance)}
                  </span>
                  <span className="text-[12px] text-[var(--color-text-3)]">من {formatMoney(goalAmount)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/8">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #F5B942, #F59E0B)' }}
                  />
                </div>
                <div className="mt-1.5 text-[11px] text-[var(--color-text-3)]">{Math.round(pct)}% مكتمل</div>

                {!reached && a.goalTargetDate && (
                  <div className="mt-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3.5 py-2.5">
                    <div className="flex items-center justify-between text-[11.5px]">
                      <span className="text-[var(--color-text-3)]">الهدف بحلول</span>
                      <span className="num font-semibold">{formatDate(a.goalTargetDate)}</span>
                    </div>
                    {monthlyNeeded !== null && (
                      <div className="mt-1 flex items-center justify-between text-[11.5px]">
                        <span className="text-[var(--color-text-3)]">تحتاج تودّع شهريًا</span>
                        <span className="num font-bold" style={{ color: 'var(--color-subscription)' }}>
                          {formatMoney(monthlyNeeded)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}
    </ScreenScroll>
  )
}
