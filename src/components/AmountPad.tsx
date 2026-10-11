import type { ReactNode } from 'react'
import { haptic } from '../lib/haptics'

interface AmountPadProps {
  value: string
  onChange: (next: string) => void
  color: string
  /** مفاتيح أقصر وبدون «مسح الكل» تحت اللوحة — لوحة مثبّتة أسفل ورقة لا يتغيّر ارتفاعها (المسح الكامل بالضغط المطوّل على الحذف). */
  compact?: boolean
  /** زر إجراء داخل اللوحة (مثل «حفظ») — عمود رابع بطول ثلاثة صفوف. يفرض المقاس المضغوط. */
  action?: { label: string; icon?: ReactNode; color: string; disabled?: boolean; onPress: () => void }
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

/**
 * لوحة أرقام مخصصة لإدخال المبالغ — بنفس هوية QB-Nomia (زي PinPad)،
 * بدل الاعتماد على لوحة مفاتيح الهاتف الافتراضية. تدعم كسور عشرية
 * حتى خانتين (هللات) عبر مفتاح النقطة.
 */
export function AmountPad({ value, onChange, color, compact = false, action }: AmountPadProps) {
  function pressDigit(d: string) {
    const [whole, decimals] = value.split('.')
    if (decimals !== undefined && decimals.length >= 2) return
    if ((whole ?? '').replace('-', '').length >= 9) return
    onChange(value === '0' ? d : value + d)
  }
  function pressDot() {
    if (value.includes('.')) return
    onChange(value === '' ? '0.' : value + '.')
  }
  function clearAll() {
    onChange('')
  }
  function backspace() {
    onChange(value.slice(0, -1))
  }

  const keyClass =
    'num flex items-center justify-center rounded-[22px] text-[24px] font-medium text-[var(--color-text)] transition-[transform,background-color] duration-150 active:scale-90'
  const keyHeight = compact || action ? 50 : 58
  const keyStyle = { background: 'rgba(255,255,255,0.045)', height: keyHeight }

  function press(fn: () => void) {
    haptic('tick')
    fn()
  }

  const backspaceKey = (
    <button
      type="button"
      onClick={() => press(backspace)}
      onContextMenu={(e) => {
        e.preventDefault()
        press(clearAll)
      }}
      className="flex items-center justify-center rounded-[22px] transition-transform active:scale-90"
      style={{ height: keyHeight, color, background: `color-mix(in srgb, ${color} 12%, transparent)`, gridColumn: action ? 4 : undefined, gridRow: action ? 1 : undefined }}
      aria-label="حذف آخر رقم (اضغط مطولًا لمسح الكل)"
    >
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 6 L3 12 L9 18 H20 A2 2 0 0 0 22 16 V8 A2 2 0 0 0 20 6 Z" />
        <line x1="12" y1="9.5" x2="17" y2="14.5" />
        <line x1="17" y1="9.5" x2="12" y2="14.5" />
      </svg>
    </button>
  )

  // مع زر الإجراء: عمود رابع — الحذف أعلاه، والإجراء (حفظ) طويل بطول ثلاثة صفوف، والصفر بعرض خانتين.
  if (action) {
    return (
      <div dir="ltr" className="grid gap-2" style={{ gridTemplateColumns: '1fr 1fr 1fr 1.05fr' }}>
        {KEYS.map((k, i) => (
          <button
            key={k}
            type="button"
            onClick={() => press(() => pressDigit(k))}
            className={keyClass}
            style={{ ...keyStyle, gridColumn: (i % 3) + 1, gridRow: Math.floor(i / 3) + 1 }}
          >
            {k}
          </button>
        ))}
        {backspaceKey}
        <button
          type="button"
          disabled={action.disabled}
          onClick={() => {
            if (action.disabled) return
            haptic('success')
            action.onPress()
          }}
          className="flex flex-col items-center justify-center gap-1.5 rounded-[22px] px-1 text-center text-[13px] font-bold leading-tight text-[var(--color-on-accent)] transition-[transform,opacity,box-shadow] duration-200 active:scale-95 disabled:opacity-35"
          style={{ gridColumn: 4, gridRow: '2 / span 3', background: action.color, boxShadow: action.disabled ? 'none' : `0 14px 30px -14px ${action.color}` }}
        >
          {action.icon}
          <span dir="rtl">{action.label}</span>
        </button>
        <button type="button" onClick={() => press(pressDot)} className={keyClass} style={{ ...keyStyle, gridColumn: 1, gridRow: 4 }} aria-label="فاصلة عشرية">
          .
        </button>
        <button type="button" onClick={() => press(() => pressDigit('0'))} className={keyClass} style={{ ...keyStyle, gridColumn: '2 / span 2', gridRow: 4 }}>
          0
        </button>
      </div>
    )
  }

  return (
    <div dir="ltr" className="flex flex-col gap-2.5">
      <div className={`grid grid-cols-3 ${compact ? 'gap-2' : 'gap-2.5'}`}>
        {KEYS.map((k) => (
          <button key={k} type="button" onClick={() => press(() => pressDigit(k))} className={keyClass} style={keyStyle}>
            {k}
          </button>
        ))}

        <button type="button" onClick={() => press(pressDot)} className={keyClass} style={keyStyle} aria-label="فاصلة عشرية">
          .
        </button>

        <button type="button" onClick={() => press(() => pressDigit('0'))} className={keyClass} style={keyStyle}>
          0
        </button>

        {backspaceKey}
      </div>
      {value && !compact && (
        <button type="button" onClick={() => press(clearAll)} className="self-center px-3 py-1 text-[12px] font-medium text-[var(--color-text-3)]" aria-label="مسح الكل">
          مسح الكل
        </button>
      )}
    </div>
  )
}
