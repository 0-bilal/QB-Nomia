import { haptic } from '../lib/haptics'

interface AmountPadProps {
  value: string
  onChange: (next: string) => void
  color: string
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

/**
 * لوحة أرقام مخصصة لإدخال المبالغ — بنفس هوية QB-Nomia (زي PinPad)،
 * بدل الاعتماد على لوحة مفاتيح الهاتف الافتراضية. تدعم كسور عشرية
 * حتى خانتين (هللات) عبر مفتاح النقطة.
 */
export function AmountPad({ value, onChange, color }: AmountPadProps) {
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
  const keyStyle = { background: 'rgba(255,255,255,0.045)', height: 58 }

  function press(fn: () => void) {
    haptic('tick')
    fn()
  }

  return (
    <div dir="ltr" className="flex flex-col gap-2.5">
      <div className="grid grid-cols-3 gap-2.5">
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

        <button
          type="button"
          onClick={() => press(backspace)}
          onContextMenu={(e) => {
            e.preventDefault()
            press(clearAll)
          }}
          className="flex items-center justify-center rounded-[22px] transition-transform active:scale-90"
          style={{ height: 58, color, background: `color-mix(in srgb, ${color} 12%, transparent)` }}
          aria-label="حذف آخر رقم (اضغط مطولًا لمسح الكل)"
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 6 L3 12 L9 18 H20 A2 2 0 0 0 22 16 V8 A2 2 0 0 0 20 6 Z" />
            <line x1="12" y1="9.5" x2="17" y2="14.5" />
            <line x1="17" y1="9.5" x2="12" y2="14.5" />
          </svg>
        </button>
      </div>
      {value && (
        <button type="button" onClick={() => press(clearAll)} className="self-center px-3 py-1 text-[12px] font-medium text-[var(--color-text-3)]" aria-label="مسح الكل">
          مسح الكل
        </button>
      )}
    </div>
  )
}
