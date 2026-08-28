import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../state/DataContext'
import { formatMoney } from '../lib/format'
import { ScreenScroll } from '../components/ScreenScroll'
import { ScreenHeader } from '../components/ScreenHeader'
import type { Commitment, CommitmentIntervalUnit } from '../types'

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

  return (
    <ScreenScroll
      header={
        <ScreenHeader
          title="الالتزامات"
          onBack={() => navigate(-1)}
          right={
            <button
              onClick={() => navigate('/commitments/new')}
              className="qb-glass-circle qb-press flex h-9.5 w-9.5 items-center justify-center rounded-full border"
              style={{ width: 38, height: 38, color: 'var(--color-accent)' }}
              aria-label="إضافة التزام"
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
      <div className="qb-card-elevated mb-4 p-4.5">
        <div className="mb-1.5 text-[12.5px] text-[var(--color-text-2)]">الالتزامات النشطة</div>
        <div className="num text-[26px] font-bold" style={{ color: 'var(--color-commitment)' }}>
          {activeCount}
        </div>
      </div>

      {commitments.length === 0 ? (
        <div className="qb-card py-10 text-center text-[13px] text-[var(--color-text-3)]">
          لا توجد التزامات بعد — أضف تجديد هوية، عقد، رخصة، أو أي التزام دوري
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {commitments.map((c) => {
            const badge = dueBadge(c)
            const open = openId === c.id
            return (
              <div key={c.id} className="qb-card p-4">
                <button onClick={() => setOpenId(open ? null : c.id)} className="flex w-full items-center gap-3 text-right">
                  <div
                    className="flex h-11.5 w-11.5 flex-shrink-0 items-center justify-center rounded-[14px]"
                    style={{ width: 46, height: 46, background: 'rgba(96,165,250,0.12)', color: 'var(--color-commitment)' }}
                  >
                    <CommitmentIcon />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="text-[14px] font-bold">{c.name}</div>
                      {c.status !== 'active' && (
                        <div className="rounded-full bg-white/6 px-2 py-0.5 text-[10.5px] font-semibold text-[var(--color-text-2)]">
                          {STATUS_LABEL[c.status]}
                        </div>
                      )}
                    </div>
                    <div className="text-[11.5px] text-[var(--color-text-3)]">{intervalLabel(c.intervalUnit, c.intervalCount)}</div>
                  </div>
                  <div className="text-left">
                    {c.cost ? (
                      <div className="num text-[14px] font-bold">{formatMoney(c.cost)}</div>
                    ) : null}
                    {badge && (
                      <div className="mt-1 text-[11px] font-semibold" style={{ color: badge.color }}>
                        {badge.text}
                      </div>
                    )}
                  </div>
                </button>

                {open && (
                  <div className="mt-3.5 flex flex-col gap-2 border-t border-white/6 pt-3.5">
                    {c.note && <div className="mb-1 text-[12px] leading-relaxed text-[var(--color-text-2)]">{c.note}</div>}
                    {c.cost && c.accountId && (
                      <div className="mb-1 text-[11.5px] text-[var(--color-text-3)]">يُخصم من: {accountName(c.accountId)}</div>
                    )}
                    <button
                      onClick={() => navigate(`/commitments/${c.id}/edit`)}
                      className="qb-press rounded-xl py-2.5 text-[12.5px] font-semibold"
                      style={{ background: 'var(--color-void)', color: 'var(--color-text-2)', border: '1px solid var(--color-border)' }}
                    >
                      تعديل بيانات الالتزام
                    </button>
                    {c.status === 'active' && (
                      <button
                        onClick={() => logCommitmentRenewal(c.id)}
                        className="qb-press rounded-xl py-2.5 text-[12.5px] font-semibold"
                        style={{ background: 'rgba(96,165,250,0.14)', color: 'var(--color-commitment)' }}
                      >
                        {c.cost && c.accountId
                          ? `تسجيل التجديد الآن (يخصم ${formatMoney(c.cost)} من ${accountName(c.accountId)})`
                          : 'تسجيل التجديد الآن'}
                      </button>
                    )}
                    <div className="flex gap-2">
                      {c.status === 'active' ? (
                        <button
                          onClick={() => setCommitmentStatus(c.id, 'paused')}
                          className="qb-press flex-1 rounded-xl py-2.5 text-[12.5px] font-semibold"
                          style={{ background: 'rgba(245,185,66,0.12)', color: 'var(--color-subscription)' }}
                        >
                          إيقاف مؤقت
                        </button>
                      ) : c.status === 'paused' ? (
                        <button
                          onClick={() => setCommitmentStatus(c.id, 'active')}
                          className="qb-press flex-1 rounded-xl py-2.5 text-[12.5px] font-semibold"
                          style={{ background: 'rgba(255,255,255,0.12)', color: 'var(--color-accent)' }}
                        >
                          استئناف
                        </button>
                      ) : null}
                      {c.status !== 'cancelled' && (
                        <button
                          onClick={() => setCommitmentStatus(c.id, 'cancelled')}
                          className="qb-press flex-1 rounded-xl py-2.5 text-[12.5px] font-semibold"
                          style={{ background: 'rgba(255,92,92,0.12)', color: 'var(--color-expense)' }}
                        >
                          إلغاء الالتزام
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
