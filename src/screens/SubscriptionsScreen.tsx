import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../state/DataContext'
import { formatMoney } from '../lib/format'
import { ScreenScroll } from '../components/ScreenScroll'
import { ScreenHeader } from '../components/ScreenHeader'
import type { Subscription } from '../types'
import { BigAmount } from '../components/BigAmount'
import { AccountTypeIcon } from '../components/AccountVisuals'
import { SwipeableRow } from '../components/SwipeableRow'
import { Badge, EmptyState, HeaderAddButton, HeroCard, HeroLabel, IconBubble, ListGroup, ListItem, SectionTitle, TintButton } from '../components/ui'
import { rise } from '../lib/motion'
import { haptic } from '../lib/haptics'

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

  const active = subscriptions.filter((x) => x.status === 'active')
  const upcoming = [...active].sort((x, y) => x.nextRenewalDate.localeCompare(y.nextRenewalDate)).slice(0, 4)

  return (
    <ScreenScroll header={<ScreenHeader title="الاشتراكات" onBack={() => navigate(-1)} right={<HeaderAddButton label="إضافة اشتراك" onClick={() => navigate('/subscriptions/new')} />} />}>
      <HeroCard className="mb-6">
        <HeroLabel>إجمالي الاشتراكات الشهرية</HeroLabel>
        <BigAmount value={totalMonthlySubscriptions} size={38} color="var(--color-subscription)" />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-[18px] bg-white/[0.04] px-3.5 py-3">
            <div className="text-[11px] text-[var(--color-text-3)]">تقدير سنوي</div>
            <div className="num text-[15px] font-bold">{formatMoney(totalMonthlySubscriptions * 12)}</div>
          </div>
          <div className="rounded-[18px] bg-white/[0.04] px-3.5 py-3">
            <div className="text-[11px] text-[var(--color-text-3)]">اشتراكات نشطة</div>
            <div className="num text-[15px] font-bold">
              {active.length}
              <span className="text-[11px] font-normal text-[var(--color-text-3)]"> من {subscriptions.length}</span>
            </div>
          </div>
        </div>
      </HeroCard>

      {upcoming.length > 0 && (
        <div className="qb-rise mb-6" style={rise(1)}>
          <SectionTitle title="التجديدات القادمة" />
          <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-1">
            {upcoming.map((sub) => {
              const days = daysUntil(sub.nextRenewalDate)
              const urgent = days <= 3
              return (
                <button
                  key={sub.id}
                  onClick={() => setOpenId(sub.id)}
                  className="qb-press flex w-[150px] flex-shrink-0 flex-col rounded-[24px] border p-4 text-right"
                  style={{
                    borderColor: urgent ? 'rgba(255,191,71,0.35)' : 'var(--color-border)',
                    background: urgent ? 'linear-gradient(160deg, rgba(255,191,71,0.16), rgba(255,191,71,0.03))' : 'var(--color-surface)',
                  }}
                >
                  <div className="num text-[30px] font-bold leading-none" style={{ color: urgent ? 'var(--color-subscription)' : 'var(--color-text)' }}>
                    {Math.max(0, days)}
                  </div>
                  <div className="mb-3 text-[11px] text-[var(--color-text-3)]">{days <= 0 ? 'اليوم/متأخر' : days === 1 ? 'يوم' : 'أيام'}</div>
                  <div className="truncate text-[13px] font-medium">{sub.name}</div>
                  <div className="num text-[12px] text-[var(--color-text-2)]">{formatMoney(sub.cost)}</div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="qb-rise mb-6" style={rise(2)}>
        <SectionTitle title="المحافظ الرقمية" action="محفظة جديدة" onAction={() => navigate('/accounts/new?type=wallet')} />
        {wallets.length === 0 ? (
          <div className="rounded-[20px] bg-white/[0.04] p-4 text-[12.5px] leading-relaxed text-[var(--color-text-2)]">
            ما عندك محفظة رقمية بعد. أنشئ محفظة (مثل Google Play)، عبّيها بتحويل من الكاش أو البنكي، وسدد اشتراكاتك منها.
          </div>
        ) : (
          <ListGroup>
            {wallets.map((w, i) => (
              <ListItem
                key={w.id}
                divider={i > 0}
                leading={
                  <IconBubble color="var(--color-accent)">
                    <AccountTypeIcon type="wallet" size={19} />
                  </IconBubble>
                }
                title={w.name}
                subtitle={<span className="num">{formatMoney(w.balance)}</span>}
                trailing={
                  <button
                    onClick={() => navigate(`/add/transaction?type=transfer&to=${w.id}`)}
                    className="qb-press rounded-full px-4 py-2 text-[12.5px] font-semibold"
                    style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}
                  >
                    شحن
                  </button>
                }
              />
            ))}
          </ListGroup>
        )}
      </div>

      <SectionTitle title="كل الاشتراكات" hint="اسحب يمينًا لتسجيل الدفع · يسارًا للإيقاف أو الاستئناف" />

      {subscriptions.length === 0 ? (
        <EmptyState title="لا توجد اشتراكات بعد" desc="أضف اشتراكاتك (يوتيوب، Google Play...) وتابع موعد تجديدها." actionLabel="إضافة اشتراك" onAction={() => navigate('/subscriptions/new')} />
      ) : (
        <ListGroup className="qb-rise">
          {subscriptions.map((sub, i) => {
            const badge = renewalBadge(sub)
            const open = openId === sub.id
            return (
              <SwipeableRow
                key={sub.id}
                className={i > 0 ? 'border-t qb-divider' : ''}
                rightSwipe={
                  sub.status === 'active'
                    ? { label: 'دفع', icon: <PayIcon />, color: 'var(--color-accent)', textColor: 'var(--color-on-accent)', onTrigger: () => {
                        logSubscriptionPayment(sub.id)
                        haptic('success')
                      } }
                    : undefined
                }
                leftSwipe={
                  sub.status === 'cancelled'
                    ? undefined
                    : {
                        label: sub.status === 'active' ? 'إيقاف' : 'استئناف',
                        icon: <PauseIcon paused={sub.status !== 'active'} />,
                        color: 'var(--color-subscription)',
                        textColor: '#0a0a0c',
                        onTrigger: () => setSubscriptionStatus(sub.id, sub.status === 'active' ? 'paused' : 'active'),
                      }
                }
              >
                <div className={sub.status === 'cancelled' ? 'opacity-55' : ''}>
                  <button onClick={() => setOpenId(open ? null : sub.id)} className="flex w-full items-center gap-3 px-4 py-3.5 text-right active:bg-white/[0.03]">
                    <IconBubble color="var(--color-subscription)">
                      <svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor">
                        <path d="M8 5.5v13l10.5-6.5z" />
                      </svg>
                    </IconBubble>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[14px] font-medium">{sub.name}</span>
                        {sub.status !== 'active' && <Badge>{STATUS_LABEL[sub.status]}</Badge>}
                      </div>
                      <div className="truncate text-[11.5px]" style={{ color: badge?.color ?? 'var(--color-text-3)' }}>
                        {badge ? badge.text : [sub.provider, accountName(sub.accountId)].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-left">
                      <div className="num text-[14px] font-bold">{formatMoney(sub.cost)}</div>
                      <div className="text-[10.5px] text-[var(--color-text-3)]">{sub.billingCycle === 'monthly' ? 'شهريًا' : 'سنويًا'}</div>
                    </div>
                  </button>

                  {open && (
                    <div className="grid grid-cols-2 gap-2 px-4 pb-4" style={{ animation: 'fade-in 200ms ease-out both' }}>
                      {sub.status === 'active' && (
                        <button
                          onClick={() => logSubscriptionPayment(sub.id)}
                          className="qb-press col-span-2 rounded-full py-3 text-[13px] font-semibold"
                          style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}
                        >
                          تسجيل الدفع الآن ({formatMoney(sub.cost)} من {accountName(sub.accountId)})
                        </button>
                      )}
                      <button
                        onClick={() => navigate(`/subscriptions/${sub.id}/edit`)}
                        className="qb-press rounded-full bg-white/[0.06] py-2.5 text-[12.5px] font-medium"
                      >
                        تعديل
                      </button>
                      {sub.status === 'active' ? (
                        <TintButton color="var(--color-subscription)" className="!py-2.5 text-[12.5px]" onClick={() => setSubscriptionStatus(sub.id, 'paused')}>
                          إيقاف مؤقت
                        </TintButton>
                      ) : sub.status === 'paused' ? (
                        <TintButton color="var(--color-accent)" className="!py-2.5 text-[12.5px]" onClick={() => setSubscriptionStatus(sub.id, 'active')}>
                          استئناف
                        </TintButton>
                      ) : (
                        <div />
                      )}
                      {sub.status !== 'cancelled' && (
                        <TintButton color="var(--color-expense)" className="col-span-2 !py-2.5 text-[12.5px]" onClick={() => setSubscriptionStatus(sub.id, 'cancelled')}>
                          إلغاء الاشتراك
                        </TintButton>
                      )}
                    </div>
                  )}
                </div>
              </SwipeableRow>
            )
          })}
        </ListGroup>
      )}
    </ScreenScroll>
  )
}

function PayIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="6" width="18" height="13" rx="3" />
      <path d="M3 10.5h18M7 15h3" />
    </svg>
  )
}

function PauseIcon({ paused }: { paused: boolean }) {
  return paused ? (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M8 5.5v13l10.5-6.5z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <rect x="6.5" y="5" width="4" height="14" rx="1.2" />
      <rect x="13.5" y="5" width="4" height="14" rx="1.2" />
    </svg>
  )
}
