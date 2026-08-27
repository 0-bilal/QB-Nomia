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

/**
 * خلفية كل بطاقة حساب — سطح "معدن ثمين" ملوّن فعليًا بلون كل نوع حساب (مو رمادي بلمسة
 * لون خفيفة)، بدل التدرّج الأسود المسطح القديم: أسود لامع فاخر للكاش، ذهبي كلاسيكي
 * للبنكي، روز-غولد/شامبين للادخار، وغنميتال غامق للمحفظة — أربع معادن متمايزة عن بعض.
 */
export const ACCOUNT_CARD_BG: Record<Account['type'], string> = {
  cash: 'radial-gradient(120% 90% at 8% 0%, rgba(255,255,255,0.16) 0%, transparent 58%), linear-gradient(155deg, #030303 0%, #131315 42%, #232327 68%, #030303 100%)',
  bank: 'radial-gradient(120% 90% at 8% 0%, rgba(212,161,58,0.4) 0%, transparent 58%), linear-gradient(155deg, #221a09 0%, #7a5a1c 42%, #d7a83e 68%, #221a09 100%)',
  savings: 'radial-gradient(120% 90% at 8% 0%, rgba(192,142,119,0.38) 0%, transparent 58%), linear-gradient(155deg, #221714 0%, #6e4a3f 42%, #c08e77 68%, #221714 100%)',
  wallet: 'radial-gradient(120% 90% at 8% 0%, rgba(140,140,152,0.3) 0%, transparent 58%), linear-gradient(155deg, #131316 0%, #313138 42%, #62626c 68%, #131316 100%)',
}

/** لون التمييز (Accent) الخاص بسطح كل بطاقة — يُستخدم لأيقونة نوع الحساب وشارة الدفع اللاتلامسي فوق سطح البطاقة نفسه. منفصل عن ACCOUNT_ICON_COLOR المستخدم بباقي شاشات التطبيق (منتقيات الحساب، النماذج...) عشان ما يتأثر أي مكان ثاني بهذا التغيير. */
export const ACCOUNT_CARD_ACCENT: Record<Account['type'], string> = {
  cash: '#f2f2f5',
  bank: '#ffce6e',
  savings: '#e8b7a0',
  wallet: '#b6b6c0',
}

/** خلفية شارة أيقونة الدفع اللاتلامسي فوق البطاقة — نسخة شفافة من ACCOUNT_CARD_ACCENT. */
export const ACCOUNT_CARD_ACCENT_BG: Record<Account['type'], string> = {
  cash: 'rgba(255,255,255,0.1)',
  bank: 'rgba(212,161,58,0.18)',
  savings: 'rgba(192,142,119,0.16)',
  wallet: 'rgba(140,140,152,0.14)',
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
