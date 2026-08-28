import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../state/DataContext'
import { formatMoney } from '../lib/format'
import { ScreenScroll } from '../components/ScreenScroll'
import { ScreenHeader } from '../components/ScreenHeader'
import { intervalLabel } from './CommitmentsScreen'
import type { RecurringTransaction, TransactionType } from '../types'

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
  const activeCount = recurringTransactions.filter((r) => r.status === 'active').length

  return (
    <ScreenScroll
      header={
        <ScreenHeader
          title="الحركات المتكررة"
          onBack={() => navigate(-1)}
          right={
            <button
              onClick={() => navigate('/recurring/new')}
              className="qb-glass-circle qb-press flex h-9.5 w-9.5 items-center justify-center rounded-full border"
              style={{ width: 38, height: 38, color: 'var(--color-accent)' }}
              aria-label="إضافة حركة متكررة"
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
      <div className="mb-4 rounded-2xl border border-dashed p-3.5 text-[12px] leading-relaxed" style={{ borderColor: 'rgba(255,255,255,0.25)', color: 'var(--color-text-2)' }}>
        حركات متكررة بمبلغ تقديري (زي الراتب) — لما يحين موعدها بتوصلك كإشعار تراجعه وتؤكده أو تعدّل مبلغه قبل ما يُسجَّل فعليًا.
      </div>

      <div className="qb-card-elevated mb-4 p-4.5">
        <div className="mb-1.5 text-[12.5px] text-[var(--color-text-2)]">الحركات المتكررة النشطة</div>
        <div className="num text-[26px] font-bold" style={{ color: 'var(--color-transfer)' }}>
          {activeCount}
        </div>
      </div>

      {recurringTransactions.length === 0 ? (
        <div className="qb-card py-10 text-center text-[13px] text-[var(--color-text-3)]">
          لا توجد حركات متكررة بعد — أضف الراتب أو أي حركة تتكرر بمبلغ متغيّر
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {recurringTransactions.map((r) => {
            const badge = dueBadge(r)
            const open = openId === r.id
            const color = TYPE_COLOR[r.type]
            return (
              <div key={r.id} className="qb-card p-4">
                <button onClick={() => setOpenId(open ? null : r.id)} className="flex w-full items-center gap-3 text-right">
                  <div
                    className="flex h-11.5 w-11.5 flex-shrink-0 items-center justify-center rounded-[14px]"
                    style={{ width: 46, height: 46, background: `${color}1f`, color }}
                  >
                    <RecurringIcon />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="text-[14px] font-bold">{r.name}</div>
                      {r.status !== 'active' && (
                        <div className="rounded-full bg-white/6 px-2 py-0.5 text-[10.5px] font-semibold text-[var(--color-text-2)]">
                          {STATUS_LABEL[r.status]}
                        </div>
                      )}
                    </div>
                    <div className="text-[11.5px] text-[var(--color-text-3)]">
                      {TYPE_LABEL[r.type]} · {intervalLabel(r.intervalUnit, r.intervalCount)}
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="num text-[14px] font-bold">~{formatMoney(r.amount)}</div>
                    {badge && (
                      <div className="mt-1 text-[11px] font-semibold" style={{ color: badge.color }}>
                        {badge.text}
                      </div>
                    )}
                  </div>
                </button>

                {open && (
                  <div className="mt-3.5 flex flex-col gap-2 border-t border-white/6 pt-3.5">
                    {r.note && <div className="mb-1 text-[12px] leading-relaxed text-[var(--color-text-2)]">{r.note}</div>}
                    <div className="mb-1 text-[11.5px] text-[var(--color-text-3)]">
                      {r.type === 'transfer' ? `${accountName(r.accountId)} ← ${accountName(r.transferToAccountId)}` : `الحساب: ${accountName(r.accountId)}`}
                    </div>
                    <button
                      onClick={() => navigate(`/recurring/${r.id}/edit`)}
                      className="qb-press rounded-xl py-2.5 text-[12.5px] font-semibold"
                      style={{ background: 'var(--color-void)', color: 'var(--color-text-2)', border: '1px solid var(--color-border)' }}
                    >
                      تعديل بيانات الحركة
                    </button>
                    {r.status === 'active' && (
                      <button
                        onClick={() => navigate(`/recurring/${r.id}/confirm`)}
                        className="qb-press rounded-xl py-2.5 text-[12.5px] font-semibold"
                        style={{ background: `${color}22`, color }}
                      >
                        مراجعة وتأكيد الحركة
                      </button>
                    )}
                    <div className="flex gap-2">
                      {r.status === 'active' ? (
                        <button
                          onClick={() => setRecurringStatus(r.id, 'paused')}
                          className="qb-press flex-1 rounded-xl py-2.5 text-[12.5px] font-semibold"
                          style={{ background: 'rgba(245,185,66,0.12)', color: 'var(--color-subscription)' }}
                        >
                          إيقاف مؤقت
                        </button>
                      ) : r.status === 'paused' ? (
                        <button
                          onClick={() => setRecurringStatus(r.id, 'active')}
                          className="qb-press flex-1 rounded-xl py-2.5 text-[12.5px] font-semibold"
                          style={{ background: 'rgba(255,255,255,0.12)', color: 'var(--color-accent)' }}
                        >
                          استئناف
                        </button>
                      ) : null}
                      {r.status !== 'cancelled' && (
                        <button
                          onClick={() => setRecurringStatus(r.id, 'cancelled')}
                          className="qb-press flex-1 rounded-xl py-2.5 text-[12.5px] font-semibold"
                          style={{ background: 'rgba(255,92,92,0.12)', color: 'var(--color-expense)' }}
                        >
                          إلغاء
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
