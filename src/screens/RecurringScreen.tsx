import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../state/DataContext'
import { formatMoney } from '../lib/format'
import { ScreenScroll } from '../components/ScreenScroll'
import { ScreenHeader } from '../components/ScreenHeader'
import { intervalLabel } from './CommitmentsScreen'
import type { RecurringTransaction, TransactionType } from '../types'
import { SwipeableRow } from '../components/SwipeableRow'
import { Badge, EmptyState, HeaderAddButton, HeroCard, HeroLabel, IconBubble, ListGroup, SectionTitle, TintButton } from '../components/ui'

function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

function dueBadge(r: RecurringTransaction) {
  if (r.status !== 'active') return null
  const days = daysUntil(r.nextDueDate)
  if (days < 0) return { text: 'متأخرة — تحتاج تأكيد', color: 'var(--color-expense)' }
  if (days === 0) return { text: 'حان موعدها اليوم', color: 'var(--color-expense)' }
  if (days <= 7) return { text: `خلال ${days} ${days === 1 ? 'يوم' : 'أيام'}`, color: 'var(--color-subscription)' }
  return { text: `القادمة بعد ${days} يوم`, color: 'var(--color-text-3)' }
}

const TYPE_COLOR: Record<TransactionType, string> = {
  expense: 'var(--color-expense)',
  income: 'var(--color-income)',
  transfer: 'var(--color-transfer)',
}
const TYPE_LABEL: Record<TransactionType, string> = {
  expense: 'مصروف',
  income: 'دخل',
  transfer: 'تحويل',
}

const STATUS_LABEL: Record<RecurringTransaction['status'], string> = {
  active: 'نشطة',
  paused: 'موقوفة',
  cancelled: 'ملغاة',
}

function RecurringIcon() {
  return (
    <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 11A8 8 0 0 0 6.3 6.3L4 8.6" />
      <path d="M4 4v4.6h4.6" />
      <path d="M4 13a8 8 0 0 0 13.7 4.7L20 15.4" />
      <path d="M20 20v-4.6h-4.6" />
    </svg>
  )
}

export function RecurringScreen() {
  const { recurringTransactions, accounts, setRecurringStatus } = useData()
  const navigate = useNavigate()
  const [openId, setOpenId] = useState<string | null>(null)

  const accountName = (id?: string) => accounts.find((a) => a.id === id)?.name ?? ''

  const active = recurringTransactions.filter((r) => r.status === 'active')
  const monthlyEstimate = (type: TransactionType) =>
    active
      .filter((r) => r.type === type)
      .reduce((sum, r) => {
        const perMonth = { day: 30, week: 30 / 7, month: 1, year: 1 / 12 }[r.intervalUnit] / r.intervalCount
        return sum + r.amount * perMonth
      }, 0)
  const dueNow = active.filter((r) => daysUntil(r.nextDueDate) <= 0)

  return (
    <ScreenScroll header={<ScreenHeader title="الحركات المتكررة" onBack={() => navigate(-1)} right={<HeaderAddButton label="إضافة حركة متكررة" onClick={() => navigate('/recurring/new')} />} />}>
      <HeroCard className="mb-4">
        <HeroLabel>تقدير شهري للحركات النشطة</HeroLabel>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="mb-1 flex items-center gap-1.5 text-[11.5px] text-[var(--color-text-3)]">
              <span className="h-2 w-2 rounded-full bg-[var(--color-income)]" />
              دخل متوقع
            </div>
            <div className="num text-[20px] font-bold" style={{ color: 'var(--color-income)' }}>
              {formatMoney(Math.round(monthlyEstimate('income')))}
            </div>
          </div>
          <div>
            <div className="mb-1 flex items-center gap-1.5 text-[11.5px] text-[var(--color-text-3)]">
              <span className="h-2 w-2 rounded-full bg-[var(--color-expense)]" />
              مصروف متوقع
            </div>
            <div className="num text-[20px] font-bold" style={{ color: 'var(--color-expense)' }}>
              {formatMoney(Math.round(monthlyEstimate('expense')))}
            </div>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Badge color="var(--color-transfer)">{active.length} نشطة</Badge>
          {dueNow.length > 0 && <Badge color="var(--color-expense)">{dueNow.length} تحتاج تأكيد</Badge>}
        </div>
      </HeroCard>

      <div className="mb-6 rounded-[20px] bg-[var(--color-accent-soft)] p-4 text-[12.5px] leading-relaxed text-[var(--color-text-2)]">
        حركات بمبلغ تقديري (زي الراتب) — لما يحين موعدها توصلك كإشعار تراجعه وتؤكده أو تعدّل مبلغه قبل ما يُسجَّل فعليًا.
      </div>

      <SectionTitle title="كل الحركات المتكررة" hint="اسحب يمينًا للمراجعة والتأكيد · يسارًا للإيقاف أو الاستئناف" />

      {recurringTransactions.length === 0 ? (
        <EmptyState title="لا توجد حركات متكررة بعد" desc="أضف الراتب أو أي حركة تتكرر بمبلغ متغيّر." actionLabel="إضافة حركة متكررة" onAction={() => navigate('/recurring/new')} />
      ) : (
        <ListGroup className="qb-rise">
          {recurringTransactions.map((r, i) => {
            const badge = dueBadge(r)
            const open = openId === r.id
            const color = TYPE_COLOR[r.type]
            return (
              <SwipeableRow
                key={r.id}
                className={i > 0 ? 'border-t qb-divider' : ''}
                rightSwipe={
                  r.status === 'active'
                    ? { label: 'تأكيد', icon: <RecurringIcon />, color, textColor: '#0a0a0c', onTrigger: () => navigate(`/recurring/${r.id}/confirm`) }
                    : undefined
                }
                leftSwipe={
                  r.status === 'cancelled'
                    ? undefined
                    : {
                        label: r.status === 'active' ? 'إيقاف' : 'استئناف',
                        icon: <RecurringIcon />,
                        color: 'var(--color-subscription)',
                        textColor: '#0a0a0c',
                        onTrigger: () => setRecurringStatus(r.id, r.status === 'active' ? 'paused' : 'active'),
                      }
                }
              >
                <div className={r.status === 'cancelled' ? 'opacity-55' : ''}>
                  <button onClick={() => setOpenId(open ? null : r.id)} className="flex w-full items-center gap-3 px-4 py-3.5 text-right active:bg-white/[0.03]">
                    <IconBubble color={color}>
                      <RecurringIcon />
                    </IconBubble>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[14px] font-medium">{r.name}</span>
                        {r.status !== 'active' && <Badge>{STATUS_LABEL[r.status]}</Badge>}
                      </div>
                      <div className="truncate text-[11.5px]" style={{ color: badge?.color ?? 'var(--color-text-3)' }}>
                        {badge ? badge.text : `${TYPE_LABEL[r.type]} · ${intervalLabel(r.intervalUnit, r.intervalCount)}`}
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-left">
                      <div className="num text-[14px] font-bold" style={{ color }}>
                        ~{formatMoney(r.amount)}
                      </div>
                      <div className="text-[10.5px] text-[var(--color-text-3)]">{intervalLabel(r.intervalUnit, r.intervalCount)}</div>
                    </div>
                  </button>

                  {open && (
                    <div className="grid grid-cols-2 gap-2 px-4 pb-4" style={{ animation: 'fade-in 200ms ease-out both' }}>
                      <div className="col-span-2 rounded-[16px] bg-white/[0.04] px-3.5 py-2.5 text-[12px] leading-relaxed text-[var(--color-text-2)]">
                        {r.type === 'transfer' ? `${accountName(r.accountId)} ← ${accountName(r.transferToAccountId)}` : `الحساب: ${accountName(r.accountId)}`}
                        {r.note ? ` — ${r.note}` : ''}
                      </div>
                      {r.status === 'active' && (
                        <button
                          onClick={() => navigate(`/recurring/${r.id}/confirm`)}
                          className="qb-press col-span-2 rounded-full py-3 text-[13px] font-semibold text-[#0a0a0c]"
                          style={{ background: color }}
                        >
                          مراجعة وتأكيد الحركة
                        </button>
                      )}
                      <button onClick={() => navigate(`/recurring/${r.id}/edit`)} className="qb-press rounded-full bg-white/[0.06] py-2.5 text-[12.5px] font-medium">
                        تعديل
                      </button>
                      {r.status === 'active' ? (
                        <TintButton color="var(--color-subscription)" className="!py-2.5 text-[12.5px]" onClick={() => setRecurringStatus(r.id, 'paused')}>
                          إيقاف مؤقت
                        </TintButton>
                      ) : r.status === 'paused' ? (
                        <TintButton color="var(--color-accent)" className="!py-2.5 text-[12.5px]" onClick={() => setRecurringStatus(r.id, 'active')}>
                          استئناف
                        </TintButton>
                      ) : (
                        <div />
                      )}
                      {r.status !== 'cancelled' && (
                        <TintButton color="var(--color-expense)" className="col-span-2 !py-2.5 text-[12.5px]" onClick={() => setRecurringStatus(r.id, 'cancelled')}>
                          إلغاء
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
