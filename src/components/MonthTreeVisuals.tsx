import { formatAmount } from '../lib/format'
import { MONTHS_AR } from '../lib/txFilters'

/** أيقونة «شجرة المصاريف» — جذع يتفرع لثلاثة. */
export function TreeIcon({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="4.5" r="2" />
      <circle cx="5" cy="19.5" r="2" />
      <circle cx="12" cy="19.5" r="2" />
      <circle cx="19" cy="19.5" r="2" />
      <path d="M12 6.5v11M12 11c-5 0-7 2-7 6.5M12 11c5 0 7 2 7 6.5" />
    </svg>
  )
}

/** «1 أغسطس 2026» — وبدون السنة مع `short`. */
export function longDate(iso: string, short = false): string {
  const [y, m, d] = iso.split('-')
  return `${Number(d)} ${MONTHS_AR[Number(m) - 1]}${short ? '' : ` ${y}`}`
}

/** «أكتوبر 2026» من «2026-10». */
export function monthTitle(key: string): string {
  return `${MONTHS_AR[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`
}

/** اسم الشهر فقط: «أكتوبر». */
export function monthName(key: string): string {
  return MONTHS_AR[Number(key.slice(5, 7)) - 1]
}

/** مبلغ يحترم وضع الإخفاء. */
export function money(v: number, hidden: boolean): string {
  return hidden ? '•••' : formatAmount(v)
}
