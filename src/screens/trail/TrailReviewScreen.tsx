import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMoneyTrail } from '../../hooks/useMoneyTrail'
import { reviewItems } from '../../lib/moneyTrail'
import { getHideBalancesDefault } from '../../lib/privacy'
import { ScreenScroll } from '../../components/ScreenScroll'
import { ScreenHeader } from '../../components/ScreenHeader'
import { EyeToggleButton } from '../../components/EyeToggleButton'
import { EmptyState } from '../../components/ui'
import { ReviewRow } from './ReviewRow'

/** «تحتاج نظرة»: خروج بلا مصدر، واستلام من شخص أكبر مما لك عنده. */
export function TrailReviewScreen() {
  const navigate = useNavigate()
  const trail = useMoneyTrail()
  const [hidden, setHidden] = useState(getHideBalancesDefault)
  const items = reviewItems(trail)

  return (
    <ScreenScroll header={<ScreenHeader title="تحتاج نظرة" onBack={() => navigate(-1)} right={<EyeToggleButton hidden={hidden} onToggle={() => setHidden((h) => !h)} />} />}>
      <div className="-mt-2 mb-4 px-1 text-[12px] leading-relaxed text-[var(--color-text-3)]">
        ما تأثر أي رصيد — بس هذي حركات ما نعرف مصدر فلوسها بالكامل، أو استلام أكبر مما لك عند الشخص. سجّل الدخل الناقص بتاريخه أو صحّح الحركة وبتختفي من هنا.
      </div>
      {items.length === 0 ? (
        <EmptyState
          icon={
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="m5 12.5 4.5 4.5L19 7.5" />
            </svg>
          }
          title="كل ريال له مصدر"
          desc="ما فيه أي حركة تحتاج نظرة في سجلك."
        />
      ) : (
        <div className="qb-card qb-rise px-3.5 py-1">
          {items.map((b, i) => (
            <ReviewRow key={b.id} batch={b} hidden={hidden} divider={i > 0} />
          ))}
        </div>
      )}
    </ScreenScroll>
  )
}
