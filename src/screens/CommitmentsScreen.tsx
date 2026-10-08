import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../state/DataContext'
import { formatDate, formatMoney } from '../lib/format'
import { ScreenScroll } from '../components/ScreenScroll'
import { ScreenHeader } from '../components/ScreenHeader'
import type { Commitment, CommitmentIntervalUnit } from '../types'
import { SwipeableRow } from '../components/SwipeableRow'
import { Badge, EmptyState, HeaderAddButton, HeroCard, HeroLabel, ListGroup, RingProgress, SectionTitle, TintButton } from '../components/ui'
import { haptic } from '../lib/haptics'

function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

function dueBadge(c: Commitment) {
  if (c.status !== 'active') return null
  const days = daysUntil(c.nextDueDate)
  if (days < 0) return { text: 'تجاوز الموعد', color: 'var(--color-expense)' }
  if (days === 0) return { text: 'يستحق اليوم', color: 'var(--color-expense)' }
  if (days <= 7) return { text: `يستحق خلال ${days} ${days === 1 ? 'يوم' : 'أيام'}`, color: 'var(--color-subscription)' }
  return { text: `الاستحقاق القادم بعد ${days} يوم`, color: 'var(--color-text-3)' }
}

const UNIT_LABELS: Record<CommitmentIntervalUnit, { one: string; two: string; plural: string }> = {
  day: { one: 'يوم', two: 'يومين', plural: 'أيام' },
  week: { one: 'أسبوع', two: 'أسبوعين', plural: 'أسابيع' },
  month: { one: 'شهر', two: 'شهرين', plural: 'أشهر' },
  year: { one: 'سنة', two: 'سنتين', plural: 'سنوات' },
}

export function intervalLabel(unit: CommitmentIntervalUnit, count: number): string {
  const l = UNIT_LABELS[unit]
  if (count === 1) return `كل ${l.one}`
  if (count === 2) return `كل ${l.two}`
  return `كل ${count} ${l.plural}`
}

const STATUS_LABEL: Record<Commitment['status'], string> = {
  active: 'نشط',
  paused: 'موقوف',
  cancelled: 'ملغى',
}

function CommitmentIcon() {
  return (
    <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="18" rx="2.5" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  )
}

export function CommitmentsScreen() {
  const { commitments, accounts, setCommitmentStatus, logCommitmentRenewal } = useData()
  const navigate = useNavigate()
  const [openId, setOpenId] = useState<string | null>(null)

  const accountName = (id?: string) => accounts.find((a) => a.id === id)?.name ?? ''
  const activeCount = commitments.filter((c) => c.status === 'active').length

  const sorted = [...commitments].sort((x, y) => {
    const rank = (c: Commitment) => (c.status === 'active' ? 0 : c.status === 'paused' ? 1 : 2)
    return rank(x) - rank(y) || x.nextDueDate.localeCompare(y.nextDueDate)
  })
  const next = sorted.find((c) => c.status === 'active')
  const nextDays = next ? daysUntil(next.nextDueDate) : null
  const color = 'var(--color-commitment)'

  return (
    <ScreenScroll header={<ScreenHeader title="الالتزامات" onBack={() => navigate(-1)} right={<HeaderAddButton label="إضافة التزام" onClick={() => navigate('/commitments/new')} />} />}>
      <HeroCard className="mb-6">
        <div className="flex items-center gap-5">
          <RingProgress pct={nextDays === null ? 0 : Math.max(4, 100 - Math.min(100, (nextDays / 30) * 100))} size={100} color={nextDays !== null && nextDays <= 7 ? 'var(--color-subscription)' : color}>
            <span className="num text-[26px] font-bold leading-none">{nextDays === null ? '—' : Math.max(0, nextDays)}</span>
            <span className="mt-1 text-[10px] text-[var(--color-text-3)]">{nextDays === null ? '' : 'يوم متبقي'}</span>
          </RingProgress>
          <div className="min-w-0 flex-1">
            <HeroLabel>الاستحقاق القادم</HeroLabel>
            <div className="truncate text-[18px] font-semibold">{next ? next.name : 'لا يوجد'}</div>
            {next && <div className="num mt-0.5 text-[12px] text-[var(--color-text-3)]">{formatDate(next.nextDueDate)}</div>}
            <div className="mt-3 flex gap-2">
              <Badge color={color}>{activeCount} نشط</Badge>
              {commitments.length - activeCount > 0 && <Badge>{commitments.length - activeCount} غير نشط</Badge>}
            </div>
          </div>
        </div>
      </HeroCard>

      <SectionTitle title="الجدول الزمني" hint="اسحب يمينًا لتسجيل التجديد · يسارًا للإيقاف أو الاستئناف" />

      {commitments.length === 0 ? (
        <EmptyState title="لا توجد التزامات بعد" desc="أضف تجديد هوية، عقد، رخصة، أو أي التزام دوري." actionLabel="إضافة التزام" onAction={() => navigate('/commitments/new')} />
      ) : (
        <ListGroup className="qb-rise">
          {sorted.map((c, i) => {
            const badge = dueBadge(c)
            const open = openId === c.id
            const d = new Date(c.nextDueDate)
            return (
              <SwipeableRow
                key={c.id}
                className={i > 0 ? 'border-t qb-divider' : ''}
                rightSwipe={
                  c.status === 'active'
                    ? { label: 'تجديد', icon: <RenewIcon />, color, textColor: '#0a0a0c', onTrigger: () => {
                        logCommitmentRenewal(c.id)
                        haptic('success')
                      } }
                    : undefined
                }
                leftSwipe={
                  c.status === 'cancelled'
                    ? undefined
                    : {
                        label: c.status === 'active' ? 'إيقاف' : 'استئناف',
                        icon: <CommitmentIcon />,
                        color: 'var(--color-subscription)',
                        textColor: '#0a0a0c',
                        onTrigger: () => setCommitmentStatus(c.id, c.status === 'active' ? 'paused' : 'active'),
                      }
                }
              >
                <div className={c.status === 'cancelled' ? 'opacity-55' : ''}>
                  <button onClick={() => setOpenId(open ? null : c.id)} className="flex w-full items-center gap-3 px-4 py-3.5 text-right active:bg-white/[0.03]">
                    <div
                      className="flex flex-shrink-0 flex-col items-center justify-center rounded-[16px]"
                      style={{ width: 48, height: 52, background: `color-mix(in srgb, ${badge?.color === 'var(--color-text-3)' || !badge ? color : badge.color} 14%, transparent)`, color: badge && badge.color !== 'var(--color-text-3)' ? badge.color : color }}
                    >
                      <span className="num text-[18px] font-bold leading-none">{d.getDate()}</span>
                      <span className="mt-0.5 text-[9.5px] font-semibold">{MONTHS_AR[d.getMonth()]}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[14px] font-medium">{c.name}</span>
                        {c.status !== 'active' && <Badge>{STATUS_LABEL[c.status]}</Badge>}
                      </div>
                      <div className="truncate text-[11.5px]" style={{ color: badge?.color ?? 'var(--color-text-3)' }}>
                        {badge ? badge.text : intervalLabel(c.intervalUnit, c.intervalCount)}
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-left">
                      {c.cost ? <div className="num text-[14px] font-bold">{formatMoney(c.cost)}</div> : null}
                      <div className="text-[10.5px] text-[var(--color-text-3)]">{intervalLabel(c.intervalUnit, c.intervalCount)}</div>
                    </div>
                  </button>

                  {open && (
                    <div className="grid grid-cols-2 gap-2 px-4 pb-4" style={{ animation: 'fade-in 200ms ease-out both' }}>
                      {(c.note || (c.cost && c.accountId)) && (
                        <div className="col-span-2 rounded-[16px] bg-white/[0.04] px-3.5 py-2.5 text-[12px] leading-relaxed text-[var(--color-text-2)]">
                          {c.note}
                          {c.note && c.cost && c.accountId ? ' — ' : ''}
                          {c.cost && c.accountId ? `يُخصم من: ${accountName(c.accountId)}` : ''}
                        </div>
                      )}
                      {c.status === 'active' && (
                        <button
                          onClick={() => logCommitmentRenewal(c.id)}
                          className="qb-press col-span-2 rounded-full py-3 text-[13px] font-semibold text-[#0a0a0c]"
                          style={{ background: color }}
                        >
                          {c.cost && c.accountId ? `تسجيل التجديد (${formatMoney(c.cost)})` : 'تسجيل التجديد الآن'}
                        </button>
                      )}
                      <button onClick={() => navigate(`/commitments/${c.id}/edit`)} className="qb-press rounded-full bg-white/[0.06] py-2.5 text-[12.5px] font-medium">
                        تعديل
                      </button>
                      {c.status === 'active' ? (
                        <TintButton color="var(--color-subscription)" className="!py-2.5 text-[12.5px]" onClick={() => setCommitmentStatus(c.id, 'paused')}>
                          إيقاف مؤقت
                        </TintButton>
                      ) : c.status === 'paused' ? (
                        <TintButton color="var(--color-accent)" className="!py-2.5 text-[12.5px]" onClick={() => setCommitmentStatus(c.id, 'active')}>
                          استئناف
                        </TintButton>
                      ) : (
                        <div />
                      )}
                      {c.status !== 'cancelled' && (
                        <TintButton color="var(--color-expense)" className="col-span-2 !py-2.5 text-[12.5px]" onClick={() => setCommitmentStatus(c.id, 'cancelled')}>
                          إلغاء الالتزام
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

const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']

function RenewIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 11A8 8 0 0 0 6.3 6.3L4 8.6" />
      <path d="M4 4v4.6h4.6" />
      <path d="M4 13a8 8 0 0 0 13.7 4.7L20 15.4" />
      <path d="M20 20v-4.6h-4.6" />
    </svg>
  )
}
