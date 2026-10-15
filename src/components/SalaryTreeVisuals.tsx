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

/** «راتب أغسطس» من تاريخ الراتب. */
export function salaryTitle(iso: string): string {
  return `راتب ${MONTHS_AR[Number(iso.slice(5, 7)) - 1]}`
}

/** «27 أغسطس – 26 سبتمبر»، أو «من 1 أكتوبر · حتى الآن» لآخر راتب. */
export function periodLabel(from: string, to: string | null): string {
  return to ? `${longDate(from, true)} – ${longDate(to, true)}` : `من ${longDate(from, true)} · حتى الآن`
}

/** مبلغ يحترم وضع الإخفاء. */
export function money(v: number, hidden: boolean): string {
  return hidden ? '•••' : formatAmount(v)
}
