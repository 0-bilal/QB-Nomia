import { useNavigate } from 'react-router-dom'
import { useSetupProgress } from '../../hooks/useSetupProgress'
import { useChecklistHidden } from '../../lib/onboarding'
import { STEP_META } from '../../screens/onboarding/setupStepMeta'
import { Icons, ObIcon, ProgressRing } from './ObUi'

/** بطاقة «جهّز محفظتك» بالرئيسية — تختفي لما تكتمل الخطوات أو يخفيها المستخدم. */
export function SetupCard() {
  const navigate = useNavigate()
  const hidden = useChecklistHidden()
  const { steps, doneCount, total, complete } = useSetupProgress()
  if (hidden || complete) return null
  const left = steps.filter((s) => !s.done).map((s) => STEP_META[s.id].title)

  return (
    <button
      data-tour="setup"
      onClick={() => navigate('/getting-started')}
      className="qb-press qb-card-elevated mb-5 flex w-full items-center gap-3 p-3.5 text-right"
    >
      <ProgressRing done={doneCount} total={total} size={44} stroke={4} />
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-semibold">جهّز محفظتك</span>
        <span className="mt-0.5 block truncate text-[11px] text-[var(--color-text-3)]">باقي: {left.join('، ')}</span>
      </span>
      <span className="text-[var(--color-text-3)]">
        <ObIcon size={16}>{Icons.chevron}</ObIcon>
      </span>
    </button>
  )
}
