import type { CSSProperties } from 'react'
import type { Account } from '../types'

export const ACCOUNT_ICON_COLOR: Record<Account['type'], string> = {
  cash: 'var(--color-income)',
  bank: 'var(--color-transfer)',
  savings: 'var(--color-subscription)',
  wallet: 'var(--color-accent)',
  emergency: 'var(--color-emergency)',
  coins: 'var(--color-coins)',
  fuel: 'var(--color-fuel)',
  steam: 'var(--color-steam)',
}
export const ACCOUNT_ICON_BG: Record<Account['type'], string> = {
  cash: 'rgba(34,197,94,0.14)',
  bank: 'rgba(124,108,255,0.14)',
  savings: 'rgba(245,185,66,0.14)',
  wallet: 'rgba(255,255,255,0.1)',
  emergency: 'rgba(225,29,72,0.14)',
  coins: 'rgba(18,182,103,0.14)',
  fuel: 'rgba(255,138,26,0.14)',
  steam: 'rgba(102,192,244,0.14)',
}
export const ACCOUNT_TYPE_LABELS: Record<Account['type'], string> = {
  cash: 'نقدي',
  bank: 'بنكي',
  savings: 'ادخار',
  wallet: 'محفظة رقمية',
  emergency: 'طوارئ',
  coins: 'عملات معدنية',
  fuel: 'بطاقة وقود',
  steam: 'بطاقة Steam',
}

/**
 * خلفية كل بطاقة حساب بهوية "Nomia Mono" 2026: سطح غير لامع (matte) بتدرّج عميق
 * وهالة ضوء بالزاوية، لكل نوع حساب شخصية مستقلة — Obsidian أسود للكاش، تيتانيوم رمادي
 * للبنكي، لؤلؤي أبيض (بطاقة فاتحة بنص داكن) للادخار، وغرافيت للمحفظة — هوية أحادية اللون.
 */
export const ACCOUNT_CARD_BG: Record<Account['type'], string> = {
  cash: 'radial-gradient(90% 120% at 100% 0%, rgba(255,255,255,0.16) 0%, transparent 50%), radial-gradient(80% 100% at 0% 100%, rgba(255,255,255,0.05) 0%, transparent 55%), linear-gradient(160deg, #1c1c21 0%, #0b0b0d 60%, #030304 100%)',
  bank: 'radial-gradient(100% 120% at 100% 0%, rgba(255,255,255,0.34) 0%, transparent 45%), linear-gradient(150deg, #8d8d97 0%, #5a5a63 40%, #33333a 75%, #1c1c21 100%)',
  savings: 'radial-gradient(100% 120% at 100% 0%, rgba(255,255,255,0.9) 0%, transparent 45%), linear-gradient(150deg, #ffffff 0%, #e6e6eb 45%, #b7b7c0 100%)',
  wallet: 'radial-gradient(100% 120% at 100% 0%, rgba(255,255,255,0.22) 0%, transparent 45%), linear-gradient(150deg, #44444c 0%, #2a2a30 45%, #141417 100%)',
  emergency: 'radial-gradient(100% 120% at 100% 0%, rgba(255,255,255,0.22) 0%, transparent 45%), linear-gradient(150deg, #ff6b8e 0%, #e0174d 45%, #6b0820 100%)',
  /** أخضر السعودية كامل الخلفية مع لمسة ذهبية — هوية وطنية واضحة لحساب تجميع الريال المعدني. */
  coins: 'radial-gradient(100% 120% at 100% 0%, rgba(240,214,143,0.3) 0%, transparent 45%), linear-gradient(150deg, #1fc77f 0%, #0d7a47 45%, #03301b 100%)',
  /** برتقالي اللهب — بطاقة وقود مسبقة الدفع. */
  fuel: 'radial-gradient(100% 120% at 100% 0%, rgba(255,230,180,0.32) 0%, transparent 45%), linear-gradient(150deg, #ffad4d 0%, #ff7a1a 40%, #8a3306 100%)',
  /** كحلي Steam يتدرّج للأزرق — ألوان مستوحاة من المنصّة (بدون شعارها الرسمي). */
  steam: 'radial-gradient(100% 120% at 100% 0%, rgba(102,192,244,0.35) 0%, transparent 50%), linear-gradient(150deg, #2a475e 0%, #1b2838 45%, #0b0e14 100%)',
}

/** لون النص الأساسي فوق سطح البطاقة — أبيض لكل البطاقات الداكنة، وداكن للبطاقة الفاتحة (الادخار). */
export const ACCOUNT_CARD_TEXT: Record<Account['type'], string> = {
  cash: '#f4f4f6',
  bank: '#ffffff',
  savings: '#0a0a0c',
  wallet: '#ffffff',
  emergency: '#ffffff',
  coins: '#ffffff',
  fuel: '#ffffff',
  steam: '#ffffff',
}

/** لون التمييز (Accent) الخاص بسطح كل بطاقة — لأيقونة نوع الحساب وشارة الدفع اللاتلامسي فوق البطاقة نفسها. */
export const ACCOUNT_CARD_ACCENT: Record<Account['type'], string> = {
  cash: '#ffffff',
  bank: '#ffffff',
  savings: '#0a0a0c',
  wallet: '#ffffff',
  emergency: '#ffd1dc',
  coins: '#f0d68f',
  fuel: '#ffffff',
  steam: '#66c0f4',
}

/** خلفية شارة أيقونة الدفع اللاتلامسي فوق البطاقة. */
export const ACCOUNT_CARD_ACCENT_BG: Record<Account['type'], string> = {
  cash: 'rgba(255,255,255,0.1)',
  bank: 'rgba(255,255,255,0.18)',
  savings: 'rgba(10,10,12,0.08)',
  wallet: 'rgba(255,255,255,0.16)',
  emergency: 'rgba(255,255,255,0.18)',
  coins: 'rgba(240,214,143,0.2)',
  fuel: 'rgba(255,255,255,0.2)',
  steam: 'rgba(102,192,244,0.18)',
}

/** ألوان النصوص الثانوية فوق سطح البطاقة — مشتقة من لون نص كل بطاقة حتى تبقى مقروءة فوق أي سطح. */
export const ACCOUNT_CARD_TEXT_MUTED: Record<Account['type'], string> = {
  cash: 'var(--color-text-2)',
  bank: 'rgba(255,255,255,0.75)',
  savings: 'rgba(10,10,12,0.6)',
  wallet: 'rgba(255,255,255,0.75)',
  emergency: 'rgba(255,255,255,0.75)',
  coins: 'rgba(255,255,255,0.75)',
  fuel: 'rgba(255,255,255,0.8)',
  steam: '#a9cbe0',
}
export const ACCOUNT_CARD_TEXT_FAINT: Record<Account['type'], string> = {
  cash: 'var(--color-text-3)',
  bank: 'rgba(255,255,255,0.55)',
  savings: 'rgba(10,10,12,0.45)',
  wallet: 'rgba(255,255,255,0.55)',
  emergency: 'rgba(255,255,255,0.55)',
  coins: 'rgba(255,255,255,0.55)',
  fuel: 'rgba(255,255,255,0.6)',
  steam: '#8fb4cc',
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
  if (type === 'emergency') {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3.5 4.5 6.3v5.4c0 5 3.2 8.4 7.5 9.8 4.3-1.4 7.5-4.8 7.5-9.8V6.3L12 3.5Z" />
        <path d="M12 8.2v4M12 15.2h.01" />
      </svg>
    )
  }
  if (type === 'fuel') {
    return <FuelPumpIcon size={size} />
  }
  if (type === 'steam') {
    return <GamepadIcon size={size} />
  }
  if (type === 'coins') {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="16.3" rx="7" ry="2.6" />
        <ellipse cx="12" cy="12.3" rx="7" ry="2.6" />
        <ellipse cx="12" cy="8.3" rx="7" ry="2.6" />
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

/** مضخة وقود — أيقونة نوع حساب "بطاقة وقود"، وتُستخدم بحجم كبير كعلامة مائية فوق بطاقته. */
export function FuelPumpIcon({ size = 18, strokeWidth = 1.9, style }: { size?: number; strokeWidth?: number; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M4 20V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v15" />
      <path d="M3 20h13" />
      <path d="M6.5 7h5v4h-5z" />
      <path d="M15 9h2a2 2 0 0 1 2 2v5.5a1.5 1.5 0 0 0 3 0V8l-3-3" />
    </svg>
  )
}

/** يد تحكّم عامة — أيقونة نوع حساب "بطاقة Steam" وعلامتها المائية (بدل شعار المنصّة الرسمي). */
export function GamepadIcon({ size = 18, strokeWidth = 1.9, style }: { size?: number; strokeWidth?: number; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M6.5 8h11a4 4 0 0 1 3.9 4.9l-1 4.3a2.4 2.4 0 0 1-4.2 1L14.6 16H9.4l-1.6 2.2a2.4 2.4 0 0 1-4.2-1l-1-4.3A4 4 0 0 1 6.5 8Z" />
      <path d="M7.5 11v3M6 12.5h3" />
      <circle cx="15.5" cy="11.6" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="17.5" cy="13.4" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  )
}
