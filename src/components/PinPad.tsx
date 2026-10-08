import type { ReactNode } from 'react'
import { haptic } from '../lib/haptics'

interface PinPadProps {
  digits: number
  value: string
  onDigit: (d: string) => void
  onBackspace: () => void
  disabled?: boolean
  /** يهز مؤشر الأرقام ويلوّنه بالأحمر (رقم خاطئ). */
  error?: boolean
  /** يلوّن المؤشر بلون النجاح بعد التحقق. */
  success?: boolean
  /** مفتاح إضافي بالخانة الفارغة أسفل اليمين (مثل زر البصمة). */
  extraKey?: ReactNode
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

function Key({ children, onClick, disabled, label, plain = false }: { children: ReactNode; onClick: () => void; disabled?: boolean; label?: string; plain?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        haptic('tick')
        onClick()
      }}
      aria-label={label}
      className="num flex items-center justify-center rounded-full text-[28px] font-medium text-[var(--color-text)] transition-[transform,background-color] duration-150 active:scale-90 active:bg-[var(--color-accent)] active:text-[var(--color-on-accent)]"
      style={{
        width: 76,
        height: 76,
        background: plain ? 'transparent' : 'rgba(255,255,255,0.045)',
        border: plain ? 'none' : '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {children}
    </button>
  )
}

export function PinPad({ digits, value, onDigit, onBackspace, disabled, error = false, success = false, extraKey }: PinPadProps) {
  return (
    <div className="flex flex-col items-center gap-12">
      <div dir="ltr" className="flex gap-3" style={{ animation: error ? 'qb-shake 420ms ease both' : undefined }}>
        {Array.from({ length: digits }).map((_, i) => {
          const filled = i < value.length
          const color = error ? 'var(--color-expense)' : success ? 'var(--color-income)' : 'var(--color-accent)'
          return (
            <div
              key={i}
              className="h-3 rounded-full"
              style={{
                width: filled ? 28 : 12,
                background: filled ? color : 'rgba(255,255,255,0.12)',
                boxShadow: filled && !error ? `0 0 16px -2px ${color}` : 'none',
                transition: 'width 280ms var(--ease-spring), background 200ms ease',
              }}
            />
          )
        })}
      </div>

      <div dir="ltr" className="grid grid-cols-3 gap-x-7 gap-y-4">
        {KEYS.map((k) => (
          <Key key={k} disabled={disabled} onClick={() => onDigit(k)}>
            {k}
          </Key>
        ))}
        <div className="flex items-center justify-center" style={{ width: 76, height: 76 }}>
          {extraKey}
        </div>
        <Key disabled={disabled} onClick={() => onDigit('0')}>
          0
        </Key>
        <Key plain disabled={disabled} onClick={onBackspace} label="حذف">
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="var(--color-text-2)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 6 L3 12 L9 18 H20 A2 2 0 0 0 22 16 V8 A2 2 0 0 0 20 6 Z" />
            <line x1="12" y1="9.5" x2="17" y2="14.5" />
            <line x1="17" y1="9.5" x2="12" y2="14.5" />
          </svg>
        </Key>
      </div>
    </div>
  )
}
