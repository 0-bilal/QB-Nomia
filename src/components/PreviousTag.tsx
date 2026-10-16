import { PREVIOUS_STRIPES } from './MonthSummary'

/** شارة رمادية تحت المصروف اللي طلع (كله أو جزء) من رصيد كان قبل الشهر — مثل الشراء من الادخار. */
export function PreviousTag({ partial }: { partial: boolean }) {
  return (
    <span className="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-[2px] text-[10.5px] font-semibold" style={{ background: 'color-mix(in srgb, var(--color-text-2) 12%, transparent)', color: 'var(--color-text-2)' }}>
      <span className="inline-block h-2 w-2 rounded-[2px]" style={{ background: PREVIOUS_STRIPES }} />
      {partial ? 'جزء منه من رصيد سابق' : 'من رصيد سابق'}
    </span>
  )
}
