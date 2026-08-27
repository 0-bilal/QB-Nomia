import type { Account } from '../types'

export const ACCOUNT_ICON_COLOR: Record<Account['type'], string> = {
  cash: 'var(--color-income)',
  bank: 'var(--color-transfer)',
  savings: 'var(--color-subscription)',
  wallet: 'var(--color-accent)',
}
export const ACCOUNT_ICON_BG: Record<Account['type'], string> = {
  cash: 'rgba(34,197,94,0.14)',
  bank: 'rgba(124,108,255,0.14)',
  savings: 'rgba(245,185,66,0.14)',
  wallet: 'rgba(255,255,255,0.12)',
}
export const ACCOUNT_TYPE_LABELS: Record<Account['type'], string> = {
  cash: 'نقدي',
  bank: 'بنكي',
  savings: 'ادخار',
  wallet: 'محفظة رقمية',
}

/** خلفية كل بطاقة حساب — لمسة لون خفيفة حسب النوع فوق نفس تدرّج qb-card-elevated الأساسي، عشان كل حساب يتميّز بصريًا وهو لسا بنفس هوية التطبيق. */
export const ACCOUNT_CARD_BG: Record<Account['type'], string> = {
  cash: 'radial-gradient(130% 100% at 100% 0%, rgba(34,197,94,0.16) 0%, transparent 55%), linear-gradient(160deg, #16211a 0%, #0a0e0c 65%, #000 100%)',
  bank: 'radial-gradient(130% 100% at 100% 0%, rgba(124,108,255,0.18) 0%, transparent 55%), linear-gradient(160deg, #1a1830 0%, #0c0b14 65%, #000 100%)',
  savings: 'radial-gradient(130% 100% at 100% 0%, rgba(245,185,66,0.16) 0%, transparent 55%), linear-gradient(160deg, #26200f 0%, #100d07 65%, #000 100%)',
  wallet: 'radial-gradient(130% 100% at 100% 0%, rgba(255,255,255,0.12) 0%, transparent 55%), linear-gradient(160deg, #1c1c20 0%, #0a0a0c 65%, #000 100%)',
}

export function AccountTypeIcon({ type, size = 18 }: { type: Account['type']; size?: number }) {
  if (type === 'cash') {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2.5" y="6" width="19" height="12" rx="2.5" />
        <circle cx="12" cy="12" r="2.8" />
      </svg>
    )
  }
  if (type === 'bank') {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 10 L12 4 L21 10" />
        <path d="M5 10v9M19 10v9M9 10v9M15 10v9" />
        <path d="M3 19h18" />
      </svg>
    )
  }
  if (type === 'wallet') {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 7a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v1H4Z" />
        <path d="M4 8h15a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z" />
        <circle cx="16.5" cy="13.5" r="1.4" fill="currentColor" stroke="none" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12a8 8 0 1 1 8 8" />
      <path d="M4 12v5h5" />
      <path d="M12 8v4l3 2" />
    </svg>
  )
}
