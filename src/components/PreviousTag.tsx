import { PREVIOUS_STRIPES } from './MonthSummary'

/** شارة رمادية تحت المصروف من حساب ادخار أو طوارئ: «من مدخراتك» — ما ينحسب على دخل الشهر ولا سقفه. */
export function PreviousTag() {
  return (
    <span className="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-[2px] text-[10.5px] font-semibold" style={{ background: 'color-mix(in srgb, var(--color-text-2) 12%, transparent)', color: 'var(--color-text-2)' }}>
      <span className="inline-block h-2 w-2 rounded-[2px]" style={{ background: PREVIOUS_STRIPES }} />
      من مدخراتك
    </span>
  )
}
