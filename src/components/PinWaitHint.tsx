import { pinLockoutTotalMs } from '../lib/auth'
import { waitLabel } from '../lib/forgotPin'

/** حلقة تنقص مع العدّاد + «محاولات كثيرة، حاول بعد…» (DESIGN-SYSTEM §8.1). */
export function PinWaitHint({ remainingMs }: { remainingMs: number }) {
  const total = Math.max(pinLockoutTotalMs(), remainingMs)
  const c = 2 * Math.PI * 7
  return (
    <span className="inline-flex items-center gap-2 text-[var(--color-text-2)]">
      <svg width="18" height="18" viewBox="0 0 18 18" style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
        <circle cx="9" cy="9" r="7" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
        <circle
          cx="9"
          cy="9"
          r="7"
          fill="none"
          stroke="var(--color-subscription)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - remainingMs / total)}
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
      </svg>
      <span>
        محاولات كثيرة، حاول بعد <span className="num">{waitLabel(remainingMs)}</span>
      </span>
    </span>
  )
}
