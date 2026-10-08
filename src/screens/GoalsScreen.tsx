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
import { BigAmount } from '../components/BigAmount'
import { Badge, EmptyState, HeaderAddButton, HeroCard, HeroLabel, RingProgress, SectionTitle } from '../components/ui'
import { rise } from '../lib/motion'

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
      <div className="mt-3 rounded-[18px] bg-white/[0.04] px-3.5 py-3 text-[11.5px] leading-relaxed text-[var(--color-text-3)]">
        حدّد تاريخ بداية حول الزكاة من شاشة تعديل الحساب لحساب زكاة هذا الهدف
      </div>
    )
  }

  const z = computeZakatStatus(account.balance, goldPricePerGram, account.zakatHawlStartDate)
  const lastPayment = payments[0]

  return (
    <div className="mt-3 rounded-[20px] px-4 py-3" style={{ background: 'linear-gradient(135deg, rgba(95,179,255,0.14), rgba(95,179,255,0.04))' }}>
      <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: 'var(--color-commitment)' }}>
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
            className="qb-press mt-3 w-full rounded-full py-2.5 text-[12.5px] font-semibold text-[#0a0a0c]"
            style={{ background: 'var(--color-commitment)' }}
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

  const totalSaved = goals.reduce((sum, a) => sum + Math.min(a.balance, a.goalAmount ?? 0), 0)
  const totalTarget = goals.reduce((sum, a) => sum + (a.goalAmount ?? 0), 0)
  const reachedCount = goals.filter((a) => a.balance >= (a.goalAmount ?? 0)).length

  function handleConfirmZakatPaid() {
    if (!pendingZakat) return
    logZakatPayment(pendingZakat.account.id, pendingZakat.due)
    setPendingZakat(null)
  }

  return (
    <ScreenScroll
      header={<ScreenHeader title="الأهداف" onBack={() => navigate(-1)} right={<HeaderAddButton label="إضافة هدف" onClick={() => navigate('/accounts/new?type=savings')} />} />}
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

      {goals.length > 0 && (
        <HeroCard className="mb-6">
          <div className="flex items-center gap-5">
            <RingProgress pct={totalTarget ? (totalSaved / totalTarget) * 100 : 0} size={104} color="var(--color-subscription)">
              <span className="num text-[22px] font-bold leading-none">{totalTarget ? Math.round((totalSaved / totalTarget) * 100) : 0}%</span>
              <span className="mt-1 text-[10px] text-[var(--color-text-3)]">من كل الأهداف</span>
            </RingProgress>
            <div className="min-w-0 flex-1">
              <HeroLabel>إجمالي المدّخر</HeroLabel>
              <BigAmount value={totalSaved} size={28} color="var(--color-subscription)" />
              <div className="num mt-1.5 text-[12px] text-[var(--color-text-3)]">الهدف الكلي {formatMoney(totalTarget)}</div>
              <div className="mt-2.5">
                <Badge color="var(--color-income)">
                  {reachedCount} من {goals.length} تحققت
                </Badge>
              </div>
            </div>
          </div>
        </HeroCard>
      )}

      <SectionTitle title="أهدافك" hint="اضغط أي هدف لتعديل مبلغه أو موعده" />

      {goals.length === 0 ? (
        <EmptyState
          icon={<GoalIcon />}
          title="لا توجد أهداف ادخار بعد"
          desc="أضف حساب ادخار وحدد له مبلغ هدف وموعدًا، ونتابع معك تقدّمك ونتوقّع موعد الوصول."
          actionLabel="إضافة هدف"
          onAction={() => navigate('/accounts/new?type=savings')}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {goals.map((a, gi) => {
            const goalAmount = a.goalAmount ?? 0
            const pct = Math.min(100, (a.balance / goalAmount) * 100)
            const remaining = Math.max(0, goalAmount - a.balance)
            const months = a.goalTargetDate ? monthsUntil(a.goalTargetDate) : null
            const monthlyNeeded = months && remaining > 0 ? remaining / months : null
            const reached = a.balance >= goalAmount
            const projection = !reached ? projectGoalCompletion(a.id, remaining, transactions) : null
            const projectionAheadOfTarget = projection?.projectedDate && a.goalTargetDate ? projection.projectedDate <= a.goalTargetDate : null
            const ringColor = reached ? 'var(--color-income)' : 'var(--color-subscription)'

            return (
              <div key={a.id} onClick={() => navigate(`/accounts/${a.id}/edit`)} className="qb-card qb-press qb-rise block w-full p-4 text-right" style={rise(gi + 1)}>
                <div className="flex items-center gap-4">
                  <RingProgress pct={pct} size={72} stroke={7} color={ringColor}>
                    {reached ? (
                      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="var(--color-income)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="5,13 10,18 19,6" />
                      </svg>
                    ) : (
                      <span className="num text-[15px] font-bold">{Math.round(pct)}%</span>
                    )}
                  </RingProgress>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[15.5px] font-semibold">{a.goalLabel || a.name}</span>
                      {reached && <Badge color="var(--color-income)">تحقق</Badge>}
                    </div>
                    <div className="truncate text-[11.5px] text-[var(--color-text-3)]">{a.name}</div>
                    <div className="num mt-1.5 flex items-baseline gap-1.5">
                      <span className="text-[17px] font-bold" style={{ color: ringColor }}>
                        {formatMoney(a.balance)}
                      </span>
                      <span className="text-[11.5px] text-[var(--color-text-3)]">/ {formatMoney(goalAmount)}</span>
                    </div>
                  </div>
                </div>

                {!reached && (a.goalTargetDate || projection?.projectedDate) && (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {a.goalTargetDate && (
                      <div className="rounded-[16px] bg-white/[0.04] px-3 py-2.5">
                        <div className="text-[10.5px] text-[var(--color-text-3)]">الهدف بحلول</div>
                        <div className="num text-[13px] font-semibold">{formatDate(a.goalTargetDate)}</div>
                      </div>
                    )}
                    {monthlyNeeded !== null && (
                      <div className="rounded-[16px] bg-white/[0.04] px-3 py-2.5">
                        <div className="text-[10.5px] text-[var(--color-text-3)]">تحتاج شهريًا</div>
                        <div className="num text-[13px] font-semibold" style={{ color: 'var(--color-subscription)' }}>
                          {formatMoney(monthlyNeeded)}
                        </div>
                      </div>
                    )}
                    {projection?.projectedDate && (
                      <div className="col-span-2 rounded-[16px] px-3 py-2.5" style={{ background: projectionAheadOfTarget === false ? 'rgba(255,95,109,0.1)' : 'rgba(62,224,143,0.1)' }}>
                        <div className="flex items-center justify-between">
                          <span className="text-[10.5px] text-[var(--color-text-3)]">بمعدّلك (+{formatMoney(projection.avgMonthlyContribution)}/شهر) تصل بحلول</span>
                          <span className="num text-[13px] font-bold" style={{ color: projectionAheadOfTarget === false ? 'var(--color-expense)' : 'var(--color-income)' }}>
                            {formatDate(projection.projectedDate)}
                          </span>
                        </div>
                        {projectionAheadOfTarget !== null && (
                          <div className="mt-0.5 text-[10.5px]" style={{ color: projectionAheadOfTarget ? 'var(--color-income)' : 'var(--color-expense)' }}>
                            {projectionAheadOfTarget ? 'قبل الموعد المحدد أو بحدوده — استمر' : 'بعد الموعد المحدد — ارفع معدّل الإيداع'}
                          </div>
                        )}
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

      <div className="qb-card qb-rise mt-6 p-4">
        <label className="mb-2 block px-1 text-[12.5px] font-medium text-[var(--color-text-2)]">سعر جرام الذهب (عيار 24) — لحساب الزكاة</label>
        <div className="flex items-center gap-2.5">
          <input
            dir="ltr"
            inputMode="decimal"
            value={goldPriceInput}
            onChange={(e) => handleGoldPriceChange(e.target.value)}
            placeholder="مثال: 320"
            className="num flex-1 rounded-[18px] border border-[var(--color-border)] bg-[var(--color-void)] px-4 py-3.5 text-[16px] font-semibold outline-none placeholder:text-[var(--color-text-3)]"
          />
          <div className="text-[13px] font-semibold text-[var(--color-text-3)]">ر.س</div>
        </div>
        <div className="mt-1.5 px-1 text-[10.5px] leading-relaxed text-[var(--color-text-3)]">
          {goldPriceUpdatedAt ? `آخر تحديث: ${formatDate(goldPriceUpdatedAt.slice(0, 10))} — ` : ''}
          يُدخَل يدويًا من مصدر تثق فيه، ويُستخدم لحساب نصاب الزكاة (85 جرام) لكل أهدافك
        </div>
      </div>

    </ScreenScroll>
  )
}
