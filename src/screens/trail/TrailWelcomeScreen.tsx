import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../../state/DataContext'
import { useMoneyTrail } from '../../hooks/useMoneyTrail'
import { reviewItems } from '../../lib/moneyTrail'
import { markTrailIntroSeen } from '../../lib/moneyTrailIntro'
import { getHideBalancesDefault } from '../../lib/privacy'
import { rise } from '../../lib/motion'
import { ScreenScroll } from '../../components/ScreenScroll'
import { ScreenHeader } from '../../components/ScreenHeader'
import { EyeToggleButton } from '../../components/EyeToggleButton'
import { longDate, money } from '../../components/MoneyTrailVisuals'
import { ReviewRow } from './ReviewRow'

function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" />
    </svg>
  )
}

function CheckRow({ title, sub, divider }: { title: ReactNode; sub?: string; divider: boolean }) {
  return (
    <div className={`flex items-start gap-2.5 py-2.5 ${divider ? 'border-t qb-divider' : ''}`}>
      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full" style={{ background: 'color-mix(in srgb, var(--color-income) 15%, transparent)', color: 'var(--color-income)' }}>
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="m5 12.5 4.5 4.5L19 7.5" />
        </svg>
      </span>
      <div className="min-w-0">
        <div className="text-[13px] font-semibold">{title}</div>
        {sub && <div className="text-[11px] text-[var(--color-text-3)]">{sub}</div>}
      </div>
    </div>
  )
}

/**
 * أول فتح لشجرة المصاريف بعد التحديث (للمستخدمين اللي عندهم سجل): ملخص ما رتّبناه من السجل
 * القديم بدون أي تغيير على البيانات، والحالات اللي تحتاج نظرة بتفاصيلها.
 */
export function TrailWelcomeScreen() {
  const navigate = useNavigate()
  const { transactions, loanTransactions } = useData()
  const trail = useMoneyTrail()
  const [hidden, setHidden] = useState(getHideBalancesDefault)

  const count = transactions.length + loanTransactions.length
  const first = [...transactions, ...loanTransactions].reduce<string>((min, t) => (!min || t.date < min ? t.date : min), '')
  const incomes = trail.batches.filter((b) => b.kind === 'income').length
  const borrowed = trail.batches.filter((b) => b.kind === 'borrowed').length
  const opening = trail.batches.filter((b) => b.kind === 'opening').reduce((s, b) => s + b.amount, 0)
  const linked = new Set(trail.batches.flatMap((b) => b.events.filter((e) => e.kind === 'returned' || e.kind === 'obligation-paid').map((e) => e.ref))).size
  const review = reviewItems(trail)

  const rows = [
    count > 0 && { t: <>قرأنا <span className="num">{count}</span> حركة{first && <> من <span className="num">{longDate(first)}</span></>}</>, s: undefined },
    incomes > 0 && { t: <><span className="num">{incomes}</span> دفعة دخل</>, s: 'كل دخل سجّلته صار دفعة' },
    borrowed > 0 && { t: <><span className="num">{borrowed}</span> دفعة مقترضة</>, s: 'كل سلفة أخذتها ووين راحت' },
    opening > 0 && { t: <>رصيد سابق <span className="num">{money(opening, hidden)}</span> ر.س</>, s: 'اللي كان في حساباتك قبل أول حركة' },
    linked > 0 && { t: <><span className="num">{linked}</span> سداد ربطناه بسلفته</>, s: 'كل سداد على أقدم سلفة مفتوحة للشخص' },
  ].filter(Boolean) as { t: ReactNode; s?: string }[]

  function done() {
    markTrailIntroSeen()
    navigate('/trail', { replace: true })
  }

  return (
    <ScreenScroll header={<ScreenHeader title="شجرة المصاريف" onBack={() => {
            markTrailIntroSeen()
            navigate(-1)
          }} right={<EyeToggleButton hidden={hidden} onToggle={() => setHidden((h) => !h)} />} />}>
      <div className="-mt-2 mb-4 px-1 text-[12px] text-[var(--color-text-3)]">أول مرة تفتحها بعد التحديث</div>

      <div className="qb-rise flex flex-col items-center rounded-[22px] border border-white/[0.09] px-4 py-6 text-center" style={{ background: 'radial-gradient(120% 90% at 100% 0%, rgba(255,255,255,0.06), transparent 55%), linear-gradient(165deg, var(--color-surface-elevated), var(--color-bg))' }}>
        <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-white/[0.07] text-[var(--color-text)]">
          <SparkleIcon />
        </span>
        <div className="mt-3 text-[17px] font-bold">جهّزنا مسار فلوسك من سجلك</div>
        <div className="mt-1.5 max-w-[290px] text-[12px] leading-relaxed text-[var(--color-text-2)]">ما تغيّر أي رصيد ولا أي حركة. رتّبنا سجلك القديم من أوله بالأقدم أولًا.</div>
      </div>

      {rows.length > 0 && (
        <div className="qb-card qb-rise mt-3 px-3.5 py-1" style={rise(1)}>
          {rows.map((r, i) => (
            <CheckRow key={i} title={r.t} sub={r.s} divider={i > 0} />
          ))}
        </div>
      )}

      <div className="qb-rise mx-1.5 mb-2 mt-5 flex justify-between" style={rise(2)}>
        <span className="text-[14px] font-semibold">تحتاج نظرة</span>
        <span className="num text-[12px] text-[var(--color-text-3)]">{review.length}</span>
      </div>
      <div className="qb-card qb-rise px-3.5 py-1" style={rise(2)}>
        {review.length === 0 ? (
          <CheckRow title="كل ريال له مصدر" sub="ما فيه أي حركة تحتاج نظرة" divider={false} />
        ) : (
          review.map((b, i) => <ReviewRow key={b.id} batch={b} hidden={hidden} divider={i > 0} />)
        )}
      </div>

      <button onClick={done} className="qb-btn-primary mt-5 h-12 w-full text-[14px]">
        عرض مسار فلوسك
      </button>
    </ScreenScroll>
  )
}
