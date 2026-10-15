import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMoneyTrail } from '../../hooks/useMoneyTrail'
import { getHideBalancesDefault } from '../../lib/privacy'
import { rise } from '../../lib/motion'
import { ScreenScroll } from '../../components/ScreenScroll'
import { ScreenHeader } from '../../components/ScreenHeader'
import { EyeToggleButton } from '../../components/EyeToggleButton'
import { EmptyState } from '../../components/ui'
import { AlertIcon, longDate, money, useTrailNames } from '../../components/MoneyTrailVisuals'

/** «تحتاج نظرة»: حركات خرجت بأكثر من الفلوس المسجّلة بحسابها وقتها (غالبًا دخل ما انسجّل). */
export function TrailReviewScreen() {
  const navigate = useNavigate()
  const trail = useMoneyTrail()
  const { accountName } = useTrailNames()
  const [hidden, setHidden] = useState(getHideBalancesDefault)
  const issues = [...trail.issues].sort((a, b) => (a.date < b.date ? 1 : -1))

  return (
    <ScreenScroll header={<ScreenHeader title="تحتاج نظرة" onBack={() => navigate(-1)} right={<EyeToggleButton hidden={hidden} onToggle={() => setHidden((h) => !h)} />} />}>
      <div className="-mt-2 mb-4 px-1 text-[12px] leading-relaxed text-[var(--color-text-3)]">
        حركات خرجت بمبلغ أكبر من الفلوس المسجّلة في حسابها وقتها. ما تأثر أي رصيد — بس ما نعرف من وين جت. سجّل الدخل الناقص بتاريخه أو صحّح الحركة.
      </div>
      {issues.length === 0 ? (
        <EmptyState
          icon={
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="m5 12.5 4.5 4.5L19 7.5" />
            </svg>
          }
          title="كل ريال له مصدر"
          desc="ما فيه أي حركة بلا مصدر في سجلك."
        />
      ) : (
        issues.map((b, i) => (
          <button key={b.id} onClick={() => navigate(`/trail/${encodeURIComponent(b.id)}`)} className="qb-card qb-press qb-rise mb-2 flex w-full items-center gap-3 p-3.5 text-right" style={rise(i)}>
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full" style={{ background: 'color-mix(in srgb, var(--color-subscription) 15%, transparent)', color: 'var(--color-subscription)' }}>
              <AlertIcon size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-semibold">
                <span className="num">{money(b.amount, hidden)}</span> ر.س بلا مصدر
              </div>
              <div className="truncate text-[11px] text-[var(--color-text-3)]">
                <span className="num">{longDate(b.date)}</span> · {b.accountId ? accountName(b.accountId) : 'بدون حساب'}
              </div>
            </div>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-[var(--color-text-3)]">
              <path d="m15 6-6 6 6 6" />
            </svg>
          </button>
        ))
      )}
    </ScreenScroll>
  )
}
