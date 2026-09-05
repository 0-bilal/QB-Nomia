import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../state/DataContext'
import { formatMoney, formatDate } from '../lib/format'
import { ScreenScroll } from '../components/ScreenScroll'
import { ScreenHeader } from '../components/ScreenHeader'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { computeZakatStatus, getGoldPricePerGram, getGoldPriceUpdatedAt, setGoldPricePerGram } from '../lib/zakat'
import { projectGoalCompletion } from '../lib/goalProjection'
import type { Account, ZakatPayment } from '../types'

function GoalIcon() {
  return (
    <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  )
}

function ZakatIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v18M8 7.5c0-1.4 1.8-2.5 4-2.5s4 1.1 4 2.5-1.8 2.5-4 2.5-4 1.1-4 2.5 1.8 2.5 4 2.5 4-1.1 4-2.5" />
    </svg>
  )
}

/** بطاقة حالة الزكاة لهدف واحد — تحتاج سعر ذهب وتاريخ بداية حول محدّدين لهذا الهدف. */
function ZakatBlock({
  account,
  goldPricePerGram,
  payments,
  onMarkPaid,
}: {
  account: Account
  goldPricePerGram: number
  payments: ZakatPayment[]
  onMarkPaid: (due: number) => void
}) {
  if (!account.zakatHawlStartDate) {
    return (
      <div className="mt-3 rounded-2xl border border-dashed px-3.5 py-2.5 text-[11px] leading-relaxed text-[var(--color-text-3)]" style={{ borderColor: 'rgba(255,255,255,0.2)' }}>
        حدّد تاريخ بداية حول الزكاة من شاشة تعديل الحساب لحساب زكاة هذا الهدف
      </div>
    )
  }

  const z = computeZakatStatus(account.balance, goldPricePerGram, account.zakatHawlStartDate)
  const lastPayment = payments[0]

  return (
    <div className="mt-3 rounded-2xl border px-3.5 py-2.5" style={{ borderColor: 'rgba(96,165,250,0.3)', background: 'rgba(96,165,250,0.08)' }}>
      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-bold" style={{ color: 'var(--color-commitment)' }}>
        <ZakatIcon />
        الزكاة
      </div>
      {!z.meetsNisab ? (
        <div className="text-[11.5px] text-[var(--color-text-3)]">لم يبلغ الرصيد النصاب بعد (النصاب الحالي: {formatMoney(z.nisab)})</div>
      ) : !z.hawlComplete ? (
        <div className="text-[11.5px] text-[var(--color-text-3)]">بلغ النصاب — يتبقى {z.daysRemaining} يومًا على تمام الحول</div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <span className="text-[11.5px] text-[var(--color-text-3)]">الزكاة المستحقة (2.5%)</span>
            <span className="num text-[15px] font-bold" style={{ color: 'var(--color-commitment)' }}>
              {formatMoney(z.due)}
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onMarkPaid(z.due)
            }}
            className="qb-press mt-2.5 w-full rounded-xl py-2 text-[11.5px] font-bold"
            style={{ background: 'rgba(96,165,250,0.18)', color: 'var(--color-commitment)' }}
          >
            تم إخراج الزكاة
          </button>
        </>
      )}
      {lastPayment && (
        <div className="mt-2 text-center text-[10.5px] text-[var(--color-text-3)]">
          آخر دفعة زكاة: {formatDate(lastPayment.date)} — {formatMoney(lastPayment.amount)}
        </div>
      )}
    </div>
  )
}

function monthsUntil(dateStr: string): number {
  const today = new Date()
  const target = new Date(dateStr)
  const months = (target.getFullYear() - today.getFullYear()) * 12 + (target.getMonth() - today.getMonth())
  return Math.max(1, months)
}

export function GoalsScreen() {
  const { accounts, transactions, zakatPayments, logZakatPayment } = useData()
  const navigate = useNavigate()
  const goals = accounts.filter((a) => a.type === 'savings' && a.goalAmount)

  const [goldPriceInput, setGoldPriceInput] = useState(() => {
    const stored = getGoldPricePerGram()
    return stored ? String(stored) : ''
  })
  const goldPriceUpdatedAt = getGoldPriceUpdatedAt()
  const goldPrice = Number(goldPriceInput)
  const hasGoldPrice = goldPriceInput !== '' && Number.isFinite(goldPrice) && goldPrice > 0
  const [pendingZakat, setPendingZakat] = useState<{ account: Account; due: number } | null>(null)

  function handleGoldPriceChange(v: string) {
    const cleaned = v.replace(/[^0-9.]/g, '')
    setGoldPriceInput(cleaned)
    const n = Number(cleaned)
    if (cleaned && Number.isFinite(n) && n > 0) setGoldPricePerGram(n)
  }

  function handleConfirmZakatPaid() {
    if (!pendingZakat) return
    logZakatPayment(pendingZakat.account.id, pendingZakat.due)
    setPendingZakat(null)
  }

  return (
    <ScreenScroll
      header={
        <ScreenHeader
          title="الأهداف"
          onBack={() => navigate(-1)}
          right={
            <button
              onClick={() => navigate('/accounts/new?type=savings')}
              className="qb-glass-circle qb-press flex h-9.5 w-9.5 items-center justify-center rounded-full border"
              style={{ width: 38, height: 38, color: 'var(--color-accent)' }}
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
      <ConfirmDialog
        open={pendingZakat !== null}
        title="تسجيل إخراج الزكاة"
        message={pendingZakat ? `راح نسجّل إخراج ${formatMoney(pendingZakat.due)} زكاة عن "${pendingZakat.account.goalLabel || pendingZakat.account.name}"، ويبدأ حول جديد من اليوم لهذا الهدف.` : ''}
        confirmLabel="تم الإخراج"
        color="var(--color-commitment)"
        onConfirm={handleConfirmZakatPaid}
        onCancel={() => setPendingZakat(null)}
      />

      <div className="qb-card mb-4 p-4">
        <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--color-text-2)]">سعر جرام الذهب (عيار 24) — لحساب الزكاة</label>
        <div className="flex items-center gap-2.5">
          <input
            dir="ltr"
            inputMode="decimal"
            value={goldPriceInput}
            onChange={(e) => handleGoldPriceChange(e.target.value)}
            placeholder="مثال: 320"
            className="num flex-1 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[14px] outline-none placeholder:text-[var(--color-text-3)]"
          />
          <div className="text-[13px] font-semibold text-[var(--color-text-3)]">ر.س</div>
        </div>
        <div className="mt-1.5 px-1 text-[10.5px] leading-relaxed text-[var(--color-text-3)]">
          {goldPriceUpdatedAt ? `آخر تحديث: ${formatDate(goldPriceUpdatedAt.slice(0, 10))} — ` : ''}
          يُدخَل يدويًا من مصدر تثق فيه، ويُستخدم لحساب نصاب الزكاة (85 جرام) لكل أهدافك
        </div>
      </div>

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
            const projection = !reached ? projectGoalCompletion(a.id, remaining, transactions) : null
            const projectionAheadOfTarget = projection?.projectedDate && a.goalTargetDate ? projection.projectedDate <= a.goalTargetDate : null

            return (
              <div key={a.id} onClick={() => navigate(`/accounts/${a.id}/edit`)} className="qb-card-elevated qb-press block w-full p-4.5 text-right">
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

                {!reached && projection?.projectedDate && (
                  <div className="mt-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3.5 py-2.5">
                    <div className="flex items-center justify-between text-[11.5px]">
                      <span className="text-[var(--color-text-3)]">بمعدّلك الحالي (آخر 3 أشهر)</span>
                      <span className="num font-semibold" style={{ color: 'var(--color-income)' }}>
                        +{formatMoney(projection.avgMonthlyContribution)}/شهر
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[11.5px]">
                      <span className="text-[var(--color-text-3)]">متوقّع تصل الهدف بحلول</span>
                      <span
                        className="num font-bold"
                        style={{ color: projectionAheadOfTarget === false ? 'var(--color-expense)' : 'var(--color-income)' }}
                      >
                        {formatDate(projection.projectedDate)}
                      </span>
                    </div>
                    {projectionAheadOfTarget !== null && (
                      <div className="mt-1 text-[10.5px]" style={{ color: projectionAheadOfTarget ? 'var(--color-income)' : 'var(--color-expense)' }}>
                        {projectionAheadOfTarget ? 'قبل الموعد المحدد أو بحدوده — استمر' : 'بعد الموعد المحدد — تحتاج ترفع معدّل الإيداع'}
                      </div>
                    )}
                  </div>
                )}

                {hasGoldPrice && (
                  <ZakatBlock
                    account={a}
                    goldPricePerGram={goldPrice}
                    payments={zakatPayments.filter((p) => p.accountId === a.id).sort((x, y) => y.date.localeCompare(x.date))}
                    onMarkPaid={(due) => setPendingZakat({ account: a, due })}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}
    </ScreenScroll>
  )
}
