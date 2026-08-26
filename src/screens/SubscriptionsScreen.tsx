import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../state/DataContext'
import { formatMoney } from '../lib/format'
import { ScreenScroll } from '../components/ScreenScroll'
import type { Subscription } from '../types'

function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

function renewalBadge(sub: Subscription) {
  if (sub.status !== 'active') return null
  const days = daysUntil(sub.nextRenewalDate)
  if (days < 0) return { text: 'التجديد متأخر', color: 'var(--color-expense)' }
  if (days === 0) return { text: 'يتجدد اليوم', color: 'var(--color-expense)' }
  if (days <= 3) return { text: `يتجدد خلال ${days} ${days === 1 ? 'يوم' : 'أيام'}`, color: 'var(--color-subscription)' }
  return { text: `التجديد القادم بعد ${days} يوم`, color: 'var(--color-text-3)' }
}

const STATUS_LABEL: Record<Subscription['status'], string> = {
  active: 'نشط',
  paused: 'موقوف',
  cancelled: 'ملغى',
}

export function SubscriptionsScreen() {
  const { subscriptions, totalMonthlySubscriptions, setSubscriptionStatus, logSubscriptionPayment, accounts } =
    useData()
  const navigate = useNavigate()
  const [openId, setOpenId] = useState<string | null>(null)

  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? ''
  const wallets = accounts.filter((a) => a.type === 'wallet')

  return (
    <ScreenScroll
      header={
        <div className="safe-top flex items-center justify-between px-5 pt-8 pb-5">
          <button onClick={() => navigate(-1)} className="text-[13px] text-[var(--color-text-2)]">
            ← رجوع
          </button>
          <div className="text-base font-bold">الاشتراكات</div>
          <button
            onClick={() => navigate('/subscriptions/new')}
            className="flex h-9.5 w-9.5 items-center justify-center rounded-xl border"
            style={{ width: 38, height: 38, background: 'rgba(0,226,138,0.12)', borderColor: 'rgba(0,226,138,0.27)', color: 'var(--color-accent)' }}
            aria-label="إضافة اشتراك"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      }
    >
      <div
        className="mb-4 rounded-3xl border border-[var(--color-border)] p-4.5"
        style={{ background: 'linear-gradient(160deg, #141417 0%, #0E0E10 100%)' }}
      >
        <div className="mb-1.5 text-[12.5px] text-[var(--color-text-2)]">إجمالي الاشتراكات الشهرية</div>
        <div className="num text-[26px] font-bold" style={{ color: 'var(--color-subscription)' }}>
          {formatMoney(totalMonthlySubscriptions)}
        </div>
      </div>

      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[13px] font-bold text-[var(--color-text-2)]">المحافظ الرقمية</div>
          <button
            onClick={() => navigate('/accounts/new?type=wallet')}
            className="text-[11.5px] font-semibold"
            style={{ color: 'var(--color-accent)' }}
          >
            + محفظة جديدة
          </button>
        </div>

        {wallets.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-3.5 text-[12px] leading-relaxed" style={{ borderColor: 'rgba(0,226,138,0.35)', color: 'var(--color-text-2)' }}>
            ما عندك محفظة رقمية بعد. أنشئ محفظة (مثل Google Play)، عبّيها بتحويل من الكاش أو البنكي، وسدد اشتراكاتك منها.
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {wallets.map((w) => (
              <div key={w.id} className="flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <div>
                  <div className="text-[13.5px] font-bold">{w.name}</div>
                  <div className="num mt-0.5 text-[16px] font-bold" style={{ color: 'var(--color-accent)' }}>
                    {formatMoney(w.balance)}
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/add/transaction?type=transfer&to=${w.id}`)}
                  className="rounded-full px-3.5 py-2 text-[12px] font-semibold"
                  style={{ background: 'rgba(0,226,138,0.14)', color: 'var(--color-accent)' }}
                >
                  شحن المحفظة
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mb-2 text-[13px] font-bold text-[var(--color-text-2)]">كل الاشتراكات</div>

      {subscriptions.length === 0 ? (
        <div className="py-10 text-center text-[13px] text-[var(--color-text-3)]">لا توجد اشتراكات بعد</div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {subscriptions.map((sub) => {
            const badge = renewalBadge(sub)
            const open = openId === sub.id
            return (
              <div key={sub.id} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <button
                  onClick={() => setOpenId(open ? null : sub.id)}
                  className="flex w-full items-center gap-3 text-right"
                >
                  <div
                    className="flex h-11.5 w-11.5 flex-shrink-0 items-center justify-center rounded-[14px]"
                    style={{ width: 46, height: 46, background: 'rgba(245,185,66,0.12)', color: 'var(--color-subscription)' }}
                  >
                    <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="8,6 18,12 8,18" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="text-[14px] font-bold">{sub.name}</div>
                      {sub.status !== 'active' && (
                        <div className="rounded-full bg-white/6 px-2 py-0.5 text-[10.5px] font-semibold text-[var(--color-text-2)]">
                          {STATUS_LABEL[sub.status]}
                        </div>
                      )}
                    </div>
                    <div className="text-[11.5px] text-[var(--color-text-3)]">
                      {sub.provider ? `${sub.provider} · ` : ''}
                      {accountName(sub.accountId)}
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="num text-[14px] font-bold">
                      {formatMoney(sub.cost)}
                      <span className="text-[11px] font-normal text-[var(--color-text-3)]">
                        {sub.billingCycle === 'monthly' ? ' / شهريًا' : ' / سنويًا'}
                      </span>
                    </div>
                    {badge && (
                      <div className="mt-1 text-[11px] font-semibold" style={{ color: badge.color }}>
                        {badge.text}
                      </div>
                    )}
                  </div>
                </button>

                {open && (
                  <div className="mt-3.5 flex flex-col gap-2 border-t border-white/6 pt-3.5">
                    {sub.status === 'active' && (
                      <button
                        onClick={() => logSubscriptionPayment(sub.id)}
                        className="rounded-xl py-2.5 text-[12.5px] font-semibold"
                        style={{ background: 'rgba(0,226,138,0.14)', color: 'var(--color-accent)' }}
                      >
                        تسجيل الدفع الآن (يخصم {formatMoney(sub.cost)} من {accountName(sub.accountId)})
                      </button>
                    )}
                    <div className="flex gap-2">
                      {sub.status === 'active' ? (
                        <button
                          onClick={() => setSubscriptionStatus(sub.id, 'paused')}
                          className="flex-1 rounded-xl py-2.5 text-[12.5px] font-semibold"
                          style={{ background: 'rgba(245,185,66,0.12)', color: 'var(--color-subscription)' }}
                        >
                          إيقاف مؤقت
                        </button>
                      ) : sub.status === 'paused' ? (
                        <button
                          onClick={() => setSubscriptionStatus(sub.id, 'active')}
                          className="flex-1 rounded-xl py-2.5 text-[12.5px] font-semibold"
                          style={{ background: 'rgba(0,226,138,0.12)', color: 'var(--color-accent)' }}
                        >
                          استئناف
                        </button>
                      ) : null}
                      {sub.status !== 'cancelled' && (
                        <button
                          onClick={() => setSubscriptionStatus(sub.id, 'cancelled')}
                          className="flex-1 rounded-xl py-2.5 text-[12.5px] font-semibold"
                          style={{ background: 'rgba(255,92,92,0.12)', color: 'var(--color-expense)' }}
                        >
                          إلغاء الاشتراك
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </ScreenScroll>
  )
}
